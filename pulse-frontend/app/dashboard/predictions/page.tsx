"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getPredictions } from "@/lib/api";
import { fmtDateTime, fmtCompact, CATEGORY_COLORS, cn } from "@/lib/utils";

const OUTCOMES = ["", "win", "loss", "pending"];
const CATEGORIES = ["", "crypto", "politics", "economy", "sports", "technology", "geopolitics"];
const DAY_FILTERS = [
  { label: "All Time", value: undefined },
  { label: "Today",    value: 1 },
  { label: "7 Days",   value: 7 },
  { label: "30 Days",  value: 30 },
];

const OUTCOME_BADGE: Record<string, string> = {
  win:     "badge-green",
  loss:    "badge-red",
  pending: "badge-amber",
};

export default function PredictionsPage() {
  const [category, setCategory] = useState("");
  const [outcome, setOutcome] = useState("");
  const [days, setDays] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [category, outcome, days]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: 50 };
    if (category) params.category = category;
    if (outcome) params.outcome = outcome;
    if (days) params.days = days;
    getPredictions(params).then(setData).finally(() => setLoading(false));
  }, [category, outcome, days, page]);

  const predictions = data?.predictions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Predictions</h1>
        <p className="text-sm text-text-muted">{total.toLocaleString()} predictions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all",
                category === c
                  ? "border-transparent text-white"
                  : "border-border bg-surface text-text-muted hover:text-text"
              )}
              style={category === c ? { background: CATEGORY_COLORS[c] || "#8b5cf6" } : undefined}
            >
              {c || "All"}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-border mx-1 self-center" />
        {OUTCOMES.map((o) => (
          <button
            key={o}
            onClick={() => setOutcome(o)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all",
              outcome === o
                ? "bg-violet/15 text-violet border-violet/20"
                : "border-border bg-surface text-text-muted hover:text-text"
            )}
          >
            {o || "All Outcomes"}
          </button>
        ))}
        <div className="h-6 w-px bg-border mx-1 self-center" />
        {DAY_FILTERS.map((d) => (
          <button
            key={d.label}
            onClick={() => setDays(d.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              days === d.value
                ? "bg-violet/15 text-violet border-violet/20"
                : "border-border bg-surface text-text-muted hover:text-text"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {["User", "Market", "Category", "Scenario", "Amount", "Entry Prob", "PnL", "Outcome", "Time"].map((h) => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-3 bg-surface rounded animate-pulse w-14" /></td>
                    ))}
                  </tr>
                ))
              : predictions.map((p: any) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell text-xs max-w-[120px] truncate">
                      <Link href={`/dashboard/users/${p.user_id}`} className="text-text-muted hover:text-violet transition-colors">
                        {p.user_name}
                      </Link>
                    </td>
                    <td className="table-cell max-w-[180px]">
                      <p className="text-text text-xs truncate">{p.event_title}</p>
                    </td>
                    <td className="table-cell">
                      <span
                        className="badge capitalize"
                        style={{
                          background: `${CATEGORY_COLORS[p.category]}22`,
                          color: CATEGORY_COLORS[p.category] || "#94a3b8",
                        }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-text-muted max-w-[100px] truncate">
                      {p.scenario_title}
                    </td>
                    <td className="table-cell tabular-nums text-text">{fmtCompact(p.amount)}</td>
                    <td className="table-cell tabular-nums text-text-muted">{p.entry_probability.toFixed(0)}%</td>
                    <td className="table-cell tabular-nums">
                      {p.pnl !== null ? (
                        <span className={p.pnl >= 0 ? "text-green" : "text-red"}>
                          {p.pnl >= 0 ? "+" : ""}{fmtCompact(Math.abs(p.pnl))}
                        </span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="table-cell">
                      <span className={cn("badge capitalize", OUTCOME_BADGE[p.outcome] || "badge-violet")}>
                        {p.outcome}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-text-muted tabular-nums">
                      {fmtDateTime(p.created_at)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && predictions.length === 0 && (
          <div className="py-12 text-center text-text-muted text-sm">No predictions match filters</div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
