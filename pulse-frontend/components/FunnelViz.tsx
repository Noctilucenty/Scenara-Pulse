"use client";

import { ChevronRight, TrendingDown } from "lucide-react";
import { fmtCompact } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FunnelStep {
  step: string;
  count: number;
  conversion_from_prev: number;
  drop_off: number;
  icon: string;
}

const ICONS: Record<string, string> = {
  "globe": "🌐",
  "user-plus": "👤",
  "eye": "👁",
  "zap": "⚡",
  "trending-up": "📈",
  "repeat": "🔄",
};

export default function FunnelViz({ steps, total_top }: { steps: FunnelStep[]; total_top: number }) {
  const max = steps[0]?.count || 1;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = (step.count / max) * 100;
        const isLargestDrop = step.drop_off > 40;

        return (
          <div key={step.step} className="space-y-1">
            <div className="flex items-center gap-3">
              {/* Step number */}
              <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] text-text-muted shrink-0">
                {i + 1}
              </div>

              {/* Bar */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text flex items-center gap-1.5">
                    <span>{ICONS[step.icon] || "•"}</span>
                    {step.step}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-text font-semibold tabular-nums">
                      {fmtCompact(step.count)}
                    </span>
                    {i > 0 && (
                      <span className={cn(
                        "font-medium tabular-nums",
                        isLargestDrop ? "text-red" : step.conversion_from_prev > 60 ? "text-green" : "text-amber"
                      )}>
                        {step.conversion_from_prev.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-6 bg-surface rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      background: i === 0
                        ? "linear-gradient(90deg, #8b5cf6, #3b82f6)"
                        : `rgba(139, 92, 246, ${0.8 - i * 0.1})`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Drop-off indicator between steps */}
            {i < steps.length - 1 && steps[i + 1].drop_off > 0 && (
              <div className="flex items-center gap-2 pl-9">
                <TrendingDown className={cn(
                  "w-3 h-3",
                  steps[i + 1].drop_off > 40 ? "text-red" : "text-text-muted"
                )} />
                <span className={cn(
                  "text-[10px]",
                  steps[i + 1].drop_off > 40 ? "text-red" : "text-text-muted"
                )}>
                  {fmtCompact(steps[i].count - steps[i + 1].count)} dropped
                  {steps[i + 1].drop_off > 40 && " — biggest drop-off ⚠️"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
