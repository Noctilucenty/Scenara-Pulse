"use client";

import { useEffect, useState } from "react";
import { getFunnel } from "@/lib/api";
import FunnelViz from "@/components/FunnelViz";
import { GitFork, TrendingUp } from "lucide-react";
import { fmtCompact } from "@/lib/utils";

export default function FunnelsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFunnel().then(setData).finally(() => setLoading(false));
  }, []);

  const steps = data?.steps || [];
  const worstDrop = steps.reduce(
    (worst: any, step: any) => (!worst || step.drop_off > worst.drop_off ? step : worst),
    null
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Funnel Analytics</h1>
        <p className="text-sm text-text-muted">Conversion through the user journey</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-text">User Acquisition Funnel</p>
              <p className="text-xs text-text-muted mt-0.5">
                {data ? `Starting from ${fmtCompact(data.total_top)} users` : "Loading…"}
              </p>
            </div>
            <GitFork className="w-4 h-4 text-text-muted" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" style={{ width: `${100 - i * 12}%` }} />
              ))}
            </div>
          ) : steps.length > 0 ? (
            <FunnelViz steps={steps} total_top={data.total_top} />
          ) : (
            <div className="py-12 text-center text-text-muted text-sm">No funnel data yet</div>
          )}
        </div>

        <div className="space-y-4">
          {/* Conversion summary */}
          <div className="glass p-5">
            <p className="text-sm font-semibold text-text mb-4">Conversion Summary</p>
            {steps.slice(1).map((step: any) => (
              <div key={step.step} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-xs text-text-muted truncate pr-2">{step.step}</span>
                <span className={`text-xs font-semibold tabular-nums ${step.conversion_from_prev >= 60 ? "text-green" : step.conversion_from_prev >= 30 ? "text-amber" : "text-red"}`}>
                  {step.conversion_from_prev}%
                </span>
              </div>
            ))}
          </div>

          {/* Biggest opportunity */}
          {worstDrop && worstDrop.drop_off > 0 && (
            <div className="glass p-5 border-red/20 bg-red/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red" />
                <p className="text-sm font-semibold text-text">Biggest Drop-off</p>
              </div>
              <p className="text-text text-sm">{worstDrop.step}</p>
              <p className="text-red text-xl font-bold mt-1">{worstDrop.drop_off}% drop</p>
              <p className="text-text-muted text-xs mt-2">
                This is where most users disengage. Focus your UX improvements here first.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
