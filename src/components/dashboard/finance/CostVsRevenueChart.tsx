"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { fmt } from "@/lib/helpers";

export interface MonthlyCostRevenue {
  month: string;
  revenue: number;
  cost: number;
}

export default function CostVsRevenueChart({ data }: { data: MonthlyCostRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
        <Tooltip formatter={(v: number) => [fmt(v)]} />
        <Legend />
        <Bar dataKey="cost" name="Est. Cost" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <ReferenceLine y={0} stroke="#94a3b8" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
