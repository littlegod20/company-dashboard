/**
 * POST /api/upload
 *
 * Accepts 3 Excel files via multipart/form-data:
 *   - sales: sales_transactions.xlsx
 *   - hr:    hr_employees.xlsx
 *   - finance: finance_targets.xlsx
 *
 * Pipeline: parse → clean → combine → metrics → persist → respond
 *
 * Files can be uploaded in any order; they are identified by the form field name.
 * All 3 must be present in a single request.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSales, parseHR, parseFinance } from "@/lib/pipeline/parse";
import { cleanSales, cleanHR, cleanFinance } from "@/lib/pipeline/clean";
import { combine } from "@/lib/pipeline/combine";
import { computeAllMetrics } from "@/lib/pipeline/metrics";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // --- 1. Extract files from form ---
    const salesFile = formData.get("sales") as File | null;
    const hrFile = formData.get("hr") as File | null;
    const financeFile = formData.get("finance") as File | null;

    if (!salesFile || !hrFile || !financeFile) {
      return NextResponse.json(
        {
          error: "All 3 files required: sales, hr, finance",
          received: {
            sales: !!salesFile,
            hr: !!hrFile,
            finance: !!financeFile,
          },
        },
        { status: 400 }
      );
    }

    // Convert File → Buffer (SheetJS needs a Buffer/ArrayBuffer)
    const [salesBuf, hrBuf, financeBuf] = await Promise.all([
      salesFile.arrayBuffer().then((ab) => Buffer.from(ab)),
      hrFile.arrayBuffer().then((ab) => Buffer.from(ab)),
      financeFile.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    // --- 2. Parse (raw rows from Excel) ---
    const rawSales = parseSales(salesBuf);
    const rawHR = parseHR(hrBuf);
    const rawFinance = parseFinance(financeBuf);

    // --- 3. Clean (normalise, deduplicate, validate) ---
    const cleanedSales = cleanSales(rawSales);
    const cleanedHR = cleanHR(rawHR);
    const cleanedFinance = cleanFinance(rawFinance);

    // --- 4. Combine (join into enriched fact rows) ---
    const enriched = combine(cleanedSales, cleanedHR, cleanedFinance);

    // --- 5. Compute metrics ---
    const metrics = computeAllMetrics(enriched);

    // --- 6. Persist to Postgres (wrapped in a transaction) ---
    await prisma.$transaction(async (tx) => {
      // Log upload events for each file
      await tx.rawUpload.createMany({
        data: [
          { filename: salesFile.name, sourceType: "SALES", rowCount: rawSales.length },
          { filename: hrFile.name,    sourceType: "HR",    rowCount: rawHR.length },
          { filename: financeFile.name, sourceType: "FINANCE", rowCount: rawFinance.length },
        ],
      });

      // Full replace on each upload (simpler than upsert for an assessment;
      // noted in README as a future improvement)
      await tx.salesTransaction.deleteMany();
      await tx.employee.deleteMany();
      await tx.financeTarget.deleteMany();

      await tx.salesTransaction.createMany({
        data: cleanedSales.map((row) => ({
          date:         new Date(row.date),
          repName:      row.repName,
          region:       row.region,
          product:      row.product,
          amount:       row.amount,
          customerName: row.customerName,
        })),
      });

      await tx.employee.createMany({
        data: cleanedHR.map((row) => ({
          repName:       row.repName,
          region:        row.region,
          department:    row.department,
          hireDate:      new Date(row.hireDate),
          monthlyTarget: row.monthlyTarget,
        })),
      });

      await tx.financeTarget.createMany({
        data: cleanedFinance.map((row) => ({
          region:         row.region,
          month:          new Date(`${row.month}-01`),
          revenueTarget:  row.revenueTarget,
          departmentCost: row.departmentCost,
        })),
      });
    });

    // --- 7. Return metrics as JSON ---
    return NextResponse.json({
      success: true,
      summary: {
        salesRowsRaw:      rawSales.length,
        salesRowsCleaned:  cleanedSales.length,
        hrRowsRaw:         rawHR.length,
        hrRowsCleaned:     cleanedHR.length,
        financeRowsRaw:    rawFinance.length,
        financeRowsCleaned: cleanedFinance.length,
        enrichedRows:      enriched.length,
      },
      metrics,
    });
  } catch (err) {
    console.error("[api/upload] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
