import type { CleanSalesRow, CleanHRRow, CleanFinanceRow } from "./clean";

export interface EnrichedRow {
  date: string;
  yearMonth: string;
  repName: string;
  region: string;
  product: string;
  amount: number;
  customerName: string;

  department: string | null;
  hireDate: string | null;
  monthlyTarget: number | null;

  revenueTarget: number | null;
  departmentCost: number | null;
}

// Sales is the base table. HR joins on rep name and Finance on region+month,
// both as left joins — a sale is never dropped just because a lookup misses,
// we just leave the extra fields null.
export function combine(
  sales: CleanSalesRow[],
  hr: CleanHRRow[],
  finance: CleanFinanceRow[]
): EnrichedRow[] {
  const hrByRep = new Map<string, CleanHRRow>();
  for (const emp of hr) {
    hrByRep.set(emp.repName.toLowerCase(), emp);
  }

  const financeByKey = new Map<string, CleanFinanceRow>();
  for (const fin of finance) {
    financeByKey.set(`${fin.region.toLowerCase()}|${fin.month}`, fin);
  }

  const result: EnrichedRow[] = [];

  for (const sale of sales) {
    const yearMonth = sale.date.slice(0, 7);

    const emp = hrByRep.get(sale.repName.toLowerCase()) ?? null;
    if (!emp) {
      console.warn(
        `[combine] No HR record for rep "${sale.repName}" — ` +
          `department/target will be null for this sale.`
      );
    }

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
