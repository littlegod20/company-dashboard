/**
 * parse.ts
 * Stage 1: Read raw Excel files using SheetJS and convert each row into a
 * typed object. No cleaning happens here — we preserve raw values exactly as
 * they come from the spreadsheet so that clean.ts can make explicit decisions.
 *
 * SheetJS represents Excel dates as JS Date objects when cellDates:true is set.
 * Text fields are left as-is (trimming happens in clean.ts).
 */

import * as XLSX from "xlsx";

export interface RawSalesRow {
  date: Date | string | number | null;
  repName: string | null;
  region: string | null;
  product: string | null;
  amount: number | null;
  customerName: string | null;
}

export interface RawHRRow {
  repName: string | null;
  region: string | null;
  department: string | null;
  hireDate: Date | string | number | null;
  monthlyTarget: number | null;
}

export interface RawFinanceRow {
  region: string | null;
  month: string | null;
  revenueTarget: number | null;
  departmentCost: number | null;
}

// ---------- Helpers ----------

/**
 * Load a workbook from a Buffer (as received from a multipart upload)
 * or from a file path (used in tests/CLI).
 */
function loadWorkbook(source: Buffer | string): XLSX.WorkBook {
  if (typeof source === "string") {
    return XLSX.readFile(source, { cellDates: true, dense: true });
  }
  return XLSX.read(source, { cellDates: true, dense: true, type: "buffer" });
}

/**
 * Parse a workbook with cellDates:true so date cells come back as JS Date objects.
 * We re-read with raw:true for numeric access too.
 */
function sheetToRawRows(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });
}


/**
 * Parse sales_transactions.xlsx
 * Expected columns: Date | Rep Name | Region | Product | Amount (USD) | Customer Name
 */
export function parseSales(source: Buffer | string): RawSalesRow[] {
  const wb = loadWorkbook(source);
  const rows = sheetToRawRows(wb);

  return rows.map((row) => ({
    date: (row["Date"] as Date | string | number | null) ?? null,
    repName: row["Rep Name"] != null ? String(row["Rep Name"]) : null,
    region: row["Region"] != null ? String(row["Region"]) : null,
    product: row["Product"] != null ? String(row["Product"]) : null,
    amount: row["Amount (USD)"] != null ? Number(row["Amount (USD)"]) : null,
    customerName: row["Customer Name"] != null ? String(row["Customer Name"]) : null,
  }));
}

/**
 * Parse hr_employees.xlsx
 * Expected columns: Rep Name | Region | Department | Hire Date | Monthly Target (USD)
 */
export function parseHR(source: Buffer | string): RawHRRow[] {
  const wb = loadWorkbook(source);
  const rows = sheetToRawRows(wb);

  return rows.map((row) => ({
    repName: row["Rep Name"] != null ? String(row["Rep Name"]) : null,
    region: row["Region"] != null ? String(row["Region"]) : null,
    department: row["Department"] != null ? String(row["Department"]) : null,
    hireDate: (row["Hire Date"] as Date | string | number | null) ?? null,
    monthlyTarget:
      row["Monthly Target (USD)"] != null ? Number(row["Monthly Target (USD)"]) : null,
  }));
}

/**
 * Parse finance_targets.xlsx
 * Expected columns: Region | Month | Revenue Target (USD) | Department Cost (USD)
 * Month values are mostly "2026-01" but at least one is "July 2026" — normalised in clean.ts
 */
export function parseFinance(source: Buffer | string): RawFinanceRow[] {
  const wb = loadWorkbook(source);
  const rows = sheetToRawRows(wb);

  return rows.map((row) => ({
    region: row["Region"] != null ? String(row["Region"]) : null,
    month: row["Month"] != null ? String(row["Month"]) : null,
    revenueTarget:
      row["Revenue Target (USD)"] != null ? Number(row["Revenue Target (USD)"]) : null,
    departmentCost:
      row["Department Cost (USD)"] != null ? Number(row["Department Cost (USD)"]) : null,
  }));
}
