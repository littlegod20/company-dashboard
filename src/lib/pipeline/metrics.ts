import type { EnrichedRow } from "./combine";

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface RegionTargetActual {
  region: string;
  actual: number;
  target: number;
  attainmentPct: number;
}

export interface ProductRevenue {
  product: string;
  revenue: number;
}

export interface RegionMargin {
  region: string;
  revenue: number;
  cost: number;
  margin: number;
}

export interface RepRevenue {
  repName: string;
  region: string;
  revenue: number;
}

export interface Metrics {
  revenueTrend: MonthlyRevenue[];
  targetVsActual: RegionTargetActual[];
  topProducts: ProductRevenue[];
  marginByRegion: RegionMargin[];
  topReps: RepRevenue[];
  totalRevenue: number;
  rowCount: number;
}

function groupSum<T>(
  rows: T[],
  keyFn: (r: T) => string,
  valueFn: (r: T) => number
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) ?? 0) + valueFn(row));
  }
  return map;
}


/** Revenue by month, sorted chronologically */
export function computeRevenueTrend(rows: EnrichedRow[]): MonthlyRevenue[] {
  const byMonth = groupSum(
    rows,
    (r) => r.yearMonth,
    (r) => r.amount
  );
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue: round2(revenue) }));
}

/** Actual vs target by region.
 *  Target comes from the Finance table (sum of monthly revenueTarget
 *  across all months in the dataset per region).
 *  Attainment = actual / target * 100. If no target set, attainmentPct = 0.
 */
export function computeTargetVsActual(rows: EnrichedRow[]): RegionTargetActual[] {
  const actualByRegion = groupSum(rows, (r) => r.region, (r) => r.amount);

   const targetByRegion = new Map<string, number>();
  const seenFinanceKeys = new Set<string>();
  for (const row of rows) {
    const key = `${row.region}|${row.yearMonth}`;
    if (!seenFinanceKeys.has(key)) {
      seenFinanceKeys.add(key);
      if (row.revenueTarget != null) {
        targetByRegion.set(
          row.region,
          (targetByRegion.get(row.region) ?? 0) + row.revenueTarget
        );
      }
    }
  }

  const regions = [...new Set(rows.map((r) => r.region))].sort();
  return regions.map((region) => {
    const actual = actualByRegion.get(region) ?? 0;
    const target = targetByRegion.get(region) ?? 0;
    const attainmentPct = target > 0 ? round2((actual / target) * 100) : 0;
    return { region, actual: round2(actual), target: round2(target), attainmentPct };
  });
}

/** Top products by total revenue (default: top 10) */
export function computeTopProducts(rows: EnrichedRow[], topN = 10): ProductRevenue[] {
  const byProduct = groupSum(rows, (r) => r.product, (r) => r.amount);
  return [...byProduct.entries()]
    .map(([product, revenue]) => ({ product, revenue: round2(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

/**  Margin by region: revenue − department cost.
 *  Cost is also de-duped per region+month (same logic as targets).
 */
export function computeMarginByRegion(rows: EnrichedRow[]): RegionMargin[] {
  const revenueByRegion = groupSum(rows, (r) => r.region, (r) => r.amount);

  const costByRegion = new Map<string, number>();
  const seenCostKeys = new Set<string>();
  for (const row of rows) {
    const key = `${row.region}|${row.yearMonth}`;
    if (!seenCostKeys.has(key)) {
      seenCostKeys.add(key);
      if (row.departmentCost != null) {
        costByRegion.set(
          row.region,
          (costByRegion.get(row.region) ?? 0) + row.departmentCost
        );
      }
    }
  }

  const regions = [...new Set(rows.map((r) => r.region))].sort();
  return regions.map((region) => {
    const revenue = revenueByRegion.get(region) ?? 0;
    const cost = costByRegion.get(region) ?? 0;
    const margin = revenue - cost;
    return {
      region,
      revenue: round2(revenue),
      cost: round2(cost),
      margin: round2(margin),
    };
  });
}

/** Top reps by total revenue (default: top 10) */
export function computeTopReps(rows: EnrichedRow[], topN = 10): RepRevenue[] {
  const revenueByRep = groupSum(rows, (r) => r.repName, (r) => r.amount);

  const regionByRep = new Map<string, string>();
  for (const row of rows) {
    if (!regionByRep.has(row.repName)) regionByRep.set(row.repName, row.region);
  }

  return [...revenueByRep.entries()]
    .map(([repName, revenue]) => ({
      repName,
      region: regionByRep.get(repName) ?? "",
      revenue: round2(revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

export function computeAllMetrics(rows: EnrichedRow[]): Metrics {
  return {
    revenueTrend: computeRevenueTrend(rows),
    targetVsActual: computeTargetVsActual(rows),
    topProducts: computeTopProducts(rows),
    marginByRegion: computeMarginByRegion(rows),
    topReps: computeTopReps(rows),
    totalRevenue: round2(rows.reduce((s, r) => s + r.amount, 0)),
    rowCount: rows.length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
