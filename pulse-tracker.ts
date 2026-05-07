/**
 * Pulse Tracker — drop this file into your Scenara app (e.g. src/lib/pulse-tracker.ts)
 * and call PulseTracker.init() once in your root layout or App entry point.
 *
 * Tracks: sessions (start / end), page views, market views, predictions.
 * Sends data to the Pulse backend API.
 */

import { v4 as uuid } from "uuid";

interface PulseConfig {
  apiUrl: string;       // e.g. "https://your-pulse-backend.onrender.com"
  userId?: number;
  userEmail?: string;
}

interface TrackPayload {
  event_type: string;
  session_id?: string;
  user_id?: number;
  page_url?: string;
  metadata?: Record<string, unknown>;
  device?: string;
  browser?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

class PulseTrackerClass {
  private apiUrl = "";
  private sessionId = "";
  private userId: number | undefined;
  private sessionStart = 0;
  private initialized = false;

  init(config: PulseConfig) {
    if (this.initialized) return;
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.userId = config.userId;
    this.initialized = true;
    this.startSession();

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.endSession());
      // For mobile / SPA background
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.endSession();
      });
    }
  }

  setUser(userId: number) {
    this.userId = userId;
  }

  private device(): string {
    if (typeof window === "undefined") return "unknown";
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return "mobile";
    if (/Tablet|iPad/i.test(ua)) return "tablet";
    return "desktop";
  }

  private browser(): string {
    if (typeof window === "undefined") return "unknown";
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return "Edge";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Safari/i.test(ua)) return "Safari";
    return "Other";
  }

  private utm(key: string): string | undefined {
    if (typeof window === "undefined") return undefined;
    const p = new URLSearchParams(window.location.search);
    return p.get(key) ?? undefined;
  }

  private post(path: string, body: unknown) {
    if (!this.apiUrl) return;
    navigator.sendBeacon
      ? navigator.sendBeacon(`${this.apiUrl}${path}`, JSON.stringify(body))
      : fetch(`${this.apiUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true,
        }).catch(() => {});
  }

  private startSession() {
    this.sessionId = uuid();
    this.sessionStart = Date.now();

    this.post("/analytics/session/start", {
      session_id: this.sessionId,
      user_id: this.userId,
      device: this.device(),
      browser: this.browser(),
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      landing_page: typeof window !== "undefined" ? window.location.pathname : undefined,
      utm_source: this.utm("utm_source"),
      utm_campaign: this.utm("utm_campaign"),
      utm_medium: this.utm("utm_medium"),
    });

    // Track initial page view
    this.trackPageView();
  }

  endSession(madePrediction = false) {
    if (!this.sessionId || !this.sessionStart) return;
    const duration = Math.round((Date.now() - this.sessionStart) / 1000);
    this.post("/analytics/session/end", {
      session_id: this.sessionId,
      exit_page: typeof window !== "undefined" ? window.location.pathname : undefined,
      duration_seconds: duration,
      made_prediction: madePrediction,
    });
    this.sessionId = "";
    this.sessionStart = 0;
  }

  // ── Public tracking methods ────────────────────────────────────────────────

  track(eventType: string, metadata?: Record<string, unknown>) {
    const payload: TrackPayload = {
      event_type: eventType,
      session_id: this.sessionId,
      user_id: this.userId,
      page_url: typeof window !== "undefined" ? window.location.pathname : undefined,
      metadata,
      device: this.device(),
      browser: this.browser(),
    };
    this.post("/analytics/track", payload);
  }

  trackPageView(url?: string) {
    this.track("page_view", { url: url ?? (typeof window !== "undefined" ? window.location.pathname : undefined) });
  }

  trackMarketView(marketId: number, category: string) {
    this.track("market_viewed", { market_id: marketId, category });
  }

  trackPrediction(marketId: number, scenarioId: number, amount: number, category: string) {
    this.track("prediction_placed", { market_id: marketId, scenario_id: scenarioId, amount, category });
    this.endSession(true);
    this.startSession(); // restart session after prediction
  }

  trackSignup(userId: number) {
    this.userId = userId;
    this.track("signup", { user_id: userId });
  }

  trackLogin(userId: number) {
    this.userId = userId;
    this.track("login", { user_id: userId });
  }
}

export const PulseTracker = new PulseTrackerClass();
export default PulseTracker;
