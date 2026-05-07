"use client";

import { useEffect, useState, useCallback } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { getRealtime } from "@/lib/api";
import RealtimeFeed from "@/components/RealtimeFeed";

export default function RealtimePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(() => {
    getRealtime().then((d) => {
      setData(d);
      setLastUpdated(new Date());
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Real-Time Feed</h1>
            <span className="flex items-center gap-1 text-xs text-green">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Activity from the last hour · auto-refreshes every 8s
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button onClick={fetchData} className="btn-ghost flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Active users banner */}
      <div className="glass-hover p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center">
          <Radio className="w-5 h-5 text-green" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text tabular-nums">{data?.active_now ?? 0}</p>
          <p className="text-xs text-text-muted">users active in the last 10 minutes</p>
        </div>
        <div className="ml-auto flex gap-6 text-center">
          <div>
            <p className="text-lg font-bold text-text tabular-nums">{data?.recent_predictions_count ?? 0}</p>
            <p className="text-xs text-text-muted">predictions (1h)</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text tabular-nums">{data?.recent_signups_count ?? 0}</p>
            <p className="text-xs text-text-muted">new signups (24h)</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="glass overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <p className="text-sm font-medium text-text">Activity Stream</p>
        </div>
        {loading && !data ? (
          <div className="space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-surface animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface rounded animate-pulse w-48" />
                  <div className="h-2.5 bg-surface rounded animate-pulse w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <RealtimeFeed items={data?.feed || []} />
          </div>
        )}
      </div>
    </div>
  );
}
