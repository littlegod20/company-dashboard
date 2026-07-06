/**
 * GET /api/metrics
 *
 * Optional query params:
 *   ?from=YYYY-MM   start month, inclusive (e.g. 2026-03)
 *   ?to=YYYY-MM     end month, inclusive   (e.g. 2026-05)
 *
 * Omit either param to use the full available range.
 * Also returns { dataRange } so the UI can build its date-picker bounds.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { combine } from "@/lib/pipeline/combine";
import { computeAllMetrics } from "@/lib/pipeline/metrics";
import type { CleanSalesRow, CleanHRRow, CleanFinanceRow } from "@/lib/pipeline/clean";

/** "YYYY-MM" → first moment of that month as a UTC Date */
function monthStart(ym: string): Date {
  return new Date(`${ym}-01T00:00:00.000Z`);
}

/** "YYYY-MM" → first moment of the *next* month (exclusive upper bound) */
function monthEnd(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return new Date(`${next}-01T00:00:00.000Z`);
}

/** Validate "YYYY-MM" format */
function isValidYearMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const fromParam = searchParams.get("from") ?? undefined;
    const toParam   = searchParams.get("to")   ?? undefined;

    // Validate params if provided
    if (fromParam && !isValidYearMonth(fromParam)) {
      return NextResponse.json({ error: "Invalid 'from' param — expected YYYY-MM" }, { status: 400 });
    }
    if (toParam && !isValidYearMonth(toParam)) {
      return NextResponse.json({ error: "Invalid 'to' param — expected YYYY-MM" }, { status: 400 });
    }

    // Always check the full sale count to determine hasData before applying filter
    const totalCount = await prisma.salesTransaction.count();
    if (totalCount === 0) {
      return NextResponse.json({ hasData: false });
    }

    // Build date filter for sales only — HR and Finance are reference tables
    const dateFilter =
      fromParam || toParam
        ? {
            date: {
              ...(fromParam ? { gte: monthStart(fromParam) } : {}),
              ...(toParam   ? { lt:  monthEnd(toParam)     } : {}),
            },
          }
        : {};

    const [salesRows, hrRows, financeRows, rangeAgg] = await Promise.all([
      prisma.salesTransaction.findMany({
        where: dateFilter,
        orderBy: { date: "asc" },
      }),
      prisma.employee.findMany(),
      prisma.financeTarget.findMany(),
      // Always compute the full data range (ignoring filters) so the picker
      // knows what months are available
      prisma.salesTransaction.aggregate({
        _min: { date: true },
        _max: { date: true },
      }),
    ]);

    // Expose the full available range to the UI
    const dataRange = {
      from: rangeAgg._min.date?.toISOString().slice(0, 7) ?? null,
      to:   rangeAgg._max.date?.toISOString().slice(0, 7) ?? null,
    };

    const sales: CleanSalesRow[] = salesRows.map((r) => ({
      date:         r.date.toISOString().slice(0, 10),
      repName:      r.repName,
      region:       r.region,
      product:      r.product,
      amount:       r.amount,
      customerName: r.customerName,
    }));

    const hr: CleanHRRow[] = hrRows.map((r) => ({
      repName:       r.repName,
      region:        r.region,
      department:    r.department,
      hireDate:      r.hireDate.toISOString().slice(0, 10),
      monthlyTarget: r.monthlyTarget,
    }));

    const finance: CleanFinanceRow[] = financeRows.map((r) => ({
      region:         r.region,
      month:          r.month.toISOString().slice(0, 7),
      revenueTarget:  r.revenueTarget,
      departmentCost: r.departmentCost,
    }));

    const enriched = combine(sales, hr, finance);
    const metrics  = computeAllMetrics(enriched);

    return NextResponse.json({ hasData: true, metrics, dataRange, activeFilter: { from: fromParam, to: toParam } });
  } catch (err) {
    console.error("[api/metrics] Error:", err);
    return NextResponse.json(
      { error: "Failed to load metrics", detail: String(err) },
      { status: 500 }
    );
  }
}
