"""
Run once to create the first superadmin account.
  python seed.py --email admin@scenara.app --password yourSecurePassword --name "Noct"
"""
import argparse
from passlib.context import CryptContext
from app.db import engine, Base, SessionLocal
from app.models.admin import PulseAdmin
from app.models.analytics import AnalyticsEvent, UserSession, DailyMetrics, AdminAuditLog, AdminUserNote

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    parser = argparse.ArgumentParser(description="Seed Pulse superadmin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Admin")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(PulseAdmin).filter(PulseAdmin.email == args.email).first()
        if existing:
            print(f"Admin {args.email} already exists.")
            return

        admin = PulseAdmin(
            email=args.email,
            hashed_password=pwd_context.hash(args.password),
            display_name=args.name,
            role="superadmin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"✓ Created superadmin: {args.email}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
