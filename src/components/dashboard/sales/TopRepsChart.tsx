"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { dollarTip } from "@/lib/helpers";

const REGION_COLORS: Record<string, string> = {
  "West Africa": "#3b82f6",
  "East Africa": "#10b981",
  "North Africa": "#f59e0b",
  "Southern Africa": "#8b5cf6",
};
const FALLBACK_COLOR = "#64748b";

export default function TopRepsChart({ data }: { data: Metrics["topReps"] }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top} layout="vertical" barSize={20}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <YAxis type="category" dataKey="repName" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={dollarTip} />
        <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
          {top.map((r) => (
            <Cell key={r.repName} fill={REGION_COLORS[r.region] ?? FALLBACK_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
