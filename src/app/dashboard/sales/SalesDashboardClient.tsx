"use client";

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import StatCard from "@/components/StatCard";

const REGION_COLORS: Record<string, string> = {
  "West Africa":     "#3b82f6",
  "East Africa":     "#10b981",
  "North Africa":    "#f59e0b",
  "Southern Africa": "#8b5cf6",
};
const FALLBACK_COLOR = "#64748b";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

// Custom tooltip formatter
const dollarTip = (value: number) => [fmt(value), "Revenue"];

export default function SalesDashboardClient({ metrics }: { metrics: Metrics }) {
  const { revenueTrend, targetVsActual, topProducts, topReps, totalRevenue, rowCount } = metrics;

  // Best-attaining region for a quick stat
  const best = [...targetVsActual].sort((a, b) => b.attainmentPct - a.attainmentPct)[0];
  const overallAttainment =
    targetVsActual.reduce((s, r) => s + r.actual, 0) /
    (targetVsActual.reduce((s, r) => s + r.target, 0) || 1) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales Dashboard</h1>
        <p className="text-slate-600 text-sm mt-1">
          {rowCount} transactions · Performance vs targets by region and rep
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} accent="blue" />
        <StatCard
          label="Overall Attainment"
          value={pct(overallAttainment)}
          sub="actual vs target"
          accent={overallAttainment >= 100 ? "green" : "amber"}
        />
        <StatCard
          label="Best Region"
          value={best?.region ?? "—"}
          sub={best ? pct(best.attainmentPct) + " attainment" : undefined}
          accent="green"
        />
        <StatCard label="Transactions" value={rowCount.toLocaleString()} />
      </div>

      {/* === Target Attainment — HERO section for Sales === */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Revenue vs Target by Region
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Actual revenue as a % of monthly revenue target — the team&apos;s primary KPI
        </p>

        {/* Attainment % bar chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={targetVsActual} layout="vertical" barSize={28}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => v + "%"} domain={[0, "auto"]} />
            <YAxis type="category" dataKey="region" width={130} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [pct(v), "Attainment"]} />
            {/* Reference line at 100% */}
            <Bar dataKey="attainmentPct" name="Attainment %" radius={[0, 4, 4, 0]}>
              {targetVsActual.map((r) => (
                <Cell
                  key={r.region}
                  fill={r.attainmentPct >= 100 ? "#10b981" : r.attainmentPct >= 75 ? "#f59e0b" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Actual vs target table below the chart */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-600">
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium text-right">Actual</th>
                <th className="pb-2 font-medium text-right">Target</th>
                <th className="pb-2 font-medium text-right">Attainment</th>
              </tr>
            </thead>
            <tbody>
              {targetVsActual.map((r) => (
                <tr key={r.region} className="border-b border-slate-50">
                  <td className="py-1.5 font-medium">{r.region}</td>
                  <td className="py-1.5 text-right">{fmt(r.actual)}</td>
                  <td className="py-1.5 text-right text-slate-600">{fmt(r.target)}</td>
                  <td
                    className={`py-1.5 text-right font-semibold ${
                      r.attainmentPct >= 100 ? "text-green-700" : r.attainmentPct >= 75 ? "text-amber-700" : "text-red-700"
                    }`}
                  >
                    {pct(r.attainmentPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Revenue trend */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Monthly Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={revenueTrend}>
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
      </section>

      {/* Two columns: Top Reps + Top Products */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top reps */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Reps by Revenue</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topReps.slice(0, 8)} layout="vertical" barSize={20}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
              <YAxis type="category" dataKey="repName" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={dollarTip} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {topReps.slice(0, 8).map((r) => (
                  <Cell key={r.repName} fill={REGION_COLORS[r.region] ?? FALLBACK_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-600 mt-2">Color = region</p>
        </section>

        {/* Top products */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Products by Revenue</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProducts.slice(0, 8)} layout="vertical" barSize={20}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
              <YAxis type="category" dataKey="product" width={160} tick={{ fontSize: 11 }} />
              <Tooltip formatter={dollarTip} />
              <Bar dataKey="revenue" fill="#6366f1" name="Revenue" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
