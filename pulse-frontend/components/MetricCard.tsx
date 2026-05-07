"use client";

import { type LucideIcon } from "lucide-react";
import { cn, fmtCompact } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon?: LucideIcon;
  trend?: number;
  color?: "violet" | "blue" | "green" | "amber" | "red";
  format?: "number" | "currency" | "percent" | "raw";
  loading?: boolean;
}

const COLOR_MAP = {
  violet: { icon: "text-violet", glow: "from-violet/10", ring: "bg-violet/10" },
  blue:   { icon: "text-blue",   glow: "from-blue/10",   ring: "bg-blue/10" },
  green:  { icon: "text-green",  glow: "from-green/10",  ring: "bg-green/10" },
  amber:  { icon: "text-amber",  glow: "from-amber/10",  ring: "bg-amber/10" },
  red:    { icon: "text-red",    glow: "from-red/10",    ring: "bg-red/10" },
};

function formatValue(value: number | string, format: MetricCardProps["format"]): string {
  if (typeof value === "string") return value;
  if (format === "currency") return `$${fmtCompact(value)}`;
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "raw") return String(value);
  return fmtCompact(value);
}

export default function MetricCard({
  label, value, sub, icon: Icon, trend, color = "violet", format = "number", loading,
}: MetricCardProps) {
  const c = COLOR_MAP[color];

  if (loading) {
    return (
      <div className="metric-card">
        <div className="h-3 w-24 bg-surface rounded animate-pulse" />
        <div className="h-8 w-16 bg-surface rounded animate-pulse mt-2" />
        <div className="h-3 w-20 bg-surface rounded animate-pulse mt-1" />
      </div>
    );
  }

  return (
    <div className={cn("metric-card relative overflow-hidden group")}>
      {/* Background glow */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl", c.glow, "to-transparent")} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        {Icon && (
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", c.ring)}>
            <Icon className={cn("w-3.5 h-3.5", c.icon)} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold text-text tabular-nums">
          {formatValue(value, format)}
        </span>
        {trend !== undefined && (
          <span className={cn("text-xs font-medium mb-0.5 tabular-nums", trend >= 0 ? "text-green" : "text-red")}>
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Sub label */}
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
