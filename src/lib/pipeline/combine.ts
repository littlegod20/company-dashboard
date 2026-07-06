/**
 * combine.ts
 * Stage 3: Join the 3 cleaned datasets into a single enriched fact table.
 *
 * Join strategy:
 *   Sales ← left-join → HR  (on repName, after trimming)
 *     A sales row without an HR match is kept but department/hireDate/target
 *     will be null. This is intentional: we don't drop revenue data just
 *     because the rep is missing from the HR file (could be a new hire or data lag).
 *
 *   Enriched row ← left-join → Finance (on region + "YYYY-MM" of the sale date)
 *     Provides revenueTarget and departmentCost for the same region+month.
 *     If no finance row matches, targets are null (reported as "no target set").
 */

import type { CleanSalesRow } from "./clean";
import type { CleanHRRow } from "./clean";
import type { CleanFinanceRow } from "./clean";

// ---------- Output type ----------

export interface EnrichedRow {
  // From sales
  date: string;           // "YYYY-MM-DD"
  yearMonth: string;      // "YYYY-MM" derived from date
  repName: string;
  region: string;
  product: string;
  amount: number;
  customerName: string;

  // From HR (may be null if rep not found)
  department: string | null;
  hireDate: string | null;
  monthlyTarget: number | null;

  // From Finance (may be null if no target for that region+month)
  revenueTarget: number | null;
  departmentCost: number | null;
}

// ---------- Join ----------

export function combine(
  sales: CleanSalesRow[],
  hr: CleanHRRow[],
  finance: CleanFinanceRow[]
): EnrichedRow[] {
  // Build lookup maps for O(1) joins
  const hrByRep = new Map<string, CleanHRRow>();
  for (const emp of hr) {
    hrByRep.set(emp.repName.toLowerCase(), emp);
  }

  const financeByKey = new Map<string, CleanFinanceRow>();
  for (const fin of finance) {
    // Key: "region|YYYY-MM" (both lowercased for case-insensitive match)
    financeByKey.set(`${fin.region.toLowerCase()}|${fin.month}`, fin);
  }

  const result: EnrichedRow[] = [];

  for (const sale of sales) {
    const yearMonth = sale.date.slice(0, 7); // "YYYY-MM-DD" → "YYYY-MM"

    // Join to HR by repName (case-insensitive after trim)
    const emp = hrByRep.get(sale.repName.toLowerCase()) ?? null;
    if (!emp) {
      console.warn(
        `[combine] No HR record for rep "${sale.repName}" — ` +
          `department/target will be null for this sale.`
      );
    }

    // Join to Finance by region + month
    const finKey = `${sale.region.toLowerCase()}|${yearMonth}`;
    const fin = financeByKey.get(finKey) ?? null;
    if (!fin) {
      console.warn(
        `[combine] No finance target for region="${sale.region}" month="${yearMonth}" — ` +
          `revenueTarget/departmentCost will be null.`
      );
    }

    result.push({
      date: sale.date,
      yearMonth,
      repName: sale.repName,
      region: sale.region,
      product: sale.product,
      amount: sale.amount,
      customerName: sale.customerName,

      department: emp?.department ?? null,
      hireDate: emp?.hireDate ?? null,
      monthlyTarget: emp?.monthlyTarget ?? null,

      revenueTarget: fin?.revenueTarget ?? null,
      departmentCost: fin?.departmentCost ?? null,
    });
  }

  console.log(
    `[combine] ${result.length} enriched rows from ${sales.length} sales, ` +
      `${hr.length} HR records, ${finance.length} finance rows.`
  );

  return result;
}
