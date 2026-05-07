"use client";

import { useEffect, useState } from "react";
import { getRetention } from "@/lib/api";
import CohortTable from "@/components/CohortTable";
import MetricCard from "@/components/MetricCard";
import { RefreshCw, TrendingDown, UserX } from "lucide-react";

export default function RetentionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetention().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Retention</h1>
        <p className="text-sm text-text-muted">Cohort analysis and user return rates</p>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Day 1 Retention"  value={data?.day1_retention ?? 0}  icon={RefreshCw}    color="green"  format="percent" loading={loading} />
        <MetricCard label="Day 7 Retention"  value={data?.day7_retention ?? 0}  icon={RefreshCw}    color="blue"   format="percent" loading={loading} />
        <MetricCard label="Day 30 Retention" value={data?.day30_retention ?? 0} icon={RefreshCw}    color="violet" format="percent" loading={loading} />
        <MetricCard label="Churned Users"    value={data?.churned_users ?? 0}   icon={UserX}        color="red"    loading={loading} sub="no activity 30+ days" />
      </div>

      {/* Retention interpretation */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Day 1", value: data?.day1_retention ?? 0,
            benchmark: 40, tip: "Benchmark: 40%+ is good for prediction apps",
          },
          {
            label: "Day 7", value: data?.day7_retention ?? 0,
            benchmark: 20, tip: "Benchmark: 20%+ shows strong early habit formation",
          },
          {
            label: "Day 30", value: data?.day30_retention ?? 0,
            benchmark: 10, tip: "Benchmark: 10%+ indicates loyal core users",
          },
        ].map(({ label, value, benchmark, tip }) => {
          const good = value >= benchmark;
          return (
            <div key={label} className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text">{label} Retention</p>
                <span className={good ? "badge-green" : "badge-amber"}>
                  {good ? "On track" : "Below benchmark"}
                </span>
              </div>
              <p className="text-3xl font-bold text-text tabular-nums mb-1">{value}%</p>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(value, 100)}%`,
                    background: good ? "#10b981" : "#f59e0b",
                  }}
                />
              </div>
              <p className="text-[11px] text-text-muted mt-2">{tip}</p>
            </div>
          );
        })}
      </div>

      {/* Cohort table */}
      <div className="glass p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-text">Cohort Retention Table</p>
          <p className="text-xs text-text-muted mt-0.5">
            Users grouped by signup week — % who returned each subsequent week
          </p>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-surface rounded animate-pulse" />
            ))}
          </div>
        ) : data?.cohort_table?.length > 0 ? (
          <CohortTable rows={data.cohort_table} />
        ) : (
          <div className="py-12 text-center">
            <TrendingDown className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">Not enough data yet to build cohort table.</p>
            <p className="text-xs text-text-faint mt-1">Needs at least 2 weeks of user activity.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass p-4">
        <p className="section-label mb-3">Color Legend</p>
        <div className="flex items-center gap-6 text-xs text-text-muted">
          {[
            { color: "rgba(16,185,129,0.8)",  label: "60%+ retained (excellent)" },
            { color: "rgba(16,185,129,0.5)",  label: "40–60% retained (good)" },
            { color: "rgba(245,158,11,0.5)",  label: "25–40% retained (average)" },
            { color: "rgba(239,68,68,0.4)",   label: "10–25% retained (at risk)" },
            { color: "rgba(239,68,68,0.2)",   label: "<10% retained (churned)" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
