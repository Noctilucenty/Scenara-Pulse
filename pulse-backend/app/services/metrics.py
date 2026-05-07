from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, date
from typing import Optional


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

def get_overview_metrics(db: Session, days: int = 30) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    today = datetime.utcnow().date()
    week_ago = datetime.utcnow() - timedelta(days=7)
    month_ago = datetime.utcnow() - timedelta(days=30)

    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    new_today = db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at::date = :d"), {"d": today}
    ).scalar() or 0
    new_week = db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at >= :s"), {"s": week_ago}
    ).scalar() or 0
    new_month = db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at >= :s"), {"s": month_ago}
    ).scalar() or 0

    dau = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM predictions WHERE created_at::date = :d"), {"d": today}
    ).scalar() or 0
    wau = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM predictions WHERE created_at >= :s"), {"s": week_ago}
    ).scalar() or 0
    mau = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM predictions WHERE created_at >= :s"), {"s": month_ago}
    ).scalar() or 0

    total_predictions = db.execute(text("SELECT COUNT(*) FROM predictions")).scalar() or 0
    total_volume = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM predictions")).scalar() or 0
    total_markets = db.execute(text("SELECT COUNT(*) FROM events")).scalar() or 0
    open_markets = db.execute(text("SELECT COUNT(*) FROM events WHERE status = 'open'")).scalar() or 0

    users_with_predictions = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM predictions")
    ).scalar() or 0
    conversion_rate = round((users_with_predictions / total_users * 100) if total_users > 0 else 0, 1)

    # Average session duration from pulse sessions
    avg_session = db.execute(
        text("SELECT COALESCE(AVG(duration_seconds), 0) FROM pulse_user_sessions WHERE duration_seconds IS NOT NULL")
    ).scalar() or 0

    # Returning users (made predictions on 2+ distinct days)
    returning = db.execute(text("""
        SELECT COUNT(*) FROM (
            SELECT user_id FROM predictions
            GROUP BY user_id HAVING COUNT(DISTINCT created_at::date) >= 2
        ) sub
    """)).scalar() or 0
    returning_rate = round((returning / total_users * 100) if total_users > 0 else 0, 1)

    # Real-time: sessions active in last 10 minutes
    realtime_active = db.execute(text("""
        SELECT COUNT(DISTINCT session_id)
        FROM pulse_analytics_events
        WHERE created_at >= NOW() - INTERVAL '10 minutes'
    """)).scalar() or 0

    # Category breakdown
    categories = db.execute(text("""
        SELECT category, COUNT(*) as count FROM events
        WHERE status != 'void'
        GROUP BY category ORDER BY count DESC
    """)).fetchall()

    # Growth chart — signups per day
    growth = db.execute(text("""
        SELECT created_at::date as d, COUNT(*) as signups
        FROM users WHERE created_at >= :s
        GROUP BY created_at::date ORDER BY d
    """), {"s": since}).fetchall()

    # Prediction volume per day
    pred_chart = db.execute(text("""
        SELECT created_at::date as d,
               COUNT(*) as predictions,
               COALESCE(SUM(amount), 0) as volume
        FROM predictions WHERE created_at >= :s
        GROUP BY created_at::date ORDER BY d
    """), {"s": since}).fetchall()

    return {
        "total_users": total_users,
        "new_users_today": new_today,
        "new_users_week": new_week,
        "new_users_month": new_month,
        "dau": dau,
        "wau": wau,
        "mau": mau,
        "total_predictions": total_predictions,
        "total_volume": float(total_volume),
        "total_markets": total_markets,
        "open_markets": open_markets,
        "conversion_rate": conversion_rate,
        "users_with_predictions": users_with_predictions,
        "avg_session_seconds": round(float(avg_session)),
        "returning_rate": returning_rate,
        "realtime_active": realtime_active,
        "categories": [{"category": r.category, "count": r.count} for r in categories],
        "growth_chart": [{"date": str(r.d), "signups": r.signups} for r in growth],
        "prediction_chart": [
            {"date": str(r.d), "predictions": r.predictions, "volume": float(r.volume)}
            for r in pred_chart
        ],
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_users_list(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    filter: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    where_clauses = ["1=1"]
    params: dict = {}

    if search:
        where_clauses.append("(u.email ILIKE :q OR u.display_name ILIKE :q)")
        params["q"] = f"%{search}%"

    if filter == "new":
        where_clauses.append("u.created_at >= NOW() - INTERVAL '7 days'")
    elif filter == "active":
        where_clauses.append("""
            u.id IN (
                SELECT DISTINCT user_id FROM predictions
                WHERE created_at >= NOW() - INTERVAL '7 days'
            )
        """)
    elif filter == "dormant":
        where_clauses.append("""
            u.id NOT IN (
                SELECT DISTINCT user_id FROM predictions
                WHERE created_at >= NOW() - INTERVAL '30 days'
            )
            AND u.created_at < NOW() - INTERVAL '7 days'
        """)
    elif filter == "no_predictions":
        where_clauses.append("u.id NOT IN (SELECT DISTINCT user_id FROM predictions)")
    elif filter == "one_prediction":
        where_clauses.append("""
            u.id IN (
                SELECT user_id FROM predictions
                GROUP BY user_id HAVING COUNT(*) = 1
            )
        """)
    elif filter == "active_today":
        where_clauses.append("""
            u.id IN (
                SELECT DISTINCT user_id FROM predictions
                WHERE created_at::date = CURRENT_DATE
            )
        """)
    elif filter == "high_value":
        where_clauses.append("""
            u.id IN (
                SELECT user_id FROM predictions
                GROUP BY user_id HAVING COUNT(*) >= 10
            )
        """)

    where = " AND ".join(where_clauses)
    offset = (page - 1) * page_size

    total = db.execute(text(f"""
        SELECT COUNT(DISTINCT u.id) FROM users u WHERE {where}
    """), params).scalar() or 0

    rows = db.execute(text(f"""
        SELECT
            u.id, u.email, u.display_name, u.created_at,
            u.xp, u.level, u.current_streak, u.best_streak,
            COALESCE(a.balance, 0) as balance,
            COUNT(p.id) as total_predictions,
            COALESCE(SUM(p.pnl), 0) as total_pnl,
            COUNT(CASE WHEN p.pnl > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN p.pnl IS NOT NULL AND p.pnl <= 0 THEN 1 END) as losses,
            MAX(p.created_at) as last_prediction
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN predictions p ON p.user_id = u.id
        WHERE {where}
        GROUP BY u.id, a.balance
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {**params, "limit": page_size, "offset": offset}).fetchall()

    users = []
    for r in rows:
        total_preds = r.total_predictions or 0
        wins = r.wins or 0
        win_rate = round((wins / total_preds * 100) if total_preds > 0 else 0, 1)

        # Retention status
        last_pred = r.last_prediction
        if last_pred is None:
            retention = "never_predicted"
        elif (datetime.utcnow() - last_pred).days <= 7:
            retention = "active"
        elif (datetime.utcnow() - last_pred).days <= 30:
            retention = "at_risk"
        else:
            retention = "churned"

        users.append({
            "id": r.id,
            "email": r.email,
            "display_name": r.display_name,
            "signup_date": r.created_at.isoformat() if r.created_at else None,
            "xp": r.xp,
            "level": r.level,
            "current_streak": r.current_streak,
            "best_streak": r.best_streak,
            "balance": float(r.balance),
            "total_predictions": total_preds,
            "total_pnl": round(float(r.total_pnl or 0), 2),
            "wins": wins,
            "losses": r.losses or 0,
            "win_rate": win_rate,
            "retention_status": retention,
            "last_prediction": last_pred.isoformat() if last_pred else None,
        })

    return {"total": total, "page": page, "page_size": page_size, "users": users}


def get_user_detail(db: Session, user_id: int) -> dict:
    row = db.execute(text("""
        SELECT
            u.id, u.email, u.display_name, u.created_at,
            u.xp, u.level, u.current_streak, u.best_streak,
            COALESCE(a.balance, 0) as balance,
            COUNT(p.id) as total_predictions,
            COALESCE(SUM(p.pnl), 0) as total_pnl,
            COALESCE(AVG(p.entry_probability), 0) as avg_confidence,
            COUNT(CASE WHEN p.pnl > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN p.pnl IS NOT NULL AND p.pnl <= 0 THEN 1 END) as losses,
            COALESCE(SUM(p.amount), 0) as tokens_spent,
            COALESCE(SUM(CASE WHEN p.pnl > 0 THEN p.pnl ELSE 0 END), 0) as tokens_earned
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN predictions p ON p.user_id = u.id
        WHERE u.id = :uid
        GROUP BY u.id, a.balance
    """), {"uid": user_id}).fetchone()

    if not row:
        return {}

    # Category breakdown for this user
    cats = db.execute(text("""
        SELECT e.category, COUNT(*) as count
        FROM predictions p
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN events e ON e.id = s.event_id
        WHERE p.user_id = :uid
        GROUP BY e.category ORDER BY count DESC
    """), {"uid": user_id}).fetchall()

    # Recent predictions
    recent_preds = db.execute(text("""
        SELECT p.id, p.amount, p.entry_probability, p.pnl, p.created_at,
               e.title as event_title, e.category, s.title as scenario_title
        FROM predictions p
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN events e ON e.id = s.event_id
        WHERE p.user_id = :uid
        ORDER BY p.created_at DESC LIMIT 20
    """), {"uid": user_id}).fetchall()

    # Sessions for this user
    sessions = db.execute(text("""
        SELECT id, started_at, ended_at, duration_seconds, device, browser, landing_page, exit_page, made_prediction
        FROM pulse_user_sessions
        WHERE user_id = :uid ORDER BY started_at DESC LIMIT 10
    """), {"uid": user_id}).fetchall()

    # Admin notes
    notes = db.execute(text("""
        SELECT n.id, n.note, n.created_at, a.email as admin_email
        FROM pulse_admin_user_notes n
        JOIN pulse_admins a ON a.id = n.admin_id
        WHERE n.user_id = :uid ORDER BY n.created_at DESC
    """), {"uid": user_id}).fetchall()

    total_preds = row.total_predictions or 0
    wins = row.wins or 0
    win_rate = round((wins / total_preds * 100) if total_preds > 0 else 0, 1)

    # Brier score approximation using entry probabilities and outcomes
    brier = db.execute(text("""
        SELECT COALESCE(
            1 - AVG(POWER(
                CASE WHEN p.pnl > 0 THEN 1 ELSE 0 END - p.entry_probability / 100.0, 2
            )), 0
        ) * 100 as score
        FROM predictions p
        WHERE p.user_id = :uid AND p.pnl IS NOT NULL
    """), {"uid": user_id}).scalar() or 0

    return {
        "id": row.id,
        "email": row.email,
        "display_name": row.display_name,
        "signup_date": row.created_at.isoformat() if row.created_at else None,
        "xp": row.xp,
        "level": row.level,
        "current_streak": row.current_streak,
        "best_streak": row.best_streak,
        "balance": float(row.balance),
        "total_predictions": total_preds,
        "total_pnl": round(float(row.total_pnl or 0), 2),
        "wins": wins,
        "losses": row.losses or 0,
        "win_rate": win_rate,
        "avg_confidence": round(float(row.avg_confidence or 0), 1),
        "tokens_spent": float(row.tokens_spent or 0),
        "tokens_earned": float(row.tokens_earned or 0),
        "brier_score": round(float(brier), 1),
        "favorite_categories": [{"category": c.category, "count": c.count} for c in cats],
        "recent_predictions": [
            {
                "id": p.id, "amount": float(p.amount), "entry_probability": float(p.entry_probability),
                "pnl": float(p.pnl) if p.pnl is not None else None,
                "created_at": p.created_at.isoformat(), "event_title": p.event_title,
                "category": p.category, "scenario_title": p.scenario_title,
            }
            for p in recent_preds
        ],
        "sessions": [
            {
                "id": s.id, "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "duration_seconds": s.duration_seconds, "device": s.device,
                "browser": s.browser, "landing_page": s.landing_page,
                "exit_page": s.exit_page, "made_prediction": s.made_prediction,
            }
            for s in sessions
        ],
        "notes": [
            {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat(), "admin": n.admin_email}
            for n in notes
        ],
    }


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def get_sessions_list(db: Session, page: int = 1, page_size: int = 50) -> dict:
    offset = (page - 1) * page_size
    total = db.execute(text("SELECT COUNT(*) FROM pulse_user_sessions")).scalar() or 0
    rows = db.execute(text("""
        SELECT s.id, s.user_id, u.email, s.started_at, s.ended_at, s.duration_seconds,
               s.device, s.browser, s.referrer, s.landing_page, s.exit_page,
               s.made_prediction, s.country, s.utm_source, s.utm_campaign
        FROM pulse_user_sessions s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.started_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": page_size, "offset": offset}).fetchall()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "sessions": [
            {
                "id": r.id, "user_id": r.user_id, "user_email": r.email,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "ended_at": r.ended_at.isoformat() if r.ended_at else None,
                "duration_seconds": r.duration_seconds, "device": r.device,
                "browser": r.browser, "referrer": r.referrer,
                "landing_page": r.landing_page, "exit_page": r.exit_page,
                "made_prediction": r.made_prediction, "country": r.country,
                "utm_source": r.utm_source, "utm_campaign": r.utm_campaign,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Markets
# ---------------------------------------------------------------------------

def get_markets_list(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> dict:
    where_clauses = ["1=1"]
    params: dict = {}
    if category:
        where_clauses.append("e.category = :cat")
        params["cat"] = category
    if status:
        where_clauses.append("e.status = :status")
        params["status"] = status

    where = " AND ".join(where_clauses)
    offset = (page - 1) * page_size

    total = db.execute(text(f"SELECT COUNT(*) FROM events e WHERE {where}"), params).scalar() or 0
    rows = db.execute(text(f"""
        SELECT
            e.id, e.title, e.category, e.status, e.created_at, e.closes_at,
            COUNT(DISTINCT p.user_id) as unique_bettors,
            COUNT(p.id) as total_predictions,
            COALESCE(SUM(p.amount), 0) as total_volume,
            COALESCE(SUM(CASE WHEN s.is_winner = true THEN p.amount END), 0) as yes_volume,
            COALESCE(SUM(CASE WHEN s.is_winner = false THEN p.amount END), 0) as no_volume,
            COALESCE(AVG(p.entry_probability), 0) as avg_confidence
        FROM events e
        LEFT JOIN scenarios s ON s.event_id = e.id
        LEFT JOIN predictions p ON p.scenario_id = s.id
        WHERE {where}
        GROUP BY e.id
        ORDER BY e.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {**params, "limit": page_size, "offset": offset}).fetchall()

    return {
        "total": total, "page": page, "page_size": page_size,
        "markets": [
            {
                "id": r.id, "title": r.title, "category": r.category, "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "closes_at": r.closes_at.isoformat() if r.closes_at else None,
                "unique_bettors": r.unique_bettors, "total_predictions": r.total_predictions,
                "total_volume": float(r.total_volume), "yes_volume": float(r.yes_volume),
                "no_volume": float(r.no_volume),
                "avg_confidence": round(float(r.avg_confidence), 1),
            }
            for r in rows
        ],
    }


def get_market_detail(db: Session, market_id: int) -> dict:
    event = db.execute(text("""
        SELECT e.id, e.title, e.category, e.status, e.created_at, e.closes_at
        FROM events e WHERE e.id = :mid
    """), {"mid": market_id}).fetchone()

    if not event:
        return {}

    # Scenarios with bet volume
    scenarios = db.execute(text("""
        SELECT s.id, s.title, s.probability, s.is_winner,
               COUNT(p.id) as bet_count,
               COALESCE(SUM(p.amount), 0) as volume
        FROM scenarios s
        LEFT JOIN predictions p ON p.scenario_id = s.id
        WHERE s.event_id = :mid
        GROUP BY s.id
    """), {"mid": market_id}).fetchall()

    # Probability history
    history = db.execute(text("""
        SELECT h.probability, h.recorded_at, s.title as scenario_title
        FROM scenario_probability_history h
        JOIN scenarios s ON s.id = h.scenario_id
        WHERE s.event_id = :mid
        ORDER BY h.recorded_at ASC LIMIT 500
    """), {"mid": market_id}).fetchall()

    # Top predictors
    top_predictors = db.execute(text("""
        SELECT u.id, u.display_name, u.email,
               COUNT(p.id) as pred_count,
               SUM(p.amount) as total_staked,
               COALESCE(SUM(p.pnl), 0) as total_pnl
        FROM predictions p
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN users u ON u.id = p.user_id
        WHERE s.event_id = :mid
        GROUP BY u.id
        ORDER BY total_staked DESC LIMIT 10
    """), {"mid": market_id}).fetchall()

    total_volume = sum(float(s.volume) for s in scenarios)
    total_bets = sum(s.bet_count for s in scenarios)

    return {
        "id": event.id,
        "title": event.title,
        "category": event.category,
        "status": event.status,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "closes_at": event.closes_at.isoformat() if event.closes_at else None,
        "total_volume": total_volume,
        "total_predictions": total_bets,
        "scenarios": [
            {
                "id": s.id, "title": s.title, "probability": float(s.probability),
                "is_winner": s.is_winner, "bet_count": s.bet_count, "volume": float(s.volume),
                "volume_pct": round(float(s.volume) / total_volume * 100 if total_volume > 0 else 0, 1),
            }
            for s in scenarios
        ],
        "probability_history": [
            {"probability": float(h.probability), "recorded_at": h.recorded_at.isoformat(), "scenario": h.scenario_title}
            for h in history
        ],
        "top_predictors": [
            {
                "user_id": t.id, "display_name": t.display_name or t.email,
                "pred_count": t.pred_count, "total_staked": float(t.total_staked),
                "total_pnl": float(t.total_pnl),
            }
            for t in top_predictors
        ],
    }


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------

def get_predictions_list(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[int] = None,
    event_id: Optional[int] = None,
    category: Optional[str] = None,
    outcome: Optional[str] = None,
    days: Optional[int] = None,
) -> dict:
    where_clauses = ["1=1"]
    params: dict = {}

    if user_id:
        where_clauses.append("p.user_id = :uid")
        params["uid"] = user_id
    if event_id:
        where_clauses.append("e.id = :eid")
        params["eid"] = event_id
    if category:
        where_clauses.append("e.category = :cat")
        params["cat"] = category
    if outcome == "win":
        where_clauses.append("p.pnl > 0")
    elif outcome == "loss":
        where_clauses.append("p.pnl <= 0")
    elif outcome == "pending":
        where_clauses.append("p.pnl IS NULL")
    if days:
        where_clauses.append("p.created_at >= NOW() - (:days_val * INTERVAL '1 day')")
        params["days_val"] = days

    where = " AND ".join(where_clauses)
    offset = (page - 1) * page_size

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM predictions p
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN events e ON e.id = s.event_id
        WHERE {where}
    """), params).scalar() or 0

    rows = db.execute(text(f"""
        SELECT p.id, p.user_id, p.amount, p.entry_probability, p.payout_multiplier,
               p.pnl, p.created_at,
               u.display_name, u.email,
               e.id as event_id, e.title as event_title, e.category,
               s.title as scenario_title, s.is_winner
        FROM predictions p
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN events e ON e.id = s.event_id
        JOIN users u ON u.id = p.user_id
        WHERE {where}
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {**params, "limit": page_size, "offset": offset}).fetchall()

    return {
        "total": total, "page": page, "page_size": page_size,
        "predictions": [
            {
                "id": r.id, "user_id": r.user_id,
                "user_name": r.display_name or r.email,
                "event_id": r.event_id, "event_title": r.event_title,
                "category": r.category, "scenario_title": r.scenario_title,
                "amount": float(r.amount), "entry_probability": float(r.entry_probability),
                "payout_multiplier": float(r.payout_multiplier),
                "pnl": float(r.pnl) if r.pnl is not None else None,
                "outcome": "win" if (r.pnl is not None and r.pnl > 0) else ("loss" if r.pnl is not None else "pending"),
                "created_at": r.created_at.isoformat(),
                "beat_crowd": float(r.entry_probability) > 50 and r.is_winner,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Retention cohort
# ---------------------------------------------------------------------------

def get_retention_data(db: Session) -> dict:
    # Signup cohort + activity by week
    cohort_rows = db.execute(text("""
        WITH cohorts AS (
            SELECT id as user_id,
                   DATE_TRUNC('week', created_at) as signup_week
            FROM users
            WHERE created_at >= NOW() - INTERVAL '12 weeks'
        ),
        activity AS (
            SELECT user_id,
                   DATE_TRUNC('week', created_at) as activity_week
            FROM predictions
            GROUP BY user_id, DATE_TRUNC('week', created_at)
        ),
        cohort_sizes AS (
            SELECT signup_week, COUNT(*) as cohort_size
            FROM cohorts GROUP BY signup_week
        )
        SELECT
            c.signup_week,
            cs.cohort_size,
            EXTRACT(EPOCH FROM (a.activity_week - c.signup_week)) / 604800 as weeks_after,
            COUNT(DISTINCT c.user_id) as retained
        FROM cohorts c
        JOIN cohort_sizes cs ON cs.signup_week = c.signup_week
        LEFT JOIN activity a ON a.user_id = c.user_id
            AND a.activity_week >= c.signup_week
        WHERE EXTRACT(EPOCH FROM (a.activity_week - c.signup_week)) / 604800 BETWEEN 0 AND 8
        GROUP BY c.signup_week, cs.cohort_size, weeks_after
        ORDER BY c.signup_week, weeks_after
    """)).fetchall()

    # Build cohort grid
    cohorts: dict = {}
    for r in cohort_rows:
        week_key = str(r.signup_week.date()) if r.signup_week else "unknown"
        week_n = int(r.weeks_after) if r.weeks_after is not None else 0
        if week_key not in cohorts:
            cohorts[week_key] = {"cohort_size": r.cohort_size, "weeks": {}}
        rate = round((r.retained / r.cohort_size * 100) if r.cohort_size > 0 else 0, 1)
        cohorts[week_key]["weeks"][week_n] = rate

    # Day 1 / 7 / 30 retention
    d1 = db.execute(text("""
        SELECT COUNT(DISTINCT p.user_id) as retained
        FROM users u
        JOIN predictions p ON p.user_id = u.id
            AND p.created_at::date = (u.created_at + INTERVAL '1 day')::date
        WHERE u.created_at >= NOW() - INTERVAL '60 days'
    """)).scalar() or 0
    d1_total = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '60 days'"
    )).scalar() or 1

    d7 = db.execute(text("""
        SELECT COUNT(DISTINCT p.user_id) as retained
        FROM users u
        JOIN predictions p ON p.user_id = u.id
            AND p.created_at BETWEEN u.created_at AND u.created_at + INTERVAL '7 days'
        WHERE u.created_at >= NOW() - INTERVAL '60 days'
    """)).scalar() or 0

    d30 = db.execute(text("""
        SELECT COUNT(DISTINCT p.user_id) as retained
        FROM users u
        JOIN predictions p ON p.user_id = u.id
            AND p.created_at BETWEEN u.created_at AND u.created_at + INTERVAL '30 days'
        WHERE u.created_at >= NOW() - INTERVAL '90 days'
    """)).scalar() or 0
    d30_total = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '90 days'"
    )).scalar() or 1

    # Churned users (no predictions in 30+ days, but were active)
    churned = db.execute(text("""
        SELECT COUNT(DISTINCT user_id) FROM (
            SELECT user_id, MAX(created_at) as last_pred
            FROM predictions GROUP BY user_id
        ) sub WHERE last_pred < NOW() - INTERVAL '30 days'
    """)).scalar() or 0

    return {
        "day1_retention": round(d1 / d1_total * 100, 1),
        "day7_retention": round(d7 / d1_total * 100, 1),
        "day30_retention": round(d30 / d30_total * 100, 1),
        "churned_users": churned,
        "cohort_table": [
            {"signup_week": k, "cohort_size": v["cohort_size"], "weeks": v["weeks"]}
            for k, v in sorted(cohorts.items())
        ],
    }


# ---------------------------------------------------------------------------
# Funnel
# ---------------------------------------------------------------------------

def get_funnel_data(db: Session) -> dict:
    total_sessions = db.execute(
        text("SELECT COUNT(DISTINCT session_id) FROM pulse_analytics_events WHERE event_type = 'page_view'")
    ).scalar() or 0
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    viewed_market = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM pulse_analytics_events WHERE event_type = 'market_viewed' AND user_id IS NOT NULL")
    ).scalar() or 0
    made_prediction = db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM predictions")
    ).scalar() or 0
    made_two = db.execute(text(
        "SELECT COUNT(*) FROM (SELECT user_id FROM predictions GROUP BY user_id HAVING COUNT(*) >= 2) s"
    )).scalar() or 0
    returned_next_day = db.execute(text("""
        SELECT COUNT(DISTINCT p2.user_id)
        FROM predictions p1
        JOIN predictions p2 ON p2.user_id = p1.user_id
            AND p2.created_at::date = (p1.created_at + INTERVAL '1 day')::date
    """)).scalar() or 0

    steps = [
        {"step": "Landing Page Visit", "count": total_sessions or total_users, "icon": "globe"},
        {"step": "Signup Completed", "count": total_users, "icon": "user-plus"},
        {"step": "First Market Viewed", "count": viewed_market or int(total_users * 0.7), "icon": "eye"},
        {"step": "First Prediction Made", "count": made_prediction, "icon": "zap"},
        {"step": "Second Prediction Made", "count": made_two, "icon": "trending-up"},
        {"step": "Returned Next Day", "count": returned_next_day, "icon": "repeat"},
    ]

    # Add drop-off percentages
    for i, step in enumerate(steps):
        if i == 0:
            step["conversion_from_prev"] = 100.0
            step["drop_off"] = 0.0
        else:
            prev = steps[i - 1]["count"]
            curr = step["count"]
            step["conversion_from_prev"] = round((curr / prev * 100) if prev > 0 else 0, 1)
            step["drop_off"] = round(100 - step["conversion_from_prev"], 1)

    return {"steps": steps, "total_top": steps[0]["count"]}


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def get_leaderboard(db: Session, limit: int = 50, sort_by: str = "pnl") -> dict:
    order_map = {
        "pnl": "total_pnl DESC",
        "accuracy": "win_rate DESC",
        "predictions": "total_predictions DESC",
        "streak": "u.best_streak DESC",
    }
    order = order_map.get(sort_by, "total_pnl DESC")

    rows = db.execute(text(f"""
        SELECT
            u.id, u.display_name, u.email, u.xp, u.level,
            u.current_streak, u.best_streak,
            COALESCE(a.balance, 0) as balance,
            COUNT(p.id) as total_predictions,
            COALESCE(SUM(p.pnl), 0) as total_pnl,
            COUNT(CASE WHEN p.pnl > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN p.pnl IS NOT NULL AND p.pnl <= 0 THEN 1 END) as losses,
            COALESCE(
                1 - AVG(POWER(
                    CASE WHEN p.pnl > 0 THEN 1 ELSE 0 END - p.entry_probability / 100.0, 2
                )), 0
            ) * 100 as brier_score
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN predictions p ON p.user_id = u.id
        GROUP BY u.id, a.balance
        ORDER BY {order}
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    result = []
    for i, r in enumerate(rows):
        total = r.total_predictions or 0
        wins = r.wins or 0
        result.append({
            "rank": i + 1,
            "user_id": r.id,
            "display_name": r.display_name or r.email,
            "email": r.email,
            "xp": r.xp,
            "level": r.level,
            "current_streak": r.current_streak,
            "best_streak": r.best_streak,
            "balance": float(r.balance),
            "total_predictions": total,
            "total_pnl": round(float(r.total_pnl or 0), 2),
            "wins": wins,
            "losses": r.losses or 0,
            "win_rate": round((wins / total * 100) if total > 0 else 0, 1),
            "brier_score": round(float(r.brier_score or 0), 1),
        })

    return {"leaderboard": result, "sort_by": sort_by}


# ---------------------------------------------------------------------------
# Real-time
# ---------------------------------------------------------------------------

def get_realtime_data(db: Session) -> dict:
    # Recent predictions (last hour)
    recent_preds = db.execute(text("""
        SELECT p.id, u.display_name, u.email, p.amount, p.entry_probability,
               p.created_at, e.title as event_title, e.category, s.title as scenario_title
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        JOIN scenarios s ON s.id = p.scenario_id
        JOIN events e ON e.id = s.event_id
        WHERE p.created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY p.created_at DESC LIMIT 20
    """)).fetchall()

    # Recent signups (last 24h)
    recent_signups = db.execute(text("""
        SELECT id, display_name, email, created_at
        FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC LIMIT 10
    """)).fetchall()

    # Recently resolved markets
    recent_resolved = db.execute(text("""
        SELECT id, title, category, closes_at
        FROM events WHERE status = 'resolved'
        ORDER BY closes_at DESC LIMIT 5
    """)).fetchall()

    # Active users now (last 10 min via analytics events)
    active_now = db.execute(text("""
        SELECT COUNT(DISTINCT session_id) FROM pulse_analytics_events
        WHERE created_at >= NOW() - INTERVAL '10 minutes'
    """)).scalar() or 0

    feed = []
    for p in recent_preds:
        feed.append({
            "type": "prediction",
            "icon": "zap",
            "text": f"{p.display_name or p.email} predicted {p.scenario_title} on {p.event_title}",
            "subtext": f"${p.amount:.0f} at {p.entry_probability:.0f}% · {p.category}",
            "timestamp": p.created_at.isoformat(),
            "color": "violet",
        })
    for s in recent_signups:
        feed.append({
            "type": "signup",
            "icon": "user-plus",
            "text": f"New user joined: {s.display_name or s.email}",
            "subtext": "Welcome to Scenara",
            "timestamp": s.created_at.isoformat(),
            "color": "blue",
        })
    for r in recent_resolved:
        feed.append({
            "type": "resolved",
            "icon": "check-circle",
            "text": f"Market resolved: {r.title}",
            "subtext": r.category,
            "timestamp": r.closes_at.isoformat() if r.closes_at else "",
            "color": "green",
        })

    feed.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "active_now": active_now,
        "feed": feed[:30],
        "recent_predictions_count": len(recent_preds),
        "recent_signups_count": len(recent_signups),
    }


# ---------------------------------------------------------------------------
# Daily metrics series
# ---------------------------------------------------------------------------

def get_daily_metrics_series(db: Session, days: int = 90) -> dict:
    rows = db.execute(text("""
        SELECT date, total_users, new_users, active_users,
               predictions_count, simulated_volume,
               avg_session_duration, retention_rate, signup_to_prediction_rate
        FROM pulse_daily_metrics
        WHERE date >= CURRENT_DATE - (:days_val * INTERVAL '1 day')
        ORDER BY date ASC
    """), {"days_val": days}).fetchall()

    return {
        "series": [
            {
                "date": str(r.date),
                "total_users": r.total_users,
                "new_users": r.new_users,
                "active_users": r.active_users,
                "predictions_count": r.predictions_count,
                "simulated_volume": float(r.simulated_volume or 0),
                "avg_session_duration": float(r.avg_session_duration or 0),
                "retention_rate": float(r.retention_rate or 0),
                "signup_to_prediction_rate": float(r.signup_to_prediction_rate or 0),
            }
            for r in rows
        ]
    }
