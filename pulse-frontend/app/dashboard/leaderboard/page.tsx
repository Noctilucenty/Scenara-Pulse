"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getLeaderboard } from "@/lib/api";
import { fmtCompact, cn } from "@/lib/utils";

const SORT_OPTS = [
  { key: "pnl",         label: "By PnL" },
  { key: "accuracy",    label: "By Win Rate" },
  { key: "predictions", label: "By Predictions" },
  { key: "streak",      label: "By Streak" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function getBadges(user: any): string[] {
  const badges: string[] = [];
  if (user.best_streak >= 10) badges.push("🔥 Streak King");
  if (user.win_rate >= 65)    badges.push("🎯 Sharp");
  if (user.total_predictions >= 50) badges.push("⚡ Active");
  if (user.brier_score >= 70) badges.push("🧠 Calibrated");
  if (user.total_pnl >= 1000) badges.push("💰 Whale");
  return badges;
}

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState("pnl");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard({ sort_by: sortBy, limit: 100 }).then(setData).finally(() => setLoading(false));
  }, [sortBy]);

  const users = data?.leaderboard || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="text-sm text-text-muted">Top performers on Scenara</p>
        </div>
        <div className="flex gap-1.5">
          {SORT_OPTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                sortBy === s.key
                  ? "bg-violet/15 text-violet border-violet/20"
                  : "border-border bg-surface text-text-muted hover:text-text"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && users.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[users[1], users[0], users[2]].map((u: any, i: number) => {
            const actualRank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const sizes = ["h-24", "h-32", "h-20"];
            const badges = getBadges(u);
            return (
              <div key={u.user_id} className={cn("glass p-5 flex flex-col items-center text-center", actualRank === 1 && "gradient-border")}>
                <span className="text-2xl mb-2">{MEDALS[actualRank - 1]}</span>
                <div className="w-10 h-10 rounded-full bg-gradient-pulse flex items-center justify-center text-white font-bold text-sm mb-2">
                  {(u.display_name || u.email || "?")[0].toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-text truncate max-w-full">
                  {u.display_name || u.email}
                </p>
                <p className="text-xs text-text-muted">Lv {u.level}</p>
                <p className={cn("text-base font-bold mt-2 tabular-nums", u.total_pnl >= 0 ? "text-green" : "text-red")}>
                  {u.total_pnl >= 0 ? "+" : ""}${fmtCompact(Math.abs(u.total_pnl))}
                </p>
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                    {badges.slice(0, 2).map((b) => (
                      <span key={b} className="text-[10px] badge bg-surface border border-border text-text-muted">{b}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="glass overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {["Rank", "User", "Level", "Predictions", "Win Rate", "Brier Score", "PnL", "Best Streak", "Badges"].map((h) => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-3 bg-surface rounded animate-pulse w-12" /></td>
                    ))}
                  </tr>
                ))
              : users.map((u: any) => {
                  const badges = getBadges(u);
                  return (
                    <tr key={u.user_id} className="table-row">
                      <td className="table-cell">
                        <span className={cn("text-sm font-bold tabular-nums", u.rank <= 3 ? "text-amber" : "text-text-muted")}>
                          {u.rank <= 3 ? MEDALS[u.rank - 1] : `#${u.rank}`}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet/20 flex items-center justify-center text-[10px] text-violet font-bold shrink-0">
                            {(u.display_name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-text truncate max-w-[140px]">
                            {u.display_name || u.email}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell"><span className="badge-violet">Lv {u.level}</span></td>
                      <td className="table-cell tabular-nums text-text-muted">{u.total_predictions}</td>
                      <td className="table-cell">
                        <span className={u.win_rate >= 55 ? "text-green font-medium" : u.win_rate >= 45 ? "text-text" : "text-red"}>
                          {u.win_rate}%
                        </span>
                      </td>
                      <td className="table-cell tabular-nums text-text-muted">{u.brier_score.toFixed(1)}</td>
                      <td className="table-cell tabular-nums font-medium">
                        <span className={u.total_pnl >= 0 ? "text-green" : "text-red"}>
                          {u.total_pnl >= 0 ? "+" : ""}${fmtCompact(Math.abs(u.total_pnl))}
                        </span>
                      </td>
                      <td className="table-cell tabular-nums text-text-muted">{u.best_streak}🔥</td>
                      <td className="table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {badges.slice(0, 2).map((b) => (
                            <span key={b} className="badge bg-surface border border-border text-text-muted text-[10px]">{b}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <div className="py-12 text-center">
            <Trophy className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">No users yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
