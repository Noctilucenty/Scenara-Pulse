"use client";

import { Calendar } from "lucide-react";

const RANGES = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y",  days: 365 },
];

interface DateRangePickerProps {
  value: number;
  onChange: (days: number) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
      <Calendar className="w-3.5 h-3.5 text-text-muted ml-2" />
      {RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => onChange(r.days)}
          className={
            value === r.days
              ? "px-3 py-1.5 rounded-md text-xs font-medium bg-violet/15 text-violet"
              : "px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-text transition-colors"
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
