import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSales, parseHR, parseFinance } from "@/lib/pipeline/parse";
import { cleanSales, cleanHR, cleanFinance } from "@/lib/pipeline/clean";
import { combine } from "@/lib/pipeline/combine";
import { computeAllMetrics } from "@/lib/pipeline/metrics";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const salesFile = formData.get("sales") as File | null;
    const hrFile = formData.get("hr") as File | null;
    const financeFile = formData.get("finance") as File | null;

    if (!salesFile || !hrFile || !financeFile) {
      return NextResponse.json(
        { error: "All 3 files required: sales, hr, finance",
          received: { sales: !!salesFile, hr: !!hrFile, finance: !!financeFile } },
        { status: 400 }
      );
    }

    const [salesBuf, hrBuf, financeBuf] = await Promise.all([
      salesFile.arrayBuffer().then((ab) => Buffer.from(ab)),
      hrFile.arrayBuffer().then((ab) => Buffer.from(ab)),
      financeFile.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    const rawSales = parseSales(salesBuf);
    const rawHR = parseHR(hrBuf);
    const rawFinance = parseFinance(financeBuf);

    const cleanedSales = cleanSales(rawSales);
    const cleanedHR = cleanHR(rawHR);
    const cleanedFinance = cleanFinance(rawFinance);

    const enriched = combine(cleanedSales, cleanedHR, cleanedFinance);
    const metrics = computeAllMetrics(enriched);

    // Each upload fully replaces the previous dataset, so wipe and reinsert
    // inside one transaction to avoid leaving the tables half-updated.
    await prisma.$transaction(async (tx) => {
      await tx.rawUpload.createMany({
        data: [
          { filename: salesFile.name, sourceType: "SALES", rowCount: rawSales.length },
          { filename: hrFile.name,    sourceType: "HR",    rowCount: rawHR.length },
          { filename: financeFile.name, sourceType: "FINANCE", rowCount: rawFinance.length },
        ],
      });

      await tx.salesTransaction.deleteMany();
      await tx.employee.deleteMany();
      await tx.financeTarget.deleteMany();

      await tx.salesTransaction.createMany({
        data: cleanedSales.map((r) => ({
          date: new Date(r.date), repName: r.repName, region: r.region,
          product: r.product, amount: r.amount, customerName: r.customerName,
        })),
      });

      await tx.employee.createMany({
        data: cleanedHR.map((r) => ({
          repName: r.repName, region: r.region, department: r.department,
          hireDate: new Date(r.hireDate), monthlyTarget: r.monthlyTarget,
        })),
      });

      await tx.financeTarget.createMany({
        data: cleanedFinance.map((r) => ({
          region: r.region, month: new Date(r.month + "-01"),
          revenueTarget: r.revenueTarget, departmentCost: r.departmentCost,
        })),
      });
    });

    return NextResponse.json({
      success: true,
      summary: {
        salesRowsRaw: rawSales.length, salesRowsCleaned: cleanedSales.length,
        hrRowsRaw: rawHR.length, hrRowsCleaned: cleanedHR.length,
        financeRowsRaw: rawFinance.length, financeRowsCleaned: cleanedFinance.length,
        enrichedRows: enriched.length,
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
