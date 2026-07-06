# Company Dashboard

Sales & Operations analytics dashboard built with Next.js, Prisma, and Recharts.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Prisma** ORM with PostgreSQL (Neon)
- **SheetJS (xlsx)** for Excel parsing
- **Recharts** for data visualization
- **Zod** for schema validation

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### 2. Clone and install

```bash
git clone <repo-url>
cd company-dashboard
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Neon connection string:

```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 4. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see a landing page with links to the Sales and Finance dashboard views.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page with nav links
│   ├── dashboard/
│   │   ├── sales/page.tsx        # Sales role dashboard
│   │   └── finance/page.tsx      # Finance role dashboard
│   └── api/
│       └── upload/route.ts       # Excel upload endpoint (stub)
└── lib/
    ├── db.ts                     # Prisma client singleton
    └── pipeline/                 # Parse → clean → combine logic (to be built)

prisma/
└── schema.prisma                 # Data models
```

## Data Models

| Model | Description |
|---|---|
| `RawUpload` | Audit log of every file uploaded (SALES, HR, FINANCE) |
| `SalesTransaction` | Individual sales records (date, rep, region, product, amount) |
| `Employee` | HR/rep data including region, department, hire date, monthly target |
| `FinanceTarget` | Monthly revenue targets and costs by region/department |

## Data Assumptions

- Sales Excel: columns map to `date`, `rep_name`, `region`, `product`, `amount`, `customer_name`
- HR Excel: columns map to `rep_name`, `region`, `department`, `hire_date`, `monthly_target`
- Finance Excel: columns map to `region`, `month`, `revenue_target`, `department_cost`
- Dates are parsed with `new Date()` — ISO 8601 and Excel serial numbers both handled
- `repName` is the join key between Sales and HR data
- Amounts/targets are stored as floats; currency assumed to be a single currency

## What I'd Improve With More Time

- [ ] Robust column-name normalization (handle casing, extra spaces, alternate headers)
- [ ] Upload UI with per-file progress and error messages
- [ ] Data validation errors surfaced back to the user row-by-row
- [ ] Role-based auth (NextAuth.js) instead of just separate URL paths
- [ ] Incremental data loads (upsert instead of full replace on re-upload)
- [ ] Automated tests for the pipeline module
- [ ] CI/CD pipeline with Prisma migrate on deploy

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add `DATABASE_URL` environment variable (from Neon dashboard)
4. Deploy — Vercel runs `npm run build` automatically

> **Note:** Run `npx prisma migrate deploy` in a one-off job before or after first deploy to apply migrations against the production database.

---

## Data Pipeline

The pipeline lives in `src/lib/pipeline/` and is broken into four separate modules. Each stage is pure (no side effects) except for the console logging — making them individually testable and easy to reason about.

### Stage 1 — `parse.ts`

Reads each Excel file from a `Buffer` (or file path) using SheetJS with `cellDates: true` so Excel date serials come back as JS `Date` objects. Three functions: `parseSales`, `parseHR`, `parseFinance`. Each maps raw column names to typed interface properties. **No cleaning happens here** — raw values are preserved exactly as they appear so that `clean.ts` can make explicit, logged decisions.

Real column names discovered by inspection:

| File | Columns |
|---|---|
| sales_transactions.xlsx | `Date`, `Rep Name`, `Region`, `Product`, `Amount (USD)`, `Customer Name` |
| hr_employees.xlsx | `Rep Name`, `Region`, `Department`, `Hire Date`, `Monthly Target (USD)` |
| finance_targets.xlsx | `Region`, `Month`, `Revenue Target (USD)`, `Department Cost (USD)` |

### Stage 2 — `clean.ts`

Normalises and validates raw data. Every decision is commented inline. Key decisions:

**Dates:**
- `toISODate()` handles JS `Date` objects, `"DD/MM/YYYY"` strings (`'23/05/2022'` found in HR), ISO `"YYYY-MM-DD"` strings, and Excel serial numbers as a fallback.
- `toYearMonth()` handles `"YYYY-MM"` (most finance rows) and `"Month YYYY"` (`"July 2026"` found in the real data).

**Null amounts (sales):** Rows with null `Amount (USD)` are **excluded** (3 rows). Rationale: revenue is the entire purpose of the sales dataset — a null amount cannot be safely imputed (it's unknown, not zero). Keeping it would silently undercount revenue.

**Null monthly targets (HR):** Rows with null targets are **excluded** (1 row: second "Naledi Moyo" entry). Rationale: target attainment is a core metric; a null target makes that metric undefined.

**Duplicate HR rows:** "Naledi Moyo" appears twice with different hire dates (2022-10-12 and 2023-06-15). The second entry has a null target. Decision: keep the first row (which has a target of $8,000) and log both so a human can reconcile. The later hire date may represent an internal transfer that was never cleaned up in the source.

**Trailing whitespace:** All string fields are `.trim()`ed in `cleanSales`, `cleanHR`, and `cleanFinance`. This fixed three rep-name mismatches found in the real data: `'Ama Boateng  '`, `'Karim Hassan  '` (trailing spaces in sales), and `'Youssef El-Amin  '` (trailing spaces in HR).

**Near-duplicate names:** `flagNearDuplicateNames()` runs Levenshtein distance on all rep names after trimming and logs any pair within edit distance ≤ 3. `"Kwame Owusu"` and `"Kwame Owusu-Ansah"` have distance 6 — correctly treated as distinct people (both appear as separate entries in the HR file). The threshold flags typos and accidental hyphen variants without merging genuinely different employees.

**Exact duplicates:** Sales rows with the same `date|repName|product|amount|customer` key are removed.

### Stage 3 — `combine.ts`

Joins the three cleaned datasets into a single `EnrichedRow[]` array:

- **Sales → HR** join on `repName.toLowerCase()` (after trimming). Left-join: sales rows without an HR match are kept with `department/hireDate/monthlyTarget = null`. This preserves revenue data even if HR is incomplete.
- **Enriched → Finance** join on `region.toLowerCase() + yearMonth`. Left-join: rows without a finance match get `revenueTarget/departmentCost = null`.

Both joins use `Map` lookups for O(n) performance.

**Result from real data:** 214 enriched rows, 0 unmatched sales reps, 0 unmatched finance rows.

### Stage 4 — `metrics.ts`

Pure functions over `EnrichedRow[]`. Revenue targets and costs are **de-duplicated by region+month** before summing — otherwise every sale in a region+month would multiply-count the target (which is once per region-month in the Finance table, not once per transaction).

| Metric | Method |
|---|---|
| `revenueTrend` | Group-sum `amount` by `yearMonth`, sorted |
| `targetVsActual` | Actual = sum of amounts; target = sum of unique finance targets per region |
| `topProducts` | Group-sum `amount` by `product`, top 10 |
| `marginByRegion` | Revenue minus unique department costs per region |
| `topReps` | Group-sum `amount` by `repName`, top 10 |

**Sample output from real data:**
- Total revenue: **$1,110,047.26**
- Best attainment: West Africa (130.85%)
- Worst margin: Southern Africa (−$20,179.33)
- Top product: SmartLock X1 ($255,593)
- Top rep: Ama Boateng ($117,395)

### API Route — `POST /api/upload`

Accepts `multipart/form-data` with fields `sales`, `hr`, `finance`. Runs the full pipeline, persists all cleaned rows to Postgres in a single transaction (full replace on each upload), and returns the computed metrics as JSON. Upload events are logged to `RawUpload` for auditing.

---

## Dashboard Views

### Upload Page (`/upload`)

The entry point for the app. Three separate labeled file inputs — one each for Sales, HR, and Finance data — with client-side `.xlsx` validation before anything is sent to the server. Shows a loading state while the pipeline runs, then redirects to the Sales dashboard on success. Any server-side errors (wrong columns, DB failure) are surfaced inline rather than failing silently.

### Sales Dashboard (`/dashboard/sales`)

Framed around **performance** — who's selling, what's selling, and how regions are tracking against target.

| Section | Chart type | What it answers |
|---|---|---|
| KPI strip | Stat cards | Total revenue, overall attainment %, best region |
| Revenue vs Target by Region | Horizontal bar (green/amber/red by %) | Primary sales KPI — are we hitting targets? |
| Monthly Revenue Trend | Line chart | Is revenue growing or declining? |
| Top Reps by Revenue | Horizontal bar | Who are the top performers? |
| Top Products by Revenue | Horizontal bar | What's driving revenue? |

Target attainment is the hero section — largest chart, positioned first after the KPIs — because that's the number a sales manager opens a dashboard to check.

### Finance Dashboard (`/dashboard/finance`)

Framed around **profitability** — are we making money relative to costs, and are regions running efficiently?

| Section | Chart type | What it answers |
|---|---|---|
| KPI strip | Stat cards | Total revenue, total dept cost, net margin, budget attainment |
| Margin by Region | Grouped bar + table | Which regions are profitable? (Southern Africa flags as loss-making) |
| Budget Adherence by Region | Grouped bar + table | Revenue vs target vs cost — cost efficiency alongside attainment |
| Monthly Revenue vs Cost Trend | Composed bar+line chart | Is revenue staying above costs over time? |

The Finance view deliberately excludes rep rankings (a Sales concern) and instead pairs every attainment number with its cost context — a region overperforming its revenue target while also blowing its cost budget is not a finance success story. The margin alert for Southern Africa (−$20K) is highlighted in red automatically.

### Role Separation Design Rationale

Both dashboards share underlying data (target attainment, revenue) but interpret it differently:
- **Sales** asks: "Did we sell enough, and who drove it?"
- **Finance** asks: "Did we profit, and was the cost justified?"

The nav bar makes it trivial to switch between views during a demo.
