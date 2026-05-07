"use client";

import { retentionColor, fmtDate } from "@/lib/utils";

interface CohortRow {
  signup_week: string;
  cohort_size: number;
  weeks: Record<number, number>;
}

export default function CohortTable({ rows }: { rows: CohortRow[] }) {
  const maxWeek = Math.max(...rows.flatMap((r) => Object.keys(r.weeks).map(Number)));
  const cols = Array.from({ length: maxWeek + 1 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="table-header text-left">Cohort</th>
            <th className="table-header text-right">Size</th>
            {cols.map((w) => (
              <th key={w} className="table-header text-center">
                {w === 0 ? "Week 0" : `+${w}w`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.signup_week} className="border-b border-border/40">
              <td className="table-cell text-text-muted font-mono">
                {fmtDate(row.signup_week)}
              </td>
              <td className="table-cell text-right text-text-muted">{row.cohort_size}</td>
              {cols.map((w) => {
                const pct = row.weeks[w];
                return (
                  <td key={w} className="table-cell text-center px-1">
                    {pct !== undefined ? (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-medium tabular-nums"
                        style={{
                          background: retentionColor(pct),
                          color: pct > 20 ? "#fff" : "#94a3b8",
                        }}
                      >
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
