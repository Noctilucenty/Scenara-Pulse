"use client";

import { useEffect, useState } from "react";
import { Settings, Shield, Database, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { getAdmin } from "@/lib/auth";

export default function SettingsPage() {
  const admin = getAdmin();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.get("/health").then((r) => setHealth(r.data)).catch(() => setHealth({ status: "error" }));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-text-muted">System status and admin configuration</p>
      </div>

      {/* Admin info */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-violet" />
          <p className="text-sm font-semibold text-text">Your Account</p>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Email",        value: admin?.email || "—" },
            { label: "Display Name", value: admin?.display_name || "—" },
            { label: "Role",         value: admin?.role || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-text-muted">{label}</span>
              <span className="text-text font-medium capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System status */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-green" />
          <p className="text-sm font-semibold text-text">System Status</p>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Pulse API",
              status: health?.status === "ok" ? "operational" : health ? "error" : "checking…",
              ok: health?.status === "ok",
            },
            { label: "Scenara DB", status: "connected (shared)", ok: true },
            { label: "Analytics Tables", status: "active", ok: true },
          ].map(({ label, status, ok }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm text-text-muted">{label}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${ok ? "text-green" : "text-red"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green" : "bg-red"}`} />
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking setup */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-blue" />
          <p className="text-sm font-semibold text-text">Tracking Setup</p>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Add this snippet to the Scenara public app to enable session and event tracking.
          The file is already created at <code className="text-violet">src/lib/pulse-tracker.ts</code>.
        </p>
        <div className="bg-[#0d0d1b] rounded-lg p-4 font-mono text-xs text-green/90 overflow-x-auto">
          <p className="text-text-muted mb-1">{"// In your app entry / layout"}</p>
          <p>{"import { PulseTracker } from './src/lib/pulse-tracker';"}</p>
          <p className="mt-2 text-text-muted">{"// Initialize once"}</p>
          <p>{"PulseTracker.init({ apiUrl: 'https://your-pulse-backend.render.com' });"}</p>
          <p className="mt-2 text-text-muted">{"// Track events"}</p>
          <p>{"PulseTracker.track('market_viewed', { market_id: 42, category: 'crypto' });"}</p>
        </div>
      </div>

      {/* Deployment info */}
      <div className="glass p-6">
        <p className="text-sm font-semibold text-text mb-4">Deployment</p>
        <div className="space-y-3 text-sm">
          {[
            { label: "Frontend",       value: "Vercel (Next.js)" },
            { label: "Backend",        value: "Render (FastAPI)" },
            { label: "Database",       value: "Neon PostgreSQL (shared with Scenara)" },
            { label: "Auth",           value: "JWT (8h expiry)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-text-muted">{label}</span>
              <span className="text-text text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
