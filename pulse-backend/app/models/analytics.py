from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON, Date, BigInteger
from sqlalchemy.sql import func
from app.db import Base


class AnalyticsEvent(Base):
    __tablename__ = "pulse_analytics_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    session_id = Column(String(64), index=True)
    event_type = Column(String(64), nullable=False, index=True)
    page_url = Column(String(512))
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    device = Column(String(32))
    browser = Column(String(64))
    referrer = Column(String(512))
    country = Column(String(8))
    city = Column(String(64))


class UserSession(Base):
    __tablename__ = "pulse_user_sessions"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, nullable=True, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    device = Column(String(32))
    browser = Column(String(64))
    referrer = Column(String(512))
    landing_page = Column(String(512))
    exit_page = Column(String(512))
    made_prediction = Column(Boolean, default=False)
    country = Column(String(8))
    city = Column(String(64))
    utm_source = Column(String(128))
    utm_campaign = Column(String(128))
    utm_medium = Column(String(64))


class DailyMetrics(Base):
    __tablename__ = "pulse_daily_metrics"

    date = Column(Date, primary_key=True)
    total_users = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    predictions_count = Column(Integer, default=0)
    simulated_volume = Column(Float, default=0.0)
    avg_session_duration = Column(Float, default=0.0)
    retention_rate = Column(Float, default=0.0)
    signup_to_prediction_rate = Column(Float, default=0.0)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class AdminAuditLog(Base):
    __tablename__ = "pulse_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, nullable=False)
    action = Column(String(64), nullable=False)
    target_type = Column(String(32))
    target_id = Column(String(64))
    details = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))


class AdminUserNote(Base):
    __tablename__ = "pulse_admin_user_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    admin_id = Column(Integer, nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
