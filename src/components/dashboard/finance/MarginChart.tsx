"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt } from "@/lib/helpers";

export default function MarginChart({ data }: { data: Metrics["marginByRegion"] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="region" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <Tooltip formatter={(v: number) => [fmt(v)]} />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" name="Dept Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="margin" name="Margin" radius={[4, 4, 0, 0]}>
          {data.map((r) => (
            <Cell key={r.region} fill={r.margin >= 0 ? "#10b981" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
