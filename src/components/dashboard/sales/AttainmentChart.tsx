"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { pct } from "@/lib/helpers";

/** Horizontal bar chart of attainment % per region, colored by threshold */
export default function AttainmentChart({ data }: { data: Metrics["targetVsActual"] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" barSize={28}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => v + "%"} domain={[0, "auto"]} />
        <YAxis type="category" dataKey="region" width={130} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => [pct(v), "Attainment"]} />
        <Bar dataKey="attainmentPct" name="Attainment %" radius={[0, 4, 4, 0]}>
          {data.map((r) => (
            <Cell
              key={r.region}
              fill={r.attainmentPct >= 100 ? "#10b981" : r.attainmentPct >= 75 ? "#f59e0b" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
