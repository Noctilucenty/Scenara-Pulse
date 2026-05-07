"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Flag, StickyNote, Zap, Trophy, TrendingUp,
  Target, Star, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { getUserDetail, toggleUserActive, addUserNote } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtCompact, fmtDuration, cn, CATEGORY_COLORS } from "@/lib/utils";
import { toast } from "@/components/Toast";
import PulseAreaChart from "@/components/charts/AreaChart";
import PulseDonutChart from "@/components/charts/DonutChart";

const TABS = ["overview", "predictions", "sessions", "notes"] as const;
type Tab = typeof TABS[number];

const RETENTION_COLOR: Record<string, string> = {
  active:          "text-green",
  at_risk:         "text-amber",
  churned:         "text-red",
  never_predicted: "text-text-muted",
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "overview";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getUserDetail(Number(id)).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleFlag = async () => {
    setFlagging(true);
    try {
      const res = await toggleUserActive(Number(id));
      toast.success(res.is_active ? "User re-enabled" : "User flagged and disabled");
      fetchData();
    } catch {
      toast.error("Action failed");
    } finally {
      setFlagging(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addUserNote(Number(id), noteText.trim());
      toast.success("Note added");
      setNoteText("");
      fetchData();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const setTab = (t: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`/dashboard/users/${id}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="h-6 w-32 bg-surface rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-muted">
        <p className="text-sm">User not found</p>
        <Link href="/dashboard/users" className="mt-3 text-xs text-violet hover:underline">← Back to Users</Link>
      </div>
    );
  }

  const categoryData = (data.favorite_categories || []).map((c: any) => ({
    label: c.category,
    value: c.count,
    color: CATEGORY_COLORS[c.category] || "#64748b",
  }));

  // Build prediction history chart from recent predictions
  const predChartData = [...(data.recent_predictions || [])]
    .reverse()
    .slice(-20)
    .map((p: any, i: number) => ({
      index: i + 1,
      pnl: p.pnl ?? 0,
      amount: p.amount,
    }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/users" className="flex items-center gap-1.5 text-text-muted hover:text-text transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          All Users
        </Link>
        <button
          onClick={handleFlag}
          disabled={flagging}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red/20 bg-red/5 text-red hover:bg-red/10 transition-all disabled:opacity-50"
        >
          <Flag className="w-3.5 h-3.5" />
          {flagging ? "…" : "Flag / Disable"}
        </button>
      </div>

      {/* Profile header */}
      <div className="glass p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-pulse flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg shadow-violet/25">
            {(data.display_name || data.email || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text">
                {data.display_name || "No display name"}
              </h2>
              <span className="badge-violet">Level {data.level}</span>
              <span className={cn("text-xs font-medium capitalize", RETENTION_COLOR[data.retention_status] || "text-text-muted")}>
                {data.retention_status?.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-0.5">{data.email}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
              <span>ID #{data.id}</span>
              <ChevronRight className="w-3 h-3 text-text-faint" />
              <span>Joined {fmtDate(data.signup_date)}</span>
              <ChevronRight className="w-3 h-3 text-text-faint" />
              <span>Streak: {data.current_streak}🔥 (best: {data.best_streak})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-2xl font-bold gradient-text tabular-nums">
                ${fmtCompact(data.balance)}
              </p>
              <p className="text-xs text-text-muted">balance</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-4 mt-6 pt-5 border-t border-border">
          {[
            { label: "Predictions", value: data.total_predictions, icon: Zap,      color: "text-violet" },
            { label: "Win Rate",    value: `${data.win_rate}%`,     icon: Target,   color: data.win_rate >= 55 ? "text-green" : data.win_rate >= 45 ? "text-text" : "text-red" },
            { label: "Total PnL",   value: `${data.total_pnl >= 0 ? "+" : ""}$${Math.abs(data.total_pnl).toFixed(0)}`, icon: TrendingUp, color: data.total_pnl >= 0 ? "text-green" : "text-red" },
            { label: "Brier Score", value: `${data.brier_score}/100`, icon: Star,  color: data.brier_score >= 70 ? "text-green" : data.brier_score >= 50 ? "text-amber" : "text-red" },
            { label: "XP",          value: fmtCompact(data.xp),     icon: Trophy,  color: "text-amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
              <p className={cn("text-base font-bold tabular-nums", color)}>{value}</p>
              <p className="text-[11px] text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
              tab === t
                ? "bg-violet/10 text-violet"
                : "text-text-muted hover:text-text"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-3 gap-5">
          {/* PnL chart */}
          <div className="col-span-2 glass p-5">
            <p className="text-sm font-semibold text-text mb-1">Recent PnL (last 20 predictions)</p>
            <p className="text-xs text-text-muted mb-4">Running profit/loss per bet</p>
            {predChartData.length > 0 ? (
              <PulseAreaChart
                data={predChartData}
                xKey="index"
                series={[{ key: "pnl", color: data.total_pnl >= 0 ? "#10b981" : "#ef4444", label: "PnL ($)" }]}
                height={200}
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
                No predictions yet
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="glass p-5">
            <p className="text-sm font-semibold text-text mb-1">Favourite Categories</p>
            <p className="text-xs text-text-muted mb-2">By predictions placed</p>
            {categoryData.length > 0 ? (
              <PulseDonutChart data={categoryData} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">No data</div>
            )}
          </div>

          {/* Stats breakdown */}
          <div className="glass p-5">
            <p className="text-sm font-semibold text-text mb-4">Token Flow</p>
            <div className="space-y-3">
              {[
                { label: "Tokens Spent",  value: `$${fmtCompact(data.tokens_spent)}`,  color: "text-red" },
                { label: "Tokens Earned", value: `$${fmtCompact(data.tokens_earned)}`, color: "text-green" },
                { label: "Net PnL",       value: `${data.total_pnl >= 0 ? "+" : ""}$${data.total_pnl.toFixed(0)}`, color: data.total_pnl >= 0 ? "text-green" : "text-red" },
                { label: "Avg Confidence", value: `${data.avg_confidence}%`, color: "text-text" },
                { label: "W / L",          value: `${data.wins} / ${data.losses}`, color: "text-text" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className={cn("text-sm font-semibold tabular-nums", color)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account details */}
          <div className="col-span-2 glass p-5">
            <p className="text-sm font-semibold text-text mb-4">Account Details</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: "User ID",          value: `#${data.id}` },
                { label: "Signup Date",      value: fmtDate(data.signup_date) },
                { label: "XP",               value: fmtCompact(data.xp) },
                { label: "Level",            value: data.level },
                { label: "Current Streak",   value: `${data.current_streak}🔥` },
                { label: "Best Streak",      value: `${data.best_streak}🔥` },
                { label: "Balance",          value: `$${fmtCompact(data.balance)}` },
                { label: "Retention",        value: data.retention_status?.replace("_", " ") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className="text-xs font-medium text-text capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "predictions" && (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                {["Market", "Category", "Scenario", "Amount", "Entry %", "PnL", "Outcome", "Date"].map((h) => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.recent_predictions || []).map((p: any) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell max-w-[200px]">
                    <p className="text-text text-xs font-medium truncate">{p.event_title}</p>
                  </td>
                  <td className="table-cell">
                    <span
                      className="badge capitalize text-[10px]"
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
                  <td className="table-cell tabular-nums text-text">${p.amount.toFixed(0)}</td>
                  <td className="table-cell tabular-nums text-text-muted">{p.entry_probability.toFixed(0)}%</td>
                  <td className="table-cell tabular-nums">
                    {p.pnl !== null ? (
                      <span className={p.pnl >= 0 ? "text-green" : "text-red"}>
                        {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(0)}
                      </span>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className={cn("badge capitalize text-[10px]",
                      p.pnl === null ? "badge-amber" : p.pnl > 0 ? "badge-green" : "badge-red"
                    )}>
                      {p.pnl === null ? "pending" : p.pnl > 0 ? "win" : "loss"}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-text-muted tabular-nums">
                    {fmtDateTime(p.created_at)}
                  </td>
                </tr>
              ))}
              {(!data.recent_predictions || data.recent_predictions.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted text-sm">
                    No predictions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-text-muted border-t border-border">
            Showing last 20 predictions
          </p>
        </div>
      )}

      {tab === "sessions" && (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                {["Session ID", "Started", "Duration", "Landing", "Exit", "Device", "Predicted"].map((h) => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.sessions || []).map((s: any) => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-mono text-[10px] text-text-muted">{s.id.slice(0, 8)}…</td>
                  <td className="table-cell text-xs text-text-muted tabular-nums">{fmtDateTime(s.started_at)}</td>
                  <td className="table-cell tabular-nums">{fmtDuration(s.duration_seconds)}</td>
                  <td className="table-cell text-xs text-text-muted max-w-[120px] truncate">{s.landing_page || "—"}</td>
                  <td className="table-cell text-xs text-text-muted max-w-[120px] truncate">{s.exit_page || "—"}</td>
                  <td className="table-cell text-xs text-text-muted">{s.device || "—"}</td>
                  <td className="table-cell">
                    <span className={s.made_prediction ? "badge-green" : "text-text-muted text-xs"}>
                      {s.made_prediction ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.sessions || data.sessions.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted text-sm">
                    No sessions tracked yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-4">
          {/* Add note */}
          <div className="glass p-5 space-y-3">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-violet" />
              <p className="text-sm font-semibold text-text">Add Admin Note</p>
            </div>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Add a note about this user (visible to all admins)…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {addingNote ? "Saving…" : "Save Note"}
            </button>
          </div>

          {/* Existing notes */}
          <div className="space-y-2">
            {(data.notes || []).map((n: any) => (
              <div key={n.id} className="glass p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{n.admin}</span>
                  <span>{fmtDateTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-text">{n.note}</p>
              </div>
            ))}
            {(!data.notes || data.notes.length === 0) && (
              <div className="glass p-8 text-center text-text-muted text-sm">
                No notes yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
