# Scenara Pulse

Admin analytics dashboard for [Scenara](https://github.com/Noctilucenty/Scenara) — a real-time prediction market simulation platform. Pulse gives operators a live view of every user, market, prediction, and engagement metric across the entire platform.

---

## What It Does

Scenara Pulse connects to the same PostgreSQL database as the Scenara backend and surfaces analytics through a secure, admin-only web dashboard. It tracks everything: who signed up, what they bet on, how long they stayed, which markets are hottest, and where users drop off in the funnel.

**Key capabilities:**

- **Real-time feed** — live activity stream polling every 8 seconds, with active-user count
- **User analytics** — full per-user profiles with PnL history, session breakdown, category preferences, and admin notes
- **Market analytics** — probability history charts, scenario volume breakdown, top predictors per market
- **Retention cohorts** — week-over-week retention heatmap by signup cohort
- **Conversion funnel** — step-by-step drop-off analysis from session → signup → prediction
- **Leaderboard** — top users ranked by PnL, volume, or win rate with achievement badges
- **CSV export** — authenticated bulk exports for users, predictions, and markets
- **Admin controls** — flag/disable users, add internal notes, view audit log

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Scenara Pulse                          │
│                                                          │
│   pulse-frontend (Next.js 15)                            │
│   └── 11 dashboard pages                                │
│   └── Recharts visualizations                           │
│   └── JWT auth (admin-only)                             │
│                                                          │
│   pulse-backend (FastAPI)                                │
│   └── Reads Scenara's PostgreSQL tables (read-only)     │
│   └── Owns pulse_* prefixed tables                      │
│   └── Rate-limited analytics API                        │
└──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│              Shared PostgreSQL (Neon)                    │
│  Scenara tables (read-only):  users, events, scenarios, │
│    predictions, accounts, scenario_probability_history   │
│                                                          │
│  Pulse-owned tables (read/write):                        │
│    pulse_admins, pulse_analytics_events,                │
│    pulse_user_sessions, pulse_daily_metrics,            │
│    pulse_audit_logs, pulse_admin_user_notes             │
└──────────────────────────────────────────────────────────┘
```

Pulse never writes to Scenara's tables — it only reads them via `SELECT` queries. All writes go to `pulse_*` prefixed tables that Pulse creates and owns.

---

## Project Structure

```
Scenara Pulse/
├── pulse-backend/          # FastAPI analytics API
│   ├── app/
│   │   ├── config.py       # Pydantic settings (reads .env)
│   │   ├── db.py           # SQLAlchemy engine + session factory
│   │   ├── main.py         # App entry point, CORS, rate limiting, table init
│   │   ├── models/
│   │   │   ├── admin.py    # PulseAdmin model
│   │   │   └── analytics.py # AnalyticsEvent, UserSession, DailyMetrics, AuditLog, UserNote
│   │   ├── routers/
│   │   │   ├── auth.py     # POST /auth/token, GET /auth/me
│   │   │   ├── analytics.py # All admin analytics endpoints
│   │   │   └── track.py    # Event ingestion endpoints (called from Scenara app)
│   │   └── services/
│   │       └── metrics.py  # All SQL query logic
│   ├── seed.py             # CLI to create the first superadmin
│   ├── requirements.txt
│   ├── Procfile            # For Render deployment
│   └── .env.example
│
└── pulse-frontend/         # Next.js 15 admin dashboard
    ├── app/
    │   ├── login/          # Auth page
    │   └── dashboard/
    │       ├── page.tsx        # Overview (metrics + charts)
    │       ├── users/
    │       │   ├── page.tsx    # User list with filters
    │       │   └── [id]/       # Full user profile (tabs: overview, predictions, sessions, notes)
    │       ├── markets/
    │       │   ├── page.tsx    # Market list
    │       │   └── [id]/       # Market detail (probability chart, scenario breakdown, top bettors)
    │       ├── sessions/       # Session analytics
    │       ├── predictions/    # Prediction history with filters
    │       ├── retention/      # Cohort retention heatmap
    │       ├── funnels/        # Conversion funnel visualization
    │       ├── leaderboard/    # Top users with badges
    │       ├── realtime/       # Live activity feed
    │       ├── export/         # CSV export (auth-header download, no token in URL)
    │       └── settings/       # Admin info, system status, tracking setup
    ├── components/
    │   ├── Sidebar.tsx         # Navigation with active-state detection
    │   ├── Header.tsx          # Breadcrumb, live indicator, admin avatar
    │   ├── Toast.tsx           # Global toast notifications (no external lib)
    │   ├── MetricCard.tsx      # Animated stat card with trend display
    │   ├── CohortTable.tsx     # Retention heatmap table
    │   ├── FunnelViz.tsx       # Funnel step visualization with drop-off warnings
    │   ├── RealtimeFeed.tsx    # Live event feed component
    │   ├── DateRangePicker.tsx # 7d/30d/90d/1y selector
    │   └── charts/
    │       ├── AreaChart.tsx   # Multi-series area chart (Recharts)
    │       ├── BarChart.tsx    # Bar chart with optional value coloring
    │       └── DonutChart.tsx  # Donut/pie chart
    ├── lib/
    │   ├── api.ts      # Axios client with JWT interceptors + downloadExport()
    │   ├── auth.ts     # localStorage auth helpers (SSR-safe)
    │   └── utils.ts    # Formatters, color maps, cn()
    ├── middleware.ts   # Security headers for /dashboard/* routes
    └── tailwind.config.ts # Custom dark design tokens
```

---

## Dashboard Pages

| Page | Route | Description |
|---|---|---|
| Overview | `/dashboard` | 8 metric cards, user growth chart, category donut, prediction activity bar chart |
| Users | `/dashboard/users` | Filterable/searchable user table with retention status |
| User Detail | `/dashboard/users/[id]` | 4-tab profile: overview, predictions, sessions, notes |
| Markets | `/dashboard/markets` | Market list filtered by category and status |
| Market Detail | `/dashboard/markets/[id]` | Probability history chart, scenario breakdown, top predictors |
| Sessions | `/dashboard/sessions` | Session list with duration and prediction stats |
| Predictions | `/dashboard/predictions` | All predictions with category/outcome/date filters |
| Retention | `/dashboard/retention` | Week-over-week cohort retention heatmap |
| Funnels | `/dashboard/funnels` | Step funnel from session → repeat prediction |
| Leaderboard | `/dashboard/leaderboard` | Top users by PnL/volume/win rate, podium top-3 display |
| Real-Time | `/dashboard/realtime` | Live feed polling every 8s, active user count |
| Export | `/dashboard/export` | Authenticated CSV download for users/predictions/markets |
| Settings | `/dashboard/settings` | Admin info, backend health check, tracking snippet |

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async Python API framework
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM + raw SQL via `text()`
- [python-jose](https://python-jose.readthedocs.io/) — JWT token signing/verification
- [passlib](https://passlib.readthedocs.io/) + bcrypt — password hashing
- [slowapi](https://github.com/laurentS/slowapi) — rate limiting
- [psycopg2](https://www.psycopg.org/) — PostgreSQL driver

**Frontend**
- [Next.js 15](https://nextjs.org/) — App Router, client components, middleware
- [Tailwind CSS](https://tailwindcss.com/) — custom dark design system
- [Recharts](https://recharts.org/) — area charts, bar charts, donut charts
- [Axios](https://axios-http.com/) — HTTP client with JWT interceptors
- [Lucide React](https://lucide.dev/) — icon set
- [date-fns](https://date-fns.org/) — date formatting

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL database (shared with a running Scenara backend, or a fresh Neon instance)

---

### Backend Setup

```bash
cd pulse-backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# Create the first admin account
python seed.py --email admin@example.com --password yourpassword --name "Admin"

# Start the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

On startup, the backend automatically creates all `pulse_*` tables if they don't exist.

---

### Frontend Setup

```bash
cd pulse-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`. Navigate to `/login` and use the admin credentials you created with `seed.py`.

---

## Environment Variables

### Backend (`pulse-backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Must point to the same database as your Scenara backend. Format: `postgresql://user:password@host/dbname` |
| `JWT_SECRET_KEY` | Yes | Random secret used to sign admin JWT tokens. Generate with: `openssl rand -hex 32` |
| `JWT_ALGORITHM` | No | JWT algorithm. Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token lifetime in minutes. Defaults to `480` (8 hours) |
| `CORS_ALLOW_ORIGINS` | No | Comma-separated list of allowed origins. Defaults to `http://localhost:3000` |
| `RATE_LIMIT` | No | API rate limit. Defaults to `100/minute` |

### Frontend (`pulse-frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Full URL of the Pulse backend API. Example: `https://your-backend.onrender.com` |

---

## Embedding the Tracker in Scenara

Pulse includes an event ingestion API (`/analytics/track`, `/analytics/session/start`, `/analytics/session/end`) designed to receive events from the Scenara mobile app.

Add `pulse-tracker.ts` to the Scenara mobile codebase and initialize it on app start:

```typescript
import PulseTracker from './lib/pulse-tracker';

// Initialize once (e.g. in your root layout or App.tsx)
PulseTracker.init({
  endpoint: 'https://your-pulse-backend.onrender.com',
  userId: currentUser.id,
  userEmail: currentUser.email,
});

// Track events anywhere in the app
PulseTracker.trackMarketView(marketId, category);
PulseTracker.trackPrediction(marketId, scenarioId, amount, category);

// End session when app goes to background
PulseTracker.endSession();
```

The tracker batches events and handles session lifecycle automatically.

---

## Deployment

### Backend on Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo, set the root directory to `pulse-backend`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from the Backend section above
6. Deploy — the `pulse_*` tables will be created automatically on first start
7. After deploying, SSH into the service and run: `python seed.py --email ... --password ...`

### Frontend on Vercel

1. Import the repo on [Vercel](https://vercel.com)
2. Set the **Root Directory** to `pulse-frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` → your Render backend URL
4. Deploy

Both Vercel and Render support private GitHub repositories — just grant repository access in the GitHub app settings when connecting.

---

## Security Notes

- Admin JWT tokens are stored in `localStorage` and injected via Axios interceptors. The dashboard performs a client-side auth check on every page and redirects unauthenticated users to `/login`.
- The Next.js middleware adds security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) to all `/dashboard/*` routes.
- CSV exports use `fetch()` with an `Authorization: Bearer` header — the token is never exposed in the URL, query string, or browser history.
- Pulse only reads Scenara's tables — it never writes to them. All Pulse state lives in `pulse_*` tables.
- Admin passwords are hashed with bcrypt via passlib before storage.
- Rate limiting is applied globally via slowapi (default: 100 requests/minute per IP).

---

## Related

- [Scenara](https://github.com/Noctilucenty/Scenara) — the prediction market platform this dashboard monitors
