"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface PulseDonutChartProps {
  data: DonutItem[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-text-muted">{payload[0].name}</p>
      <p className="text-text font-medium">{payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

export default function PulseDonutChart({ data, height = 220 }: PulseDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((item, i) => (
            <Cell key={i} fill={item.color} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
