# Company Dashboard

Sales & Operations analytics dashboard built with Next.js, Prisma, Recharts, and TanStack Query.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Prisma** ORM with PostgreSQL (Neon)
- **SheetJS (xlsx)** for Excel parsing and export
- **Recharts** for data visualization
- **TanStack Query v5** for client-side data fetching and caching
- **Zod** for schema validation

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### 2. Clone and install

```bash
git clone <repo-url>
cd company-dashboard
npm install        # also runs prisma generate via postinstall
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Neon connection string:

```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects automatically to `/upload`.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Redirects → /upload
│   ├── upload/page.tsx                 # Excel import form
│   ├── dashboard/
│   │   ├── sales/
│   │   │   ├── page.tsx                # Client page (filter state + useMetrics)
│   │   │   └── SalesDashboardClient.tsx
│   │   └── finance/
│   │       ├── page.tsx
│   │       └── FinanceDashboardClient.tsx
│   ├── api/
│   │   ├── upload/route.ts             # POST — parse/clean/combine/persist
│   │   └── metrics/route.ts            # GET  — load from DB + compute metrics
│   ├── providers.tsx                   # TanStack QueryClientProvider
│   └── globals.css                     # Tailwind + @media print styles
├── components/
│   ├── NavBar.tsx
│   ├── DateRangeFilter.tsx             # Preset + custom month range picker
│   ├── ExportMenu.tsx                  # Excel download + Print/PDF dropdown
│   ├── StatCard.tsx
│   ├── EmptyState.tsx
│   ├── PageLoader.tsx                  # DashboardSkeleton, ErrorState
│   └── dashboard/
│       ├── DashboardSection.tsx
│       ├── sales/                      # AttainmentChart, RevenueTrendChart, etc.
│       └── finance/                    # MarginChart, BudgetChart, CostVsRevenueChart
├── hooks/
│   ├── keys.ts                         # TanStack Query key factory
│   ├── useMetrics.ts                   # useQuery with date filter support
│   └── useUploadFiles.ts               # useMutation → invalidates metrics cache
└── lib/
    ├── db.ts                           # Prisma client singleton
    ├── helpers.ts                      # fmt(), pct(), dollarTip()
    ├── query-client.ts                 # Browser singleton / server fresh instance
    ├── pipeline/
    │   ├── parse.ts                    # Stage 1: Excel → raw typed objects
    │   ├── clean.ts                    # Stage 2: normalise, deduplicate, validate
    │   ├── combine.ts                  # Stage 3: join into EnrichedRow[]
    │   └── metrics.ts                  # Stage 4: compute business metrics
    └── export/
        └── toExcel.ts                  # Client-side multi-sheet .xlsx generation

prisma/
└── schema.prisma
```

---

## Data Models

| Model | Description |
|---|---|
| `RawUpload` | Audit log of every file uploaded (SALES, HR, FINANCE) |
| `SalesTransaction` | Individual sales records (date, rep, region, product, amount) |
| `Employee` | HR/rep data: region, department, hire date, monthly target |
| `FinanceTarget` | Monthly revenue targets and dept costs by region |

---

## Data Pipeline

The pipeline lives in `src/lib/pipeline/` — four pure modules with no cross-stage coupling. Each stage is individually testable and produces a typed output consumed by the next.

### Stage 1 — `parse.ts`

Reads each Excel file from a `Buffer` using SheetJS with `cellDates: true` so date cells come back as JS `Date` objects. Three parsers: `parseSales`, `parseHR`, `parseFinance`. Maps actual column names to typed interfaces. **No cleaning happens here** — raw values are preserved so that `clean.ts` can make explicit, documented decisions.

Real column names (found by inspecting the actual files):

| File | Columns |
|---|---|
| sales_transactions.xlsx | `Date`, `Rep Name`, `Region`, `Product`, `Amount (USD)`, `Customer Name` |
| hr_employees.xlsx | `Rep Name`, `Region`, `Department`, `Hire Date`, `Monthly Target (USD)` |
| finance_targets.xlsx | `Region`, `Month`, `Revenue Target (USD)`, `Department Cost (USD)` |

### Stage 2 — `clean.ts`

Normalises and validates raw data. Every decision is commented inline.

**Dates:**
- `toISODate()` handles JS `Date` objects, `"DD/MM/YYYY"` strings (`'23/05/2022'` in HR), ISO `"YYYY-MM-DD"`, and Excel serial numbers.
- `toYearMonth()` handles `"YYYY-MM"` and `"Month YYYY"` — `"July 2026"` was found in the real finance file.

**Null amounts (sales):** 3 rows excluded. Revenue cannot be imputed — a null amount is unknown, not zero. Keeping it would silently undercount revenue.

**Null monthly targets (HR):** 1 row excluded (second "Naledi Moyo" entry). Target attainment is a core metric; a null target makes it undefined for that rep.

**Duplicate HR rows:** "Naledi Moyo" appears twice with different hire dates (2022-10-12 and 2023-06-15). The second entry has a null target. First row kept (target = $8,000), both logged for human reconciliation. The later hire date may represent an internal transfer never cleaned in the source system.

**Trailing whitespace:** All string fields trimmed. This fixed three rep-name join mismatches in the real data: `'Ama Boateng  '`, `'Karim Hassan  '` (trailing spaces in sales), `'Youssef El-Amin  '` (trailing space in HR).

**Near-duplicate names:** `flagNearDuplicateNames()` runs Levenshtein distance (threshold ≤ 3) and logs suspect pairs. `"Kwame Owusu"` vs `"Kwame Owusu-Ansah"` has distance 6 — correctly treated as distinct people (both appear as separate HR entries). The function logs; it does not merge.

**Exact duplicates:** Sales rows with identical `date|repName|product|amount|customer` key are removed.

**Null finance costs/targets:** Set to 0 (not excluded) — zero cost is a valid data point unlike unknown revenue.

### Stage 3 — `combine.ts`

Joins the three cleaned datasets into `EnrichedRow[]`:

- **Sales → HR** on `repName.toLowerCase()` — left-join: sales without an HR match are kept with `department/target = null` so no revenue data is dropped
- **Enriched → Finance** on `region.toLowerCase() + yearMonth` — left-join: rows without a finance match get `revenueTarget/departmentCost = null`

Both joins use `Map` for O(n) performance.

**Result from real data:** 214 enriched rows, 0 unmatched sales reps, 0 unmatched finance rows.

### Stage 4 — `metrics.ts`

Pure functions over `EnrichedRow[]`. Revenue targets and costs are **de-duplicated by region+month** before summing. A finance row covers an entire region-month, but many sales transactions share the same region-month — naive summing would multiply-count targets.

| Metric | Logic |
|---|---|
| `revenueTrend` | Group-sum `amount` by `yearMonth`, sorted chronologically |
| `targetVsActual` | Actual = per-sale sum; target = sum of unique finance targets per region |
| `topProducts` | Group-sum `amount` by `product`, top 10 |
| `marginByRegion` | Revenue minus unique department costs per region |
| `topReps` | Group-sum `amount` by `repName`, top 10 |

**Sample output (full dataset):**

| Region | Actual | Target | Attainment | Margin |
|---|---|---|---|---|
| West Africa | $467,947 | $357,634 | 130.8% | +$231,946 |
| North Africa | $274,396 | $260,336 | 105.4% | +$105,381 |
| East Africa | $214,473 | $296,110 | 72.4% | +$20,982 |
| Southern Africa | $153,231 | $249,599 | 61.4% | **−$20,179** |

---

## API Routes

### `POST /api/upload`

Accepts `multipart/form-data` with fields `sales`, `hr`, `finance`. Runs the full pipeline, persists all cleaned rows to Postgres in a single transaction (full replace on each upload), and returns computed metrics JSON.

```json
{
  "success": true,
  "summary": { "salesRowsRaw": 221, "salesRowsCleaned": 214 },
  "metrics": { "..." }
}
```

### `GET /api/metrics`

Returns stored metrics. Accepts optional date filter query params:

```
GET /api/metrics?from=2026-03&to=2026-05
```

- `from` / `to` are inclusive month bounds in `YYYY-MM` format
- Only `SalesTransaction` rows are date-filtered — HR and Finance are reference tables
- Always returns `dataRange` (unfiltered min/max) so the UI can bound the date picker
- Returns `{ hasData: false }` if no data has been uploaded yet

---

## Architecture Notes

### TanStack Query

Data fetching is handled client-side via TanStack Query v5:

- **`useMetrics(filter?)`** — fetches `/api/metrics`, one cache entry per `{from, to}` combination via a key factory in `hooks/keys.ts`
- **`useUploadFiles()`** — mutation that POSTs to `/api/upload`; on success, invalidates the entire `["metrics"]` key prefix, busting all filter-variant caches simultaneously
- **`keepPreviousData`** — existing charts stay visible while a new filter loads, no layout shift
- `QueryClientProvider` wraps the app in `src/app/providers.tsx` with a 60-second staleTime

### Client vs Server Components

Dashboard pages are client components (they own filter state and call TanStack Query hooks). Chart subcomponents are also client (Recharts requires the browser). The pipeline, Prisma client, and metric computation run server-side only inside the API routes.

---

## Dashboard Views

### Upload Page (`/upload`)

Three labeled file inputs — one each for Sales, HR, and Finance — with client-side `.xlsx` validation before submitting. Shows a loading state while the pipeline runs. On success, redirects to `/dashboard/sales` after 1 second. Server errors are surfaced inline.

### Date Range Filtering

Both dashboards include a filter bar with:

- **Quick presets:** All time / Last 3M / Last 6M — computed from the actual data's max month
- **Custom range:** Two `type="month"` inputs bounded to the actual data range
- Active preset is auto-detected from the current selection and highlighted
- Each unique `{from, to}` pair gets its own TanStack Query cache entry — switching presets is instant on second visit
- Filter inputs dim while a fetch is in flight; a `×` button clears back to All time

### Export

Both dashboards include an **Export ▾** dropdown:

- **Download Excel** — client-side instant download via SheetJS. Generates a 6-sheet `.xlsx` workbook: Summary, Revenue Trend, Target vs Actual, Margin by Region, Top Products, Top Reps. Reflects the current date filter. Filename encodes view and date range.
- **Print / Save as PDF** — injects a `[data-print-header]` div with title, date, active filter, and total revenue; calls `window.print()`; removes the div afterward. A `@media print` stylesheet hides nav, filter bar, and export button; flattens card borders; adds page break rules. No external dependency — use the browser's "Save as PDF" in the print dialog.

### Sales Dashboard (`/dashboard/sales`)

Framed around **performance** — who's selling, what's selling, and how regions track against target.

| Section | Chart | Insight |
|---|---|---|
| KPI strip | Stat cards | Total revenue, overall attainment %, best region, transaction count |
| Revenue vs Target by Region | Horizontal bar (green/amber/red) | Primary sales KPI |
| Monthly Revenue Trend | Line chart | Growth trajectory |
| Top Reps by Revenue | Horizontal bar (color = region) | Star performers |
| Top Products by Revenue | Horizontal bar | Revenue drivers |

Target attainment is the hero section — largest chart, positioned first after the KPIs.

### Finance Dashboard (`/dashboard/finance`)

Framed around **profitability** — are regions making money relative to their costs?

| Section | Chart | Insight |
|---|---|---|
| KPI strip | Stat cards | Total revenue, dept cost, net margin, budget attainment |
| Margin by Region | Grouped bar + table | Which regions are profitable? |
| Budget Adherence by Region | Grouped bar + table | Attainment paired with cost efficiency |
| Monthly Revenue vs Cost Trend | Composed bar + line | Are revenues staying above costs? |

Southern Africa's negative margin triggers a red alert automatically. The Finance view deliberately excludes rep rankings (a Sales concern) and pairs every attainment figure with its cost context.

**Note on monthly costs:** Department costs in the Finance table are per region totals, not per region-month. The "Monthly Revenue vs Cost" chart distributes each region's total cost proportionally across months by revenue share — this is an approximation. See "What I'd Improve" below.

---

## Data Assumptions

- Sales Excel columns map to: `date`, `rep_name`, `region`, `product`, `amount`, `customer_name`
- HR Excel columns map to: `rep_name`, `region`, `department`, `hire_date`, `monthly_target`
- Finance Excel columns map to: `region`, `month`, `revenue_target`, `department_cost`
- Dates are parsed with a multi-format parser — ISO 8601, `DD/MM/YYYY`, `"Month YYYY"`, and Excel serial numbers all handled
- `repName` (case-insensitive, trimmed) is the join key between Sales and HR
- `region + yearMonth` is the join key between the enriched table and Finance targets
- Amounts and targets are stored as floats; single currency assumed
- Full replace on every upload — re-uploading overwrites all existing data

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add `DATABASE_URL` environment variable (from Neon dashboard)
4. Deploy — Vercel runs `npm run build` automatically (`postinstall` runs `prisma generate`)

> **Note:** Run `npx prisma migrate deploy` as a one-off task after the first deploy to apply migrations to the production database.

---

## What I'd Improve With More Time

- [ ] Robust column-name normalization — handle alternate headers, extra spaces, and different casing so the pipeline doesn't break on slightly different files
- [ ] Row-level upload error reporting — which rows failed and why, returned to the UI instead of just a summary count
- [ ] Role-based auth (NextAuth.js) instead of separate URL paths as the only access control
- [ ] Incremental data loads — upsert by natural key instead of full replace so re-uploading one file doesn't clobber the others
- [ ] Per-month department cost storage — costs are currently only available as region totals; the monthly cost chart estimates proportionally from that total rather than using actual per-month figures
- [ ] Persistent filter state in URL params so filtered dashboard links are shareable
- [ ] Automated tests for each pipeline stage
- [ ] CI/CD with `prisma migrate deploy` wired into Vercel deploy hooks
- [ ] Chart drill-down — clicking a region bar shows the rep breakdown for that region
