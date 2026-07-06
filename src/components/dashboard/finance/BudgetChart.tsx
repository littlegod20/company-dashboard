"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt } from "@/lib/helpers";

/** A target-vs-actual row enriched with the region's cost and margin */
export type BudgetRow = Metrics["targetVsActual"][number] & {
  cost: number;
  margin: number;
};

/** Actual revenue, target, and dept cost bars per region */
export default function BudgetChart({ data }: { data: BudgetRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="region" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <Tooltip formatter={(v: number) => [fmt(v)]} />
        <Legend />
        <Bar dataKey="actual" name="Actual Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="target" name="Revenue Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" name="Dept Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
