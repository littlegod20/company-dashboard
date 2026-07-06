import type { RawSalesRow, RawHRRow, RawFinanceRow } from "./parse";

export interface CleanSalesRow {
  date: string;
  repName: string;
  region: string;
  product: string;
  amount: number;
  customerName: string;
}

export interface CleanHRRow {
  repName: string;
  region: string;
  department: string;
  hireDate: string;
  monthlyTarget: number;
}

export interface CleanFinanceRow {
  region: string;
  month: string;
  revenueTarget: number;
  departmentCost: number;
}

const MONTH_NAMES: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

// The source files mix Date objects, DD/MM/YYYY, ISO strings, and the odd
// Excel serial number, so we normalise everything to "YYYY-MM-DD" here.
export function toISODate(raw: Date | string | number | null): string | null {
  if (raw == null) return null;

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return raw.toISOString().slice(0, 10);
  }

  if (typeof raw === "number") {
    // Excel serial dates count days from 1900-01-01 and include the fake 1900 leap day.
    const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const s = raw.trim();

  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

// Finance months arrive as "2026-01", "July 2026", or "2026/01".
function toYearMonth(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();

  if (/^\d{4}-\d{2}$/.test(s)) return s;

  const named = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const mon = MONTH_NAMES[named[1].toLowerCase()];
    if (mon) return `${named[2]}-${mon}`;
  }

  const slash = s.match(/^(\d{4})\/(\d{2})$/);
  if (slash) return `${slash[1]}-${slash[2]}`;

  console.warn(`[clean] Unrecognised month format: "${s}" — skipping row`);
  return null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// We warn about similar names but never merge them: "Kwame Owusu" and
// "Kwame Owusu-Ansah" are close but are genuinely different employees.
export function flagNearDuplicateNames(names: string[]): void {
  const unique = [...new Set(names)];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const dist = levenshtein(unique[i].toLowerCase(), unique[j].toLowerCase());
      if (dist <= 3) {
        console.warn(
          `[clean] Near-duplicate rep names detected (edit distance ${dist}): ` +
            `"${unique[i]}" vs "${unique[j]}" — treating as DISTINCT people. ` +
            `Verify in source data if this is unintentional.`
        );
      }
    }
  }
}

export function cleanSales(rows: RawSalesRow[]): CleanSalesRow[] {
  const seen = new Set<string>();
  const cleaned: CleanSalesRow[] = [];

  for (const row of rows) {
    if (!row.repName || !row.region || !row.product || !row.customerName) {
      console.warn("[clean:sales] Skipping row with missing required field:", row);
      continue;
    }

    // A null amount is unknown, not zero — keeping it would silently undercount revenue.
    if (row.amount == null || isNaN(row.amount)) {
      console.warn(`[clean:sales] Excluding row with null amount: rep=${row.repName}, product=${row.product}`);
      continue;
    }

    const date = toISODate(row.date);
    if (!date) {
      console.warn("[clean:sales] Skipping row with unparseable date:", row.date);
      continue;
    }

    const repName = row.repName.trim();
    const region = row.region.trim();
    const product = row.product.trim();
    const customerName = row.customerName.trim();

    const key = `${date}|${repName}|${product}|${row.amount}|${customerName}`;
    if (seen.has(key)) {
      console.warn(`[clean:sales] Removing exact duplicate: ${key}`);
      continue;
    }
    seen.add(key);

    cleaned.push({ date, repName, region, product, amount: row.amount, customerName });
  }

  flagNearDuplicateNames(cleaned.map((r) => r.repName));

  return cleaned;
}

export function cleanHR(rows: RawHRRow[]): CleanHRRow[] {
  const parsed: (CleanHRRow & { _rawTarget: number | null })[] = [];

  for (const row of rows) {
    if (!row.repName || !row.region || !row.department) {
      console.warn("[clean:hr] Skipping row with missing required field:", row);
      continue;
    }

    const repName = row.repName.trim();
    const region = row.region.trim();
    const department = row.department.trim();

    const hireDate = toISODate(row.hireDate);
    if (!hireDate) {
      console.warn(`[clean:hr] Skipping "${repName}" — unparseable hire date: ${row.hireDate}`);
      continue;
    }

    parsed.push({
      repName,
      region,
      department,
      hireDate,
      monthlyTarget: row.monthlyTarget ?? 0,
      _rawTarget: row.monthlyTarget,
    });
  }

  // Some reps appear twice with different hire dates; keep the first occurrence
  // (which tends to carry the target) and log the discarded one for auditing.
  const byName = new Map<string, typeof parsed[0]>();
  for (const row of parsed) {
    const existing = byName.get(row.repName);
    if (!existing) {
      byName.set(row.repName, row);
    } else {
      console.warn(
        `[clean:hr] Duplicate rep "${row.repName}": ` +
          `keeping hireDate=${existing.hireDate} target=${existing._rawTarget}, ` +
          `discarding hireDate=${row.hireDate} target=${row._rawTarget}`
      );
    }
  }

  // Drop reps without a target — target-vs-actual is undefined without one.
  const result: CleanHRRow[] = [];
  for (const row of byName.values()) {
    if (row._rawTarget == null) {
      console.warn(`[clean:hr] Excluding "${row.repName}" — null monthly target`);
      continue;
    }
    result.push({
      repName: row.repName,
      region: row.region,
      department: row.department,
      hireDate: row.hireDate,
      monthlyTarget: row._rawTarget,
    });
  }

  flagNearDuplicateNames(result.map((r) => r.repName));

  return result;
}

export function cleanFinance(rows: RawFinanceRow[]): CleanFinanceRow[] {
  const seen = new Set<string>();
  const cleaned: CleanFinanceRow[] = [];

  for (const row of rows) {
    if (!row.region) {
      console.warn("[clean:finance] Skipping row with missing region:", row);
      continue;
    }

    const region = row.region.trim();
    const month = toYearMonth(row.month);
    if (!month) continue;

    // Here zero is a legitimate value (a region can have no cost in a month),
    // so null targets/costs become 0 rather than dropping the row.
    const revenueTarget = row.revenueTarget ?? 0;
    const departmentCost = row.departmentCost ?? 0;

    const key = `${region}|${month}`;
    if (seen.has(key)) {
      console.warn(`[clean:finance] Removing duplicate region+month: ${key}`);
      continue;
    }
    seen.add(key);

    cleaned.push({ region, month, revenueTarget, departmentCost });
  }

  return cleaned;
}
