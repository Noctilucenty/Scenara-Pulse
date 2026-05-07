"use client";

import { useEffect, useState } from "react";
import { Users, Zap, BarChart3, TrendingUp, Activity, RefreshCw, Target } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import DateRangePicker from "@/components/DateRangePicker";
import PulseAreaChart from "@/components/charts/AreaChart";
import PulseBarChart from "@/components/charts/BarChart";
import PulseDonutChart from "@/components/charts/DonutChart";
import { getOverview } from "@/lib/api";
import { fmtCompact, fmtDuration, CATEGORY_COLORS } from "@/lib/utils";

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOverview(days)
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  const categoryData = (data?.categories || []).map((c: any) => ({
    label: c.category,
    value: c.count,
    color: CATEGORY_COLORS[c.category] || "#64748b",
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="text-sm text-text-muted mt-0.5">Scenara at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 text-xs text-green">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              {data.realtime_active} online now
            </div>
          )}
          <DateRangePicker value={days} onChange={setDays} />
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Users"       value={data?.total_users ?? 0}       icon={Users}       color="violet"  loading={loading} />
        <MetricCard label="New Today"         value={data?.new_users_today ?? 0}   icon={TrendingUp}  color="blue"    loading={loading} />
        <MetricCard label="Daily Active"      value={data?.dau ?? 0}               icon={Activity}    color="green"   loading={loading} />
        <MetricCard label="Token Volume"       value={data?.total_volume ?? 0}      icon={TrendingUp}  color="amber"   loading={loading} sub="tokens staked" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Predictions" value={data?.total_predictions ?? 0} icon={Zap}         color="violet"  loading={loading} />
        <MetricCard label="Total Markets"     value={data?.total_markets ?? 0}     icon={BarChart3}   color="blue"    loading={loading} />
        <MetricCard label="Signup→Prediction" value={data?.conversion_rate ?? 0}   icon={Target}      color="green"   format="percent" loading={loading} sub="conversion rate" />
        <MetricCard label="Avg Session"       value={fmtDuration(data?.avg_session_seconds ?? 0)} icon={RefreshCw} color="amber" format="raw" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* User growth */}
        <div className="col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-text">User Growth</p>
              <p className="text-xs text-text-muted">Signups per day</p>
            </div>
            <span className="badge-violet">{fmtCompact(data?.new_users_month ?? 0)} this month</span>
          </div>
          {data?.growth_chart?.length > 0 ? (
            <PulseAreaChart
              data={data.growth_chart}
              xKey="date"
              series={[{ key: "signups", color: "#8b5cf6", label: "Signups" }]}
              height={220}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Category distribution */}
        <div className="glass p-5">
          <div className="mb-2">
            <p className="text-sm font-semibold text-text">Market Categories</p>
            <p className="text-xs text-text-muted">By total markets</p>
          </div>
          {categoryData.length > 0 ? (
            <PulseDonutChart data={categoryData} height={220} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Prediction volume chart */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-text">Prediction Activity</p>
            <p className="text-xs text-text-muted">Predictions placed per day</p>
          </div>
          <span className="badge-blue">{fmtCompact(data?.total_predictions ?? 0)} total</span>
        </div>
        {data?.prediction_chart?.length > 0 ? (
          <PulseBarChart
            data={data.prediction_chart}
            xKey="date"
            yKey="predictions"
            color="#3b82f6"
            height={200}
          />
        ) : (
          <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">No data yet</div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-5 space-y-4">
          <p className="text-sm font-semibold text-text">Engagement</p>
          <div className="space-y-3">
            {[
              { label: "Weekly Active Users",  value: fmtCompact(data?.wau ?? 0) },
              { label: "Monthly Active Users", value: fmtCompact(data?.mau ?? 0) },
              { label: "Returning User Rate",  value: `${data?.returning_rate ?? 0}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{label}</span>
                <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <p className="text-sm font-semibold text-text">Growth</p>
          <div className="space-y-3">
            {[
              { label: "New Users (7d)", value: fmtCompact(data?.new_users_week ?? 0) },
              { label: "New Users (30d)", value: fmtCompact(data?.new_users_month ?? 0) },
              { label: "With Predictions", value: fmtCompact(data?.users_with_predictions ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{label}</span>
                <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <p className="text-sm font-semibold text-text">Markets</p>
          <div className="space-y-3">
            {[
              { label: "Total Markets",     value: fmtCompact(data?.total_markets ?? 0) },
              { label: "Open Now",          value: fmtCompact(data?.open_markets ?? 0) },
              { label: "Users Online Now",  value: fmtCompact(data?.realtime_active ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{label}</span>
                <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
