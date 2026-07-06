"use client";

import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { Metrics } from "@/lib/pipeline/metrics";
import StatCard from "@/components/StatCard";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function pct(n: number) {
  return n.toFixed(1) + "%";
}

export default function FinanceDashboardClient({ metrics }: { metrics: Metrics }) {
  const { revenueTrend, targetVsActual, marginByRegion, totalRevenue } = metrics;

  // Finance-specific aggregates
  const totalCost = marginByRegion.reduce((s, r) => s + r.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const totalTarget = targetVsActual.reduce((s, r) => s + r.target, 0);
  const overallAttainment = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;

  // Under-budget flag: Southern Africa has negative margin → highlight
  const worstMargin = [...marginByRegion].sort((a, b) => a.margin - b.margin)[0];

  // Combined monthly cost vs revenue (Finance cares about both together)
  // revenueTrend has revenue per month; we need monthly costs from financeRows
  // We approximate total monthly cost as uniform across regions (actual data is per region)
  // For a richer view, we could store monthly costs separately — noted as future improvement
  const monthlyCostVsRevenue = revenueTrend.map((m) => {
    // Sum cost from finance for this month (approximated from marginByRegion totals
    // split evenly across months — the real cost breakdown needs the enriched rows)
    // Since we only have aggregated margin data here, we use total cost / n months
    const nMonths = revenueTrend.length || 1;
    return {
      month: m.month,
      revenue: m.revenue,
      // Distribute total cost proportionally to revenue (best we can do without
      // month-level cost data in this component — see README for improvement note)
      cost: Math.round((m.revenue / totalRevenue) * totalCost),
    };
  });

  // Budget adherence: target vs actual with cost overlay
  const budgetData = targetVsActual.map((r) => {
    const margin = marginByRegion.find((m) => m.region === r.region);
    return {
      ...r,
      cost: margin?.cost ?? 0,
      margin: margin?.margin ?? 0,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="text-slate-600 text-sm mt-1">
          Profitability, budget adherence, and cost management by region
        </p>
      </div>

      {/* KPI strip — Finance framing: margin and cost, not just revenue */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} accent="blue" />
        <StatCard label="Total Dept Cost" value={fmt(totalCost)} accent="slate" />
        <StatCard
          label="Net Margin"
          value={fmt(totalMargin)}
          sub={pct(marginPct) + " margin"}
          accent={totalMargin >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Budget Attainment"
          value={pct(overallAttainment)}
          sub="revenue vs target"
          accent={overallAttainment >= 100 ? "green" : "amber"}
        />
      </div>

      {/* === Margin by region — HERO for Finance === */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Margin by Region
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Net margin = revenue − department operating cost. Negative margin
          means the region is running at a loss relative to its cost base.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={marginByRegion} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="region" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
            <Tooltip formatter={(v: number) => [fmt(v)]} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cost" name="Dept Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="margin" name="Margin" radius={[4, 4, 0, 0]}>
              {marginByRegion.map((r) => (
                <Cell key={r.region} fill={r.margin >= 0 ? "#10b981" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Margin table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-600">
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Dept Cost</th>
                <th className="pb-2 font-medium text-right">Margin</th>
                <th className="pb-2 font-medium text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {marginByRegion.map((r) => {
                const mp = r.revenue > 0 ? (r.margin / r.revenue) * 100 : 0;
                return (
                  <tr key={r.region} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium">{r.region}</td>
                    <td className="py-1.5 text-right">{fmt(r.revenue)}</td>
                    <td className="py-1.5 text-right text-slate-600">{fmt(r.cost)}</td>
                    <td className={`py-1.5 text-right font-semibold ${r.margin >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmt(r.margin)}
                    </td>
                    <td className={`py-1.5 text-right ${mp >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {pct(mp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {worstMargin && worstMargin.margin < 0 && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ⚠ <strong>{worstMargin.region}</strong> is operating at a loss ({fmt(worstMargin.margin)}).
            Department costs exceed revenue for this region.
          </div>
        )}
      </section>

      {/* Revenue vs Target + Cost context */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Budget Adherence by Region
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Revenue target attainment paired with department cost — Finance judges
          not just whether targets were hit, but whether growth was cost-efficient.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={budgetData} barCategoryGap="30%">
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

        {/* Attainment with cost efficiency */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-600">
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium text-right">Attainment</th>
                <th className="pb-2 font-medium text-right">Cost Ratio</th>
                <th className="pb-2 font-medium text-right">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.map((r) => {
                const costRatio = r.actual > 0 ? (r.cost / r.actual) * 100 : 0;
                const onTarget = r.attainmentPct >= 100;
                const efficient = costRatio < 60;
                const tag = onTarget && efficient ? "✓ On track"
                  : onTarget && !efficient ? "⚠ High cost"
                  : !onTarget && efficient ? "↓ Below target"
                  : "✕ Needs attention";
                const tagColor = onTarget && efficient ? "text-green-700"
                  : onTarget ? "text-amber-700"
                  : efficient ? "text-amber-700"
                  : "text-red-700";
                return (
                  <tr key={r.region} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium">{r.region}</td>
                    <td className={`py-1.5 text-right font-semibold ${onTarget ? "text-green-700" : "text-amber-700"}`}>
                      {pct(r.attainmentPct)}
                    </td>
                    <td className="py-1.5 text-right text-slate-600">{pct(costRatio)}</td>
                    <td className={`py-1.5 text-right font-medium ${tagColor}`}>{tag}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Monthly cost vs revenue trend */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Monthly Revenue vs Cost Trend
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Monthly revenue compared against estimated cost allocation. Positive
          gap = profitable month.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={monthlyCostVsRevenue}>
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
        <p className="text-xs text-slate-600 mt-2">
          Cost is estimated proportionally from total department costs. Month-level cost breakdown noted as a future data improvement.
        </p>
      </section>
    </div>
  );
}
