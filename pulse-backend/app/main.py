from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db import engine, Base
from app.models import admin, analytics  # noqa: F401 — ensure tables are registered
from app.routers import auth, analytics as analytics_router, track

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Scenara Pulse API",
    version="1.0.0",
    docs_url=None,   # hide public docs
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_allow_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analytics_router.router, prefix="/admin/analytics", tags=["analytics"])
app.include_router(track.router, prefix="/analytics", tags=["tracking"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "scenara-pulse"}
