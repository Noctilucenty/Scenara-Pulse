"use client";

import { useEffect, useState } from "react";
import { MonitorPlay, ChevronLeft, ChevronRight } from "lucide-react";
import { getSessions } from "@/lib/api";
import { fmtDateTime, fmtDuration, cn } from "@/lib/utils";

export default function SessionsPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSessions({ page, page_size: 50 }).then(setData).finally(() => setLoading(false));
  }, [page]);

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const avgDuration = sessions.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) / (sessions.length || 1);
  const withPredictions = sessions.filter((s: any) => s.made_prediction).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Sessions</h1>
        <p className="text-sm text-text-muted mt-0.5">{total.toLocaleString()} total sessions tracked</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4">
          <p className="section-label">Total Sessions</p>
          <p className="text-2xl font-bold text-text mt-1 tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="glass p-4">
          <p className="section-label">Avg Duration</p>
          <p className="text-2xl font-bold text-text mt-1">{fmtDuration(Math.round(avgDuration))}</p>
        </div>
        <div className="glass p-4">
          <p className="section-label">With Prediction</p>
          <p className="text-2xl font-bold text-text mt-1 tabular-nums">
            {sessions.length > 0 ? Math.round((withPredictions / sessions.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Journey example */}
      <div className="glass p-5">
        <p className="text-sm font-semibold text-text mb-3">Typical User Journey</p>
        <div className="flex items-center gap-2 flex-wrap">
          {["Landing Page", "Register", "Browse Markets", "Market Detail", "Predict", "Dashboard"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-surface border border-border rounded-lg text-xs text-text-muted">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-text-faint text-sm">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {["User", "Started", "Duration", "Landing Page", "Exit Page", "Device", "Country", "Predicted"].map((h) => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-3 bg-surface rounded animate-pulse w-16" /></td>
                    ))}
                  </tr>
                ))
              : sessions.map((s: any) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell text-text-muted text-xs max-w-[120px] truncate">
                      {s.user_email || "Anonymous"}
                    </td>
                    <td className="table-cell text-xs text-text-muted tabular-nums">
                      {fmtDateTime(s.started_at)}
                    </td>
                    <td className="table-cell text-sm tabular-nums">
                      {fmtDuration(s.duration_seconds)}
                    </td>
                    <td className="table-cell text-xs text-text-muted max-w-[120px] truncate">
                      {s.landing_page || "—"}
                    </td>
                    <td className="table-cell text-xs text-text-muted max-w-[120px] truncate">
                      {s.exit_page || "—"}
                    </td>
                    <td className="table-cell text-xs text-text-muted">
                      {s.device || "—"}
                    </td>
                    <td className="table-cell text-xs text-text-muted uppercase">
                      {s.country || "—"}
                    </td>
                    <td className="table-cell">
                      <span className={s.made_prediction ? "badge-green" : "badge text-text-muted bg-surface"}>
                        {s.made_prediction ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && sessions.length === 0 && (
          <div className="py-16 text-center">
            <MonitorPlay className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">No sessions tracked yet.</p>
            <p className="text-xs text-text-faint mt-1">Add the Pulse tracker to Scenara to collect session data.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
