"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Users, BarChart3, Trophy,
  CheckCircle, Clock, XCircle, AlertCircle,
} from "lucide-react";
import { getMarketDetail } from "@/lib/api";
import {
  fmtDate, fmtDateTime, fmtCompact, cn, CATEGORY_COLORS,
} from "@/lib/utils";
import PulseAreaChart from "@/components/charts/AreaChart";

const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  open:     { label: "Open",     icon: Clock,         cls: "badge-green"  },
  closed:   { label: "Closed",   icon: XCircle,       cls: "badge"        },
  resolved: { label: "Resolved", icon: CheckCircle,   cls: "badge-violet" },
  pending:  { label: "Pending",  icon: AlertCircle,   cls: "badge-amber"  },
};

function StatCard({
  icon: Icon, label, value, sub, color = "violet",
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color?: "violet" | "blue" | "green" | "amber";
}) {
  const colorMap = {
    violet: "text-violet bg-violet/10 shadow-violet/10",
    blue:   "text-blue   bg-blue/10   shadow-blue/10",
    green:  "text-green  bg-green/10  shadow-green/10",
    amber:  "text-amber  bg-amber/10  shadow-amber/10",
  };
  return (
    <div className="metric-card flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0", colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-text-muted text-xs mb-0.5">{label}</p>
        <p className="text-text font-semibold text-lg leading-none">{value}</p>
        {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getMarketDetail(Number(id))
      .then((d) => { if (!d || !d.id) setError(true); else setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Build chart series — one per scenario
  const { chartData, chartSeries } = useMemo(() => {
    if (!data?.probability_history?.length) return { chartData: [], chartSeries: [] };

    const scenarios = [...new Set<string>(data.probability_history.map((h: any) => h.scenario))];
    const byTime: Record<string, Record<string, number>> = {};

    for (const h of data.probability_history) {
      const label = fmtDateTime(h.recorded_at);
      if (!byTime[label]) byTime[label] = {};
      byTime[label][h.scenario] = Math.round(h.probability * 100);
    }

    const SCENARIO_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

    return {
      chartData: Object.entries(byTime).map(([time, vals]) => ({ time, ...vals })),
      chartSeries: scenarios.map((s, i) => ({
        key: s,
        label: s,
        color: SCENARIO_COLORS[i % SCENARIO_COLORS.length],
      })),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-surface rounded-lg" />
        <div className="h-28 bg-surface rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl" />)}
        </div>
        <div className="h-72 bg-surface rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red/10 flex items-center justify-center">
          <XCircle className="w-7 h-7 text-red" />
        </div>
        <p className="text-text font-medium">Market not found</p>
        <Link href="/dashboard/markets" className="btn-ghost text-sm">
          ← Back to Markets
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[data.status] ?? STATUS_CFG.pending;
  const StatusIcon = statusCfg.icon;
  const catColor = CATEGORY_COLORS[data.category] ?? "#8b5cf6";
  const uniqueBettors = data.top_predictors?.length ?? 0;
  const winner = data.scenarios?.find((s: any) => s.is_winner);

  return (
    <div className="flex flex-col gap-6">
      {/* Back nav */}
      <div>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Markets
        </Link>
      </div>

      {/* Market header */}
      <div className="card p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="badge text-xs font-medium px-2.5 py-1 rounded-lg capitalize"
              style={{ color: catColor, background: `${catColor}18`, borderColor: `${catColor}30` }}
            >
              {data.category}
            </span>
            <span className={cn("badge flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg", statusCfg.cls)}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </span>
            {winner && (
              <span className="badge badge-green flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg">
                <Trophy className="w-3 h-3" />
                {winner.title}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-text leading-snug max-w-2xl">
            {data.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>Created {fmtDate(data.created_at)}</span>
            {data.closes_at && (
              <>
                <span className="text-border">·</span>
                <span>Closes {fmtDate(data.closes_at)}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-text">{fmtCompact(data.total_volume)}</p>
          <p className="text-xs text-text-muted mt-0.5">tokens staked</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Volume"
          value={fmtCompact(data.total_volume)}
          sub="tokens staked"
          color="violet"
        />
        <StatCard
          icon={BarChart3}
          label="Predictions"
          value={fmtCompact(data.total_predictions)}
          sub="total bets placed"
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Unique Bettors"
          value={fmtCompact(uniqueBettors)}
          sub="top 10 shown below"
          color="green"
        />
        <StatCard
          icon={Trophy}
          label="Scenarios"
          value={String(data.scenarios?.length ?? 0)}
          sub={winner ? `Winner: ${winner.title}` : "No winner yet"}
          color="amber"
        />
      </div>

      {/* Probability chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-text mb-4">Probability History</h2>
          <PulseAreaChart
            data={chartData}
            xKey="time"
            series={chartSeries}
            height={280}
            formatY={(v) => `${v}%`}
          />
        </div>
      )}

      {/* Scenarios breakdown */}
      {data.scenarios?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-text mb-4">Scenario Breakdown</h2>
          <div className="flex flex-col gap-3">
            {data.scenarios
              .sort((a: any, b: any) => b.volume - a.volume)
              .map((s: any, i: number) => {
                const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
                const color = COLORS[i % COLORS.length];
                const prob = Math.round(s.probability * 100);
                return (
                  <div key={s.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-text font-medium">{s.title}</span>
                        {s.is_winner && (
                          <Trophy className="w-3.5 h-3.5 text-amber" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>{fmtCompact(s.volume)} tokens</span>
                        <span>{s.bet_count} bets</span>
                        <span className="text-text font-medium w-10 text-right">{prob}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${s.volume_pct}%`, background: color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Top predictors */}
      {data.top_predictors?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-text mb-4">Top Predictors</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header text-left w-8">#</th>
                <th className="table-header text-left">User</th>
                <th className="table-header text-right">Predictions</th>
                <th className="table-header text-right">Staked</th>
                <th className="table-header text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {data.top_predictors.map((t: any, i: number) => {
                const pnlPos = t.total_pnl >= 0;
                return (
                  <tr key={t.user_id} className="table-row group">
                    <td className="table-cell">
                      <span className={cn(
                        "text-xs font-bold w-5 h-5 rounded flex items-center justify-center",
                        i === 0 ? "bg-amber/20 text-amber" :
                        i === 1 ? "bg-text-muted/10 text-text-muted" :
                        i === 2 ? "bg-amber/10 text-amber/60" : "text-text-faint"
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/dashboard/users/${t.user_id}`}
                        className="text-text hover:text-violet transition-colors font-medium"
                      >
                        {t.display_name}
                      </Link>
                    </td>
                    <td className="table-cell text-right text-text-muted">
                      {t.pred_count}
                    </td>
                    <td className="table-cell text-right text-text">
                      {fmtCompact(t.total_staked)}
                    </td>
                    <td className="table-cell text-right">
                      <span className={cn("font-medium", pnlPos ? "text-green" : "text-red")}>
                        {pnlPos ? "+" : ""}{fmtCompact(t.total_pnl)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.top_predictors?.length === 0 && (
        <div className="card p-10 flex flex-col items-center gap-3">
          <Users className="w-8 h-8 text-text-faint" />
          <p className="text-text-muted text-sm">No predictions yet on this market</p>
        </div>
      )}
    </div>
  );
}
