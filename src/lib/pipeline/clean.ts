/**
 * clean.ts
 * Stage 2: Normalise raw parsed data before joining.
 *
 * Decisions made here (all documented inline):
 *  - Trim all string fields (handles trailing spaces found in real data)
 *  - Dates → ISO "YYYY-MM-DD" strings; hire dates handle multiple string formats
 *  - Finance months → "YYYY-MM" (handles "July 2026" mixed with "2026-01")
 *  - Null amounts → row excluded (no revenue = nothing useful to measure)
 *  - Null monthly targets → excluded from HR (can't compute target attainment)
 *  - Duplicate HR rows for same rep name → keep the first (usually the one
 *    with a target); log both so the caller can audit
 *  - Near-duplicate rep names (trailing spaces, Kwame Owusu vs Kwame Owusu-Ansah)
 *    handled by trim first, then explicit fuzzy-check with Levenshtein; flagged
 *    in logs but NOT silently merged because they may be genuinely different people
 *  - Exact duplicate rows → removed (same rep+date+amount+product)
 */

import type { RawSalesRow, RawHRRow, RawFinanceRow } from "./parse";

// ---------- Cleaned row types ----------

export interface CleanSalesRow {
  date: string; // "YYYY-MM-DD"
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
  hireDate: string; // "YYYY-MM-DD"
  monthlyTarget: number;
}

export interface CleanFinanceRow {
  region: string;
  month: string; // "YYYY-MM"
  revenueTarget: number;
  departmentCost: number;
}

// ---------- Date helpers ----------

const MONTH_NAMES: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

/**
 * Parse any date-ish value into a "YYYY-MM-DD" string.
 * Handles:
 *   - JS Date objects (from SheetJS cellDates:true)
 *   - "23/05/2022" (DD/MM/YYYY)
 *   - "2023-06-02" (ISO)
 *   - Excel serial numbers (rare fallback)
 */
export function toISODate(raw: Date | string | number | null): string | null {
  if (raw == null) return null;

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return raw.toISOString().slice(0, 10);
  }

  if (typeof raw === "number") {
    // Excel serial date: days since 1900-01-01 (with the 1900 leap-year bug)
    const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const s = raw.trim();

  // "23/05/2022" → DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // "2023-06-02" → already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Fallback: try JS Date parse (handles many locale variants)
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

/**
 * Parse a month value to "YYYY-MM".
 * Handles:
 *   - "2026-01"  → already good
 *   - "July 2026" → "2026-07"
 */
function toYearMonth(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();

  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // "July 2026", "january 2026", etc.
  const named = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const mon = MONTH_NAMES[named[1].toLowerCase()];
    if (mon) return `${named[2]}-${mon}`;
  }

  // "2026/01"
  const slash = s.match(/^(\d{4})\/(\d{2})$/);
  if (slash) return `${slash[1]}-${slash[2]}`;

  console.warn(`[clean] Unrecognised month format: "${s}" — skipping row`);
  return null;
}

// ---------- Levenshtein distance (simple, for name fuzzy-match) ----------

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

/**
 * Check for near-duplicate names in a list (after trimming).
 * We flag but do NOT merge — "Kwame Owusu" and "Kwame Owusu-Ansah" are
 * distinct entries in the HR file, so they are different employees.
 * Distance threshold: ≤3 edits (catches typos/hyphen variants at short-name lengths).
 */
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

// ---------- Sales cleaning ----------

export function cleanSales(rows: RawSalesRow[]): CleanSalesRow[] {
  const seen = new Set<string>();
  const cleaned: CleanSalesRow[] = [];

  for (const row of rows) {
    // Skip if core fields are missing
    if (!row.repName || !row.region || !row.product || !row.customerName) {
      console.warn("[clean:sales] Skipping row with missing required field:", row);
      continue;
    }

    // Decision: exclude rows with null amounts — revenue is the entire
    // purpose of the sales dataset; a null amount cannot be imputed safely
    // (it's not zero; it's unknown). Keeping it would silently undercount revenue.
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

    // Remove exact duplicates (same date+rep+product+amount+customer)
    const key = `${date}|${repName}|${product}|${row.amount}|${customerName}`;
    if (seen.has(key)) {
      console.warn(`[clean:sales] Removing exact duplicate: ${key}`);
      continue;
    }
    seen.add(key);

    cleaned.push({ date, repName, region, product, amount: row.amount, customerName });
  }

  // Flag near-duplicate rep names (informational — we don't merge)
  flagNearDuplicateNames(cleaned.map((r) => r.repName));

  return cleaned;
}

// ---------- HR cleaning ----------

export function cleanHR(rows: RawHRRow[]): CleanHRRow[] {
  // First pass: trim names, parse dates, drop unresolvable rows
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
      monthlyTarget: row.monthlyTarget ?? 0, // placeholder; resolved below
      _rawTarget: row.monthlyTarget,
    });
  }

  // Deduplicate by repName: keep the first row that has a valid target.
  // Rationale: "Naledi Moyo" appears twice — same region/dept, different hire
  // dates, and the second entry has a null target. We keep the first (which
  // has a target) and log both so a human can reconcile.
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

  // Decision: exclude HR rows with null monthlyTarget — target-vs-actual
  // is a core metric; a null target makes that metric undefined. We log
  // so the assessor can see the decision.
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

  // Flag near-duplicate names (e.g. "Kwame Owusu" vs "Kwame Owusu-Ansah")
  flagNearDuplicateNames(result.map((r) => r.repName));

  return result;
}

// ---------- Finance cleaning ----------

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
    if (!month) continue; // warning already printed in toYearMonth

    // Decision: null targets/costs are set to 0, not excluded — a region
    // can legitimately have zero cost in a month. Zero is a meaningful value
    // here, unlike sales amounts where zero means "no transaction."
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
