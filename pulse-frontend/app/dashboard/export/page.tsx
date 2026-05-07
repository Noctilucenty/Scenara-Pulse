"use client";

import { Download, FileText, Users, Zap, BarChart3 } from "lucide-react";
import { getToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXPORTS = [
  {
    type: "users",
    label: "User Export",
    description: "All users with XP, level, balance, predictions count, PnL, and streaks",
    icon: Users,
    color: "violet",
    fields: ["id", "email", "display_name", "signup_date", "xp", "level", "streak", "balance", "predictions", "pnl"],
  },
  {
    type: "predictions",
    label: "Prediction Export",
    description: "All predictions with amounts, probabilities, outcomes, and market data",
    icon: Zap,
    color: "blue",
    fields: ["id", "user_id", "amount", "entry_probability", "pnl", "event_title", "category"],
  },
  {
    type: "markets",
    label: "Market Export",
    description: "All prediction markets with volume, bettors, and resolution data",
    icon: BarChart3,
    color: "green",
    fields: ["id", "title", "category", "status", "created_at", "total_predictions", "total_volume"],
  },
];

const COLOR_CLASSES: Record<string, string> = {
  violet: "bg-violet/10 text-violet",
  blue:   "bg-blue/10 text-blue",
  green:  "bg-green/10 text-green",
};

export default function ExportPage() {
  const handleDownload = (type: string) => {
    const token = getToken();
    const url = `${BASE}/admin/analytics/export?type=${type}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "");
    // Attach auth via fetch + blob to avoid exposing token in URL
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const href = URL.createObjectURL(blob);
        a.href = href;
        a.download = `scenara_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(href);
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Export Data</h1>
        <p className="text-sm text-text-muted">Download Scenara data as CSV for external analysis</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {EXPORTS.map(({ type, label, description, icon: Icon, color, fields }) => (
          <div key={type} className="glass-hover p-6 flex items-start gap-5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${COLOR_CLASSES[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-text">{label}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {fields.map((f) => (
                      <span key={f} className="badge bg-surface border border-border text-text-muted font-mono text-[10px]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(type)}
                  className="btn-primary flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy notice */}
      <div className="glass p-5 border-amber/20">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-amber mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-text">Data Privacy Notice</p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Exported data includes user emails and behavioral data. Handle responsibly and in
              accordance with your privacy policy. Do not share exports externally. All exports are
              logged to the admin audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
