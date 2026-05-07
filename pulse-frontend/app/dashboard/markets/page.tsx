"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getMarkets } from "@/lib/api";
import { fmtDate, fmtCompact, CATEGORY_COLORS, cn } from "@/lib/utils";

const CATEGORIES = ["", "crypto", "politics", "economy", "sports", "technology", "geopolitics"];
const STATUS_OPTS = ["", "open", "resolved", "void"];

const STATUS_BADGE: Record<string, string> = {
  open:     "badge-green",
  resolved: "badge-blue",
  void:     "badge text-text-muted bg-surface",
};

export default function MarketsPage() {
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [category, status]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: 50 };
    if (category) params.category = category;
    if (status) params.status = status;
    getMarkets(params).then(setData).finally(() => setLoading(false));
  }, [category, status, page]);

  const markets = data?.markets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Markets</h1>
        <p className="text-sm text-text-muted">{total.toLocaleString()} total prediction markets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize border",
              category === c
                ? "border-transparent text-white"
                : "border-border bg-surface text-text-muted hover:text-text"
            )}
            style={category === c ? { background: CATEGORY_COLORS[c] || "var(--violet)" } : undefined}
          >
            {c || "All Categories"}
          </button>
        ))}
        <div className="h-6 w-px bg-border mx-1 self-center" />
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize border",
              status === s
                ? "bg-violet/15 text-violet border-violet/20"
                : "border-border bg-surface text-text-muted hover:text-text"
            )}
          >
            {s || "All Status"}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {["Market", "Category", "Status", "Created", "Bettors", "Predictions", "Volume", ""].map((h) => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-3 bg-surface rounded animate-pulse w-16" /></td>
                    ))}
                  </tr>
                ))
              : markets.map((m: any) => (
                  <tr key={m.id} className="table-row">
                    <td className="table-cell max-w-[240px]">
                      <Link href={`/dashboard/markets/${m.id}`} className="text-text text-sm font-medium truncate block hover:text-violet transition-colors">
                        {m.title}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span
                        className="badge capitalize"
                        style={{
                          background: `${CATEGORY_COLORS[m.category]}22`,
                          color: CATEGORY_COLORS[m.category] || "#94a3b8",
                        }}
                      >
                        {m.category}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={cn("badge capitalize", STATUS_BADGE[m.status] || "badge-violet")}>
                        {m.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-text-muted">{fmtDate(m.created_at)}</td>
                    <td className="table-cell tabular-nums text-text-muted">{m.unique_bettors}</td>
                    <td className="table-cell tabular-nums text-text-muted">{m.total_predictions}</td>
                    <td className="table-cell tabular-nums text-text font-medium">{fmtCompact(m.total_volume)}</td>
                    <td className="table-cell">
                      <Link href={`/dashboard/markets/${m.id}`} className="text-text-muted hover:text-violet transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && markets.length === 0 && (
          <div className="py-12 text-center text-text-muted text-sm">No markets match filters</div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
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
