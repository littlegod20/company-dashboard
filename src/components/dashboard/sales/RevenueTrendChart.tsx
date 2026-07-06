"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import { dollarTip } from "@/lib/helpers";

export default function RevenueTrendChart({ data }: { data: Metrics["revenueTrend"] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <Tooltip formatter={dollarTip} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
