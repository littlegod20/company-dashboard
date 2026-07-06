/**
 * GET /api/metrics
 *
 * Reads the stored cleaned data from Postgres and recomputes metrics.
 * We store the raw cleaned rows in the DB (not pre-aggregated metrics)
 * so that the metric logic in metrics.ts remains the single source of truth.
 *
 * Returns { hasData: false } if no data has been uploaded yet.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { combine } from "@/lib/pipeline/combine";
import { computeAllMetrics } from "@/lib/pipeline/metrics";
import type { CleanSalesRow, CleanHRRow, CleanFinanceRow } from "@/lib/pipeline/clean";

export async function GET() {
  try {
    const [salesRows, hrRows, financeRows] = await Promise.all([
      prisma.salesTransaction.findMany({ orderBy: { date: "asc" } }),
      prisma.employee.findMany(),
      prisma.financeTarget.findMany(),
    ]);

    if (salesRows.length === 0) {
      return NextResponse.json({ hasData: false });
    }

    // Re-shape DB rows back into the shape combine() expects
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
      // month stored as first-of-month Date → back to "YYYY-MM"
      month: r.month.toISOString().slice(0, 7),
      revenueTarget: r.revenueTarget,
      departmentCost: r.departmentCost,
    }));

    const enriched = combine(sales, hr, finance);
    const metrics = computeAllMetrics(enriched);

    return NextResponse.json({ hasData: true, metrics });
  } catch (err) {
    console.error("[api/metrics] Error:", err);
    return NextResponse.json(
      { error: "Failed to load metrics", detail: String(err) },
      { status: 500 }
    );
  }
}
