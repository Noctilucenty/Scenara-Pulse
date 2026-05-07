from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.db import get_db
from app.models.analytics import AnalyticsEvent, UserSession

router = APIRouter()


class TrackPayload(BaseModel):
    event_type: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    page_url: Optional[str] = None
    metadata: Optional[dict] = {}
    device: Optional[str] = None
    browser: Optional[str] = None
    referrer: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None


class SessionStartPayload(BaseModel):
    session_id: str
    user_id: Optional[int] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_medium: Optional[str] = None


class SessionEndPayload(BaseModel):
    session_id: str
    exit_page: Optional[str] = None
    duration_seconds: Optional[int] = None
    made_prediction: Optional[bool] = False


@router.post("/track")
async def track_event(payload: TrackPayload, db: Session = Depends(get_db)):
    event = AnalyticsEvent(
        user_id=payload.user_id,
        session_id=payload.session_id,
        event_type=payload.event_type,
        page_url=payload.page_url,
        metadata=payload.metadata or {},
        device=payload.device,
        browser=payload.browser,
        referrer=payload.referrer,
        country=payload.country,
        city=payload.city,
    )
    db.add(event)
    db.commit()
    return {"ok": True}


@router.post("/session/start")
def session_start(payload: SessionStartPayload, db: Session = Depends(get_db)):
    session = UserSession(
        id=payload.session_id,
        user_id=payload.user_id,
        device=payload.device,
        browser=payload.browser,
        referrer=payload.referrer,
        landing_page=payload.landing_page,
        country=payload.country,
        city=payload.city,
        utm_source=payload.utm_source,
        utm_campaign=payload.utm_campaign,
        utm_medium=payload.utm_medium,
    )
    db.merge(session)
    db.commit()
    return {"ok": True}


@router.post("/session/end")
def session_end(payload: SessionEndPayload, db: Session = Depends(get_db)):
    db.execute(
        text("""
            UPDATE pulse_user_sessions
            SET ended_at = NOW(),
                exit_page = :exit,
                duration_seconds = :dur,
                made_prediction = :pred
            WHERE id = :sid
        """),
        {"exit": payload.exit_page, "dur": payload.duration_seconds,
         "pred": payload.made_prediction, "sid": payload.session_id},
    )
    db.commit()
    return {"ok": True}
