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
