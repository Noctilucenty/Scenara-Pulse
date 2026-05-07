"use client";

import { Zap, UserPlus, CheckCircle, TrendingUp } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";

interface FeedItem {
  type: string;
  icon: string;
  text: string;
  subtext: string;
  timestamp: string;
  color: "violet" | "blue" | "green" | "amber";
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "zap":          <Zap className="w-3.5 h-3.5" />,
  "user-plus":    <UserPlus className="w-3.5 h-3.5" />,
  "check-circle": <CheckCircle className="w-3.5 h-3.5" />,
  "trending-up":  <TrendingUp className="w-3.5 h-3.5" />,
};

const COLOR_MAP = {
  violet: { bg: "bg-violet/10", text: "text-violet" },
  blue:   { bg: "bg-blue/10",   text: "text-blue" },
  green:  { bg: "bg-green/10",  text: "text-green" },
  amber:  { bg: "bg-amber/10",  text: "text-amber" },
};

export default function RealtimeFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mb-3">
          <Zap className="w-4 h-4" />
        </div>
        <p className="text-sm">Waiting for activity…</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const c = COLOR_MAP[item.color] || COLOR_MAP.violet;
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 hover:bg-surface/60 rounded-lg transition-colors duration-100 animate-fade-in"
          >
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", c.bg, c.text)}>
              {ICON_MAP[item.icon] || <Zap className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text leading-snug">{item.text}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.subtext}</p>
            </div>
            <span className="text-[10px] text-text-muted shrink-0 mt-0.5 tabular-nums">
              {timeAgo(item.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
