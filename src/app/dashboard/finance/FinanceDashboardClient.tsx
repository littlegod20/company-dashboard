"use client";

import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt, pct } from "@/lib/helpers";
import StatCard from "@/components/StatCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSection from "@/components/dashboard/DashboardSection";
import MarginChart from "@/components/dashboard/finance/MarginChart";
import MarginTable from "@/components/dashboard/finance/MarginTable";
import MarginAlert from "@/components/dashboard/finance/MarginAlert";
import BudgetChart, { type BudgetRow } from "@/components/dashboard/finance/BudgetChart";
import BudgetTable from "@/components/dashboard/finance/BudgetTable";
import CostVsRevenueChart, { type MonthlyCostRevenue } from "@/components/dashboard/finance/CostVsRevenueChart";

export default function FinanceDashboardClient({ metrics }: { metrics: Metrics }) {
  const { revenueTrend, targetVsActual, marginByRegion, totalRevenue } = metrics;

  // Finance-specific aggregates
  const totalCost = marginByRegion.reduce((s, r) => s + r.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const totalTarget = targetVsActual.reduce((s, r) => s + r.target, 0);
  const overallAttainment = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;

  // Under-budget flag: highlight the worst-performing region if it's at a loss
  const worstMargin = [...marginByRegion].sort((a, b) => a.margin - b.margin)[0];

  // Distribute total cost proportionally to each month's revenue share.
  // Month-level cost data isn't stored yet — see README for the improvement note.
  const monthlyCostVsRevenue: MonthlyCostRevenue[] = revenueTrend.map((m) => ({
    month: m.month,
    revenue: m.revenue,
    cost: Math.round((m.revenue / totalRevenue) * totalCost),
  }));

  // Budget adherence: target vs actual with cost + margin overlay
  const budgetData: BudgetRow[] = targetVsActual.map((r) => {
    const margin = marginByRegion.find((m) => m.region === r.region);
    return { ...r, cost: margin?.cost ?? 0, margin: margin?.margin ?? 0 };
  });

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Finance Dashboard"
        subtitle="Profitability, budget adherence, and cost management by region"
      />

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

      <DashboardSection
        title="Margin by Region"
        description="Net margin = revenue − department operating cost. Negative margin means the region is running at a loss relative to its cost base."
      >
        <MarginChart data={marginByRegion} />
        <MarginTable data={marginByRegion} />
        {worstMargin && worstMargin.margin < 0 && <MarginAlert worst={worstMargin} />}
      </DashboardSection>

      <DashboardSection
        title="Budget Adherence by Region"
        description="Revenue target attainment paired with department cost — Finance judges not just whether targets were hit, but whether growth was cost-efficient."
      >
        <BudgetChart data={budgetData} />
        <BudgetTable data={budgetData} />
      </DashboardSection>

      <DashboardSection
        title="Monthly Revenue vs Cost Trend"
        description="Monthly revenue compared against estimated cost allocation. Positive gap = profitable month."
        footnote="Cost is estimated proportionally from total department costs. Month-level cost breakdown noted as a future data improvement."
      >
        <CostVsRevenueChart data={monthlyCostVsRevenue} />
      </DashboardSection>
    </div>
  );
}
