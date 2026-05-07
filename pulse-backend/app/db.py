from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Pulse-owned tables (pulse_admins, pulse_analytics_events, etc.)
engine = create_engine(settings.database_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Scenara read-only tables (users, events, predictions, …)
_scenara_url = settings.scenara_database_url or settings.database_url
scenara_engine = create_engine(_scenara_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
ScenaraSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=scenara_engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_scenara_db():
    db = ScenaraSessionLocal()
    try:
        yield db
    finally:
        db.close()
