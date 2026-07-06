import { prisma } from "@/lib/db";
import { combine } from "@/lib/pipeline/combine";
import { computeAllMetrics } from "@/lib/pipeline/metrics";
import type { CleanSalesRow, CleanHRRow, CleanFinanceRow } from "@/lib/pipeline/clean";
import EmptyState from "@/components/EmptyState";
import SalesDashboardClient from "./SalesDashboardClient";

export const dynamic = "force-dynamic"; // always re-fetch from DB on each page load

async function getMetrics() {
  const [salesRows, hrRows, financeRows] = await Promise.all([
    prisma.salesTransaction.findMany({ orderBy: { date: "asc" } }),
    prisma.employee.findMany(),
    prisma.financeTarget.findMany(),
  ]);

  if (salesRows.length === 0) return null;

  const sales: CleanSalesRow[] = salesRows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    repName: r.repName,
    region: r.region,
    product: r.product,
    amount: r.amount,
    customerName: r.customerName,
  }));

  const hr: CleanHRRow[] = hrRows.map((r) => ({
    repName: r.repName,
    region: r.region,
    department: r.department,
    hireDate: r.hireDate.toISOString().slice(0, 10),
    monthlyTarget: r.monthlyTarget,
  }));

  const finance: CleanFinanceRow[] = financeRows.map((r) => ({
    region: r.region,
    month: r.month.toISOString().slice(0, 7),
    revenueTarget: r.revenueTarget,
    departmentCost: r.departmentCost,
  }));

  const enriched = combine(sales, hr, finance);
  return computeAllMetrics(enriched);
}

export default async function SalesDashboardPage() {
  const metrics = await getMetrics();
  if (!metrics) return <EmptyState />;
  return <SalesDashboardClient metrics={metrics} />;
}
