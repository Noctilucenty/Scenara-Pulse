"use client";

import { useEffect, useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getUsers, downloadExport } from "@/lib/api";
import { fmtDate, fmtCompact, cn } from "@/lib/utils";
import { toast } from "@/components/Toast";

const FILTERS = [
  { key: "",                label: "All Users" },
  { key: "active_today",    label: "Active Today" },
  { key: "new",             label: "New (7d)" },
  { key: "active",          label: "Active" },
  { key: "dormant",         label: "Dormant" },
  { key: "high_value",      label: "High Value" },
  { key: "no_predictions",  label: "Never Predicted" },
  { key: "one_prediction",  label: "One & Done" },
];

const RETENTION_BADGE: Record<string, string> = {
  active:           "badge-green",
  at_risk:          "badge-amber",
  churned:          "badge-red",
  never_predicted:  "badge-violet",
};

export default function UsersPage() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: 50 };
    if (filter) params.filter = filter;
    if (search) params.search = search;
    getUsers(params).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [filter, search]);
  useEffect(() => { fetchUsers(); }, [filter, page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchUsers(); };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("users");
      toast.success("Users CSV downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-sm text-text-muted mt-0.5">{total.toLocaleString()} total users</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-ghost flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === f.key
                ? "bg-violet/15 text-violet border border-violet/20"
                : "bg-surface border border-border text-text-muted hover:text-text"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {["User", "Signed Up", "Predictions", "Win Rate", "PnL", "Balance", "Level", "Status"].map((h) => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-3 bg-surface rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u: any) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell">
                      <Link href={`/dashboard/users/${u.id}`} className="block group/cell">
                        <p className="text-text font-medium text-sm truncate max-w-[180px] group-hover/cell:text-violet transition-colors">
                          {u.display_name || u.email}
                        </p>
                        {u.display_name && (
                          <p className="text-[11px] text-text-muted truncate max-w-[180px]">{u.email}</p>
                        )}
                      </Link>
                    </td>
                    <td className="table-cell text-text-muted text-xs">{fmtDate(u.signup_date)}</td>
                    <td className="table-cell tabular-nums">{u.total_predictions.toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={u.win_rate >= 55 ? "text-green" : u.win_rate >= 45 ? "text-text" : "text-red"}>
                        {u.win_rate}%
                      </span>
                    </td>
                    <td className="table-cell tabular-nums">
                      <span className={u.total_pnl >= 0 ? "text-green" : "text-red"}>
                        {u.total_pnl >= 0 ? "+" : ""}{fmtCompact(Math.abs(u.total_pnl))}
                      </span>
                    </td>
                    <td className="table-cell text-text-muted tabular-nums">
                      {fmtCompact(u.balance)}
                    </td>
                    <td className="table-cell">
                      <span className="badge-violet">Lv {u.level}</span>
                    </td>
                    <td className="table-cell">
                      <span className={cn("badge capitalize", RETENTION_BADGE[u.retention_status] || "badge-violet")}>
                        {u.retention_status?.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="py-12 text-center text-text-muted text-sm">No users match this filter</div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">
              Page {page} of {totalPages} · {total.toLocaleString()} users
            </span>
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
