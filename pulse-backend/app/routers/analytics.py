import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.routers.auth import get_current_admin
from app.models.admin import PulseAdmin
from app.models.analytics import AdminAuditLog, AdminUserNote
from app.services.metrics import (
    get_overview_metrics,
    get_users_list,
    get_user_detail,
    get_sessions_list,
    get_markets_list,
    get_market_detail,
    get_predictions_list,
    get_retention_data,
    get_funnel_data,
    get_leaderboard,
    get_realtime_data,
    get_daily_metrics_series,
)

router = APIRouter()


def _audit(db: Session, admin_id: int, action: str, target_type: str = None, target_id=None, details: dict = None):
    db.add(AdminAuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        details=details or {},
    ))
    db.commit()


# --- Overview ---

@router.get("/overview")
def overview(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_overview_metrics(db, days)


# --- Users ---

@router.get("/users")
def users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_users_list(db, page, page_size, filter, search)


@router.get("/users/{user_id}")
def user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    _audit(db, admin.id, "view_user", "user", user_id)
    result = get_user_detail(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    result = db.execute(
        text("UPDATE users SET is_active = NOT is_active WHERE id = :uid RETURNING is_active"),
        {"uid": user_id},
    ).fetchone()
    db.commit()
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    _audit(db, admin.id, "toggle_user_active", "user", user_id, {"new_state": result.is_active})
    return {"ok": True, "is_active": result.is_active}


@router.post("/users/{user_id}/notes")
def add_user_note(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    note_text = body.get("note", "").strip()
    if not note_text:
        raise HTTPException(status_code=400, detail="Note cannot be empty")
    db.add(AdminUserNote(user_id=user_id, admin_id=admin.id, note=note_text))
    db.commit()
    _audit(db, admin.id, "add_note", "user", user_id)
    return {"ok": True}


# --- Sessions ---

@router.get("/sessions")
def sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_sessions_list(db, page, page_size)


# --- Markets ---

@router.get("/markets")
def markets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_markets_list(db, page, page_size, category, status)


@router.get("/markets/{market_id}")
def market_detail(
    market_id: int,
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    result = get_market_detail(db, market_id)
    if not result:
        raise HTTPException(status_code=404, detail="Market not found")
    return result


# --- Predictions ---

@router.get("/predictions")
def predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = Query(None),
    event_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    days: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_predictions_list(db, page, page_size, user_id, event_id, category, outcome, days)


# --- Retention ---

@router.get("/retention")
def retention(
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_retention_data(db)


# --- Funnel ---

@router.get("/funnel")
def funnel(
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_funnel_data(db)


# --- Leaderboard ---

@router.get("/leaderboard")
def leaderboard(
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("pnl"),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_leaderboard(db, limit, sort_by)


# --- Real-time ---

@router.get("/realtime")
def realtime(
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_realtime_data(db)


# --- Daily series ---

@router.get("/daily")
def daily(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    return get_daily_metrics_series(db, days)


# --- Audit log ---

@router.get("/audit-log")
def audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    if admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin only")
    offset = (page - 1) * page_size
    total = db.execute(text("SELECT COUNT(*) FROM pulse_audit_logs")).scalar() or 0
    rows = db.execute(text("""
        SELECT l.*, a.email as admin_email FROM pulse_audit_logs l
        JOIN pulse_admins a ON a.id = l.admin_id
        ORDER BY l.created_at DESC LIMIT :limit OFFSET :offset
    """), {"limit": page_size, "offset": offset}).fetchall()
    return {
        "total": total,
        "logs": [
            {"id": r.id, "admin": r.admin_email, "action": r.action,
             "target_type": r.target_type, "target_id": r.target_id,
             "created_at": r.created_at.isoformat()}
            for r in rows
        ],
    }


# --- Export ---

@router.get("/export")
def export(
    type: str = Query("users"),
    db: Session = Depends(get_db),
    admin: PulseAdmin = Depends(get_current_admin),
):
    _audit(db, admin.id, f"export_{type}")
    output = io.StringIO()
    writer = csv.writer(output)

    if type == "users":
        rows = db.execute(text("""
            SELECT u.id, u.email, u.display_name, u.created_at, u.xp, u.level,
                   u.current_streak, u.best_streak, COALESCE(a.balance, 0) as balance,
                   COUNT(p.id) as total_predictions, COALESCE(SUM(p.pnl), 0) as total_pnl
            FROM users u
            LEFT JOIN accounts a ON a.user_id = u.id
            LEFT JOIN predictions p ON p.user_id = u.id
            GROUP BY u.id, a.balance ORDER BY u.created_at DESC
        """)).fetchall()
        writer.writerow(["id", "email", "display_name", "signup_date", "xp", "level",
                         "streak", "best_streak", "balance", "total_predictions", "total_pnl"])
        for r in rows:
            writer.writerow([r.id, r.email, r.display_name, r.created_at, r.xp, r.level,
                             r.current_streak, r.best_streak, r.balance, r.total_predictions, r.total_pnl])

    elif type == "predictions":
        rows = db.execute(text("""
            SELECT p.id, p.user_id, u.email, p.amount, p.entry_probability,
                   p.payout_multiplier, p.pnl, p.created_at,
                   e.title as event_title, e.category, s.title as scenario_title
            FROM predictions p
            JOIN scenarios s ON s.id = p.scenario_id
            JOIN events e ON e.id = s.event_id
            JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC LIMIT 50000
        """)).fetchall()
        writer.writerow(["id", "user_id", "user_email", "amount", "entry_probability",
                         "multiplier", "pnl", "created_at", "event_title", "category", "scenario"])
        for r in rows:
            writer.writerow([r.id, r.user_id, r.email, r.amount, r.entry_probability,
                             r.payout_multiplier, r.pnl, r.created_at, r.event_title, r.category, r.scenario_title])

    elif type == "markets":
        rows = db.execute(text("""
            SELECT e.id, e.title, e.category, e.status, e.created_at, e.closes_at,
                   COUNT(p.id) as total_predictions,
                   COALESCE(SUM(p.amount), 0) as total_volume
            FROM events e
            LEFT JOIN scenarios s ON s.event_id = e.id
            LEFT JOIN predictions p ON p.scenario_id = s.id
            GROUP BY e.id ORDER BY e.created_at DESC
        """)).fetchall()
        writer.writerow(["id", "title", "category", "status", "created_at", "closes_at",
                         "total_predictions", "total_volume"])
        for r in rows:
            writer.writerow([r.id, r.title, r.category, r.status, r.created_at,
                             r.closes_at, r.total_predictions, r.total_volume])
    else:
        raise HTTPException(status_code=400, detail="Invalid export type. Use: users | predictions | markets")

    output.seek(0)
    filename = f"scenara_{type}_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
