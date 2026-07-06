/**
 * toExcel.ts
 * Client-side Excel export using SheetJS (already a project dependency).
 *
 * Generates a multi-sheet workbook from a Metrics snapshot:
 *   Sheet 1 — Summary          (KPI totals)
 *   Sheet 2 — Revenue Trend    (monthly revenue)
 *   Sheet 3 — Target vs Actual (by region)
 *   Sheet 4 — Margin by Region (revenue / cost / margin)
 *   Sheet 5 — Top Products     (ranked by revenue)
 *   Sheet 6 — Top Reps         (ranked by revenue)
 *
 * Designed to be called from a client component ("use client").
 * The download is triggered by creating a temporary <a> element — no server round-trip.
 */

import * as XLSX from "xlsx";
import type { Metrics } from "@/lib/pipeline/metrics";

// ---------- helpers ----------

/** Row of primitives — what SheetJS aoa_to_sheet expects */
type Row = (string | number | null)[];

/** Build a sheet from a header row + data rows, with column widths auto-fitted */
function makeSheet(header: string[], rows: Row[]): XLSX.WorkSheet {
  const aoa: Row[] = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-fit column widths: max of header length or longest value in each col
  ws["!cols"] = header.map((h, colIdx) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[colIdx] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) }; // cap at 40 chars
  });

  // Bold the header row
  for (let c = 0; c < header.length; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddr]) {
      ws[cellAddr].s = { font: { bold: true } };
    }
  }

  return ws;
}

// ---------- sheet builders ----------

function summarySheet(metrics: Metrics, filterLabel: string): XLSX.WorkSheet {
  const totalTarget = metrics.targetVsActual.reduce((s, r) => s + r.target, 0);
  const totalCost   = metrics.marginByRegion.reduce((s, r) => s + r.cost,   0);
  const attainment  = totalTarget > 0 ? (metrics.totalRevenue / totalTarget) * 100 : 0;

  const rows: Row[] = [
    ["Date range",          filterLabel],
    ["Total revenue",       metrics.totalRevenue],
    ["Total dept cost",     totalCost],
    ["Net margin",          metrics.totalRevenue - totalCost],
    ["Overall attainment",  Math.round(attainment * 10) / 10],
    ["Transactions",        metrics.rowCount],
    ["Months in range",     metrics.revenueTrend.length],
  ];

  const ws = XLSX.utils.aoa_to_sheet([["Metric", "Value"], ...rows]);
  ws["!cols"] = [{ wch: 22 }, { wch: 18 }];
  return ws;
}

function revenueTrendSheet(metrics: Metrics): XLSX.WorkSheet {
  return makeSheet(
    ["Month", "Revenue (USD)"],
    metrics.revenueTrend.map((r) => [r.month, r.revenue])
  );
}

function targetVsActualSheet(metrics: Metrics): XLSX.WorkSheet {
  return makeSheet(
    ["Region", "Actual Revenue (USD)", "Revenue Target (USD)", "Attainment (%)"],
    metrics.targetVsActual.map((r) => [
      r.region,
      r.actual,
      r.target,
      Math.round(r.attainmentPct * 10) / 10,
    ])
  );
}

function marginSheet(metrics: Metrics): XLSX.WorkSheet {
  return makeSheet(
    ["Region", "Revenue (USD)", "Dept Cost (USD)", "Net Margin (USD)", "Margin (%)"],
    metrics.marginByRegion.map((r) => {
      const mp = r.revenue > 0 ? Math.round((r.margin / r.revenue) * 1000) / 10 : 0;
      return [r.region, r.revenue, r.cost, r.margin, mp];
    })
  );
}

function topProductsSheet(metrics: Metrics): XLSX.WorkSheet {
  return makeSheet(
    ["Rank", "Product", "Revenue (USD)"],
    metrics.topProducts.map((r, i) => [i + 1, r.product, r.revenue])
  );
}

function topRepsSheet(metrics: Metrics): XLSX.WorkSheet {
  return makeSheet(
    ["Rank", "Rep Name", "Region", "Revenue (USD)"],
    metrics.topReps.map((r, i) => [i + 1, r.repName, r.region, r.revenue])
  );
}

// ---------- public API ----------

export interface ExportOptions {
  metrics: Metrics;
  /** Human-readable label for the active date filter, e.g. "2026-03 – 2026-05" */
  filterLabel: string;
  /** View context included in the filename: "sales" | "finance" */
  view: "sales" | "finance";
}

/**
 * Generate and immediately download a .xlsx workbook.
 * Call this from a "use client" component — it creates a temporary <a> link.
 */
export function exportToExcel({ metrics, filterLabel, view }: ExportOptions): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, summarySheet(metrics, filterLabel),"Summary");
  XLSX.utils.book_append_sheet(wb, revenueTrendSheet(metrics),"Revenue Trend");
  XLSX.utils.book_append_sheet(wb, targetVsActualSheet(metrics),              "Target vs Actual");
  XLSX.utils.book_append_sheet(wb, marginSheet(metrics),"Margin by Region");
  XLSX.utils.book_append_sheet(wb, topProductsSheet(metrics),"Top Products");
  XLSX.utils.book_append_sheet(wb, topRepsSheet(metrics),"Top Reps");

  // Filename: dashboard-sales-2026-03-to-2026-05.xlsx
  const safeDateLabel = filterLabel.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
  const filename = `dashboard-${view}-${safeDateLabel}.xlsx`;

  XLSX.writeFile(wb, filename);
}
