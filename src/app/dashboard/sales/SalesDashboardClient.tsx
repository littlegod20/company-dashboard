"use client";

import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt, pct } from "@/lib/helpers";
import StatCard from "@/components/StatCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSection from "@/components/dashboard/DashboardSection";
import AttainmentChart from "@/components/dashboard/sales/AttainmentChart";
import AttainmentTable from "@/components/dashboard/sales/AttainmentTable";
import RevenueTrendChart from "@/components/dashboard/sales/RevenueTrendChart";
import TopRepsChart from "@/components/dashboard/sales/TopRepsChart";
import TopProductsChart from "@/components/dashboard/sales/TopProductsChart";

export default function SalesDashboardClient({ metrics }: { metrics: Metrics }) {
  const { revenueTrend, targetVsActual, topProducts, topReps, totalRevenue, rowCount } = metrics;

  const best = [...targetVsActual].sort((a, b) => b.attainmentPct - a.attainmentPct)[0];
  const overallAttainment =
    targetVsActual.reduce((s, r) => s + r.actual, 0) /
    (targetVsActual.reduce((s, r) => s + r.target, 0) || 1) * 100;

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Sales Dashboard"
        subtitle={`${rowCount} transactions · Performance vs targets by region and rep`}
      />

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

      <DashboardSection
        title="Revenue vs Target by Region"
        description="Actual revenue as a % of monthly revenue target — the team's primary KPI"
      >
        <AttainmentChart data={targetVsActual} />
        <AttainmentTable data={targetVsActual} />
      </DashboardSection>

      <DashboardSection title="Monthly Revenue Trend">
        <RevenueTrendChart data={revenueTrend} />
      </DashboardSection>

      <div className="grid md:grid-cols-2 gap-6">
        <DashboardSection title="Top Reps by Revenue" footnote="Color = region">
          <TopRepsChart data={topReps} />
        </DashboardSection>
        <DashboardSection title="Top Products by Revenue">
          <TopProductsChart data={topProducts} />
        </DashboardSection>
      </div>
    </div>
  );
}
