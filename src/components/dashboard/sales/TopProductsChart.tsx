"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { dollarTip } from "@/lib/helpers";

/** Top 8 products by revenue */
export default function TopProductsChart({ data }: { data: Metrics["topProducts"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.slice(0, 8)} layout="vertical" barSize={20}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <YAxis type="category" dataKey="product" width={160} tick={{ fontSize: 11 }} />
        <Tooltip formatter={dollarTip} />
        <Bar dataKey="revenue" fill="#6366f1" name="Revenue" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
