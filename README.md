# SaaS-Scrub

**Autonomous SaaS Management Platform for Mid-Market Companies**

Mid-market companies waste 30–40% of their SaaS spend on unused seats, zombie apps, and shadow IT. SaaS-Scrub finds and eliminates this waste automatically — functioning as an AI-powered IT and procurement department in a box.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Pages & Features](#pages--features)
6. [API Routes](#api-routes)
7. [Integrations](#integrations)
8. [AI Engine](#ai-engine)
9. [Auth & Security](#auth--security)
10. [Design System](#design-system)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)
13. [Demo Credentials](#demo-credentials)
14. [Pricing Model](#pricing-model)
15. [Roadmap](#roadmap)

---

## What It Does

SaaS-Scrub gives IT and finance teams a single pane of glass over their entire SaaS stack. It:

- **Discovers** every tool your company pays for — via Google Workspace sync, bank feed analysis (Plaid), CSV imports, or manual entry
- **Monitors** seat utilization, login activity, and spend trends across all apps in real time
- **Alerts** you to zombie apps, unused seats, redundant tools, upcoming renewals, and shadow IT
- **Automates offboarding** — generates per-employee checklists to revoke access, transfer data, and cancel subscriptions, with pre-written vendor emails
- **Detects redundancy** using an AI engine that scores tool overlap and generates consolidation plans with ROI calculations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS with custom design tokens |
| Database | Prisma v5 + SQLite (`prisma/dev.db`) |
| Auth | JWT via `jose`, httpOnly cookie (`scrub-session`) |
| Charts | Recharts (AreaChart, BarChart, PieChart) |
| Icons | Lucide React |
| Fonts | Syne (display) · DM Sans (body) · JetBrains Mono (numbers) |
| Google Integration | `googleapis` SDK — Admin SDK + OAuth2 |
| CSV Parsing | `papaparse` with auto-format detection |
| Bank Feed | `plaid` SDK (sandbox + production) |
| AI / LLM | OpenRouter API (`arcee-ai/trinity-large-preview:free`) |

---

## Project Structure

```
SaaS/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── login/           # Login with demo ticker animation
│   │   └── register/        # 2-step signup wizard
│   ├── (app)/               # Protected app shell
│   │   ├── layout.tsx       # Sidebar + main content wrapper
│   │   ├── dashboard/       # Main KPI dashboard
│   │   ├── apps/            # SaaS stack table + app detail
│   │   ├── spend/           # Spend analytics
│   │   ├── alerts/          # Alert center
│   │   ├── offboarding/     # Employee offboarding queue
│   │   ├── redundancy/      # AI redundancy analysis
│   │   ├── contracts/       # Contract management (stub)
│   │   ├── integrations/    # Data source connections
│   │   └── settings/        # Settings (stub)
│   └── api/
│       ├── auth/            # login · logout · register · me
│       ├── apps/            # CRUD for SaaS apps
│       ├── alerts/          # Alert management
│       ├── offboarding/     # Offboarding workflows
│       ├── integrations/    # Google · CSV · Plaid
│       └── ai/analyze/      # AI redundancy analysis
├── components/
│   ├── ui/                  # Button · Input · Badge · Card
│   └── layout/              # Sidebar · Header
├── lib/
│   ├── auth.ts              # JWT helpers
│   ├── db.ts                # Prisma singleton
│   ├── utils.ts             # formatCurrency · initials · CATEGORY_COLORS
│   ├── offboarding.ts       # Step generator + email drafts
│   ├── ai/
│   │   ├── openrouter.ts    # LLM client
│   │   └── redundancy.ts    # Redundancy detection engine
│   └── integrations/
│       ├── sync-engine.ts   # Shared upsert + alert generator
│       ├── google.ts        # Google Workspace OAuth2 + Admin SDK
│       ├── csv.ts           # CSV parser (bank · inventory · employees)
│       ├── plaid.ts         # Plaid bank feed + vendor matching
│       └── categories.ts    # Browser-safe category utils + CSV templates
├── prisma/
│   ├── schema.prisma        # 11-model multi-tenant schema
│   └── seed.ts              # Demo data (Acme Corp)
└── middleware.ts            # JWT route protection
```

---

## Database Schema

11 Prisma models, all scoped to `orgId` for multi-tenancy:

| Model | Purpose |
|---|---|
| `Organization` | Tenant root — name, slug, plan, domain |
| `User` | Auth users with role (owner / admin / member) |
| `Employee` | Company headcount — department, title, status, HRIS sync |
| `SaasApp` | Every discovered tool — spend, seats, status, category |
| `AppAccess` | Many-to-many: which employee uses which app, last login |
| `UsageLog` | Daily/monthly active user counts per app |
| `Integration` | Connected data sources and their sync state |
| `Contract` | Vendor contracts — renewal dates, auto-renew, notice period |
| `SpendRecord` | Individual spend transactions from bank feed or manual entry |
| `Offboarding` | Active offboarding workflows with JSON step arrays |
| `Alert` | System-generated alerts with severity, type, and metadata |

---

## Pages & Features

### `/login` — Login Page
- Split layout: animated savings ticker on the left, login form on the right
- Demo credentials displayed on-screen for easy access
- Redirects to `/dashboard` on success

### `/register` — Registration
- 2-step wizard: personal profile → company setup
- Creates org + owner user in one transaction

### `/dashboard` — Main Dashboard
- **KPI cards**: monthly spend, active apps, employees, seat utilization rate
- **Spend trend**: 6-month area chart with month-over-month delta
- **Category breakdown**: pie chart of spend by category
- **App utilization table**: top apps ranked by waste (unused seats × cost/seat)
- **AI alerts panel**: live feed of critical/warning/info alerts
- **Integration CTA**: prompts to connect data sources when running on demo data

### `/apps` — SaaS Stack
- Searchable, filterable table of all apps
- Filters: category, status (active / zombie / flagged / cancelled)
- Sort by: spend, name, utilization, seats
- Utilization bars (green/yellow/red) per app
- Contract renewal countdown badges
- **Add App modal** with name, category, spend, seat count
- Click any row → detail page

### `/apps/[id]` — App Detail
- 4 tabs: Overview · Employees · Spend · Contract
- **Overview**: notes editor, app metadata, flag/cancel/delete actions
- **Employees**: table of everyone with access, last login date, role
- **Spend**: per-app 6-month area chart
- **Contract**: renewal date, auto-renew warning, notice days

### `/spend` — Spend Analytics
- Run rate (current monthly), annual projection, MoM change
- 6-month spend trend (area chart)
- Category breakdown (horizontal bar chart)
- Top apps waterfall — ranked by monthly cost

### `/alerts` — Alert Center
- Alerts grouped by severity: Critical → Warning → Info
- Filter bar by severity
- Dismiss individual alerts or dismiss all
- Alert types: zombie app · renewal upcoming · redundancy · shadow IT · unused seats · budget exceeded

### `/offboarding` — Offboarding Queue
- **3 KPI cards**: active employees, in-progress offboardings, completed this month
- **Employee table**: searchable list with app count and potential monthly savings per person
- **Offboard button** (appears on hover) → opens confirmation modal
  - Shows employee info, full list of apps to be revoked, estimated savings
  - Optional notes field
  - Creates offboarding record and navigates to detail page
- **In-progress tracker**: card list of active offboardings with progress bars
- **Recently completed**: last 5 finished offboardings

### `/offboarding/[id]` — Offboarding Detail
- Employee info card with real-time progress bar and "savings freed so far" counter
- Steps grouped by priority: **High Priority (do first)** → Pending → Done
- Per-step actions: **Mark Done** · **Draft Email** · **Skip** · **Undo**
- Step types: Revoke Access · Transfer Data · Cancel Subscription · Notify Vendor
- **Draft Email modal**: pre-written vendor removal email with one-click copy
- Collapsible email preview inline
- Marking a step "Done" automatically:
  - Deactivates the `AppAccess` record in the database
  - Decrements the app's `activeSeats` count
  - Updates progress percentage in real time

### `/redundancy` — AI Redundancy Detection
- Scans entire SaaS stack for overlapping tools in the same category
- **Score gauge**: SVG ring 0–100 per group (green = low risk, red = high risk)
- Per-group breakdown:
  - Which app to **KEEP** (highest utilization, lowest cost-per-seat)
  - Which apps to **RETIRE** with individual spend, utilization, and seat counts
  - Monthly savings · Annual impact · Seat waste — all color-coded green/amber
  - **AI insight** (when OpenRouter key is set): why the redundancy exists, who's impacted, risk of inaction
  - **Collapsible migration plan**: numbered step-by-step consolidation guide
- **Re-analyze button**: force-clears the 1-hour cache and re-runs
- Summary banner with total savings potential
- Empty state when stack is clean

### `/integrations` — Data Sources
- 6 integration cards: Google Workspace · Okta · Azure AD · Plaid (Bank) · CSV · Rippling
- Expand each card to see: what gets imported, required environment keys, connection status
- **CSV uploader**: drag-and-drop with format auto-detection; download templates for all 3 formats
- **Plaid connect**: opens Plaid Link widget to connect a real or sandbox bank account

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Email/password login, sets `scrub-session` cookie |
| POST | `/api/auth/logout` | Clears session cookie |
| POST | `/api/auth/register` | Creates org + user |
| GET | `/api/auth/me` | Returns current user |

### Apps
| Method | Route | Description |
|---|---|---|
| GET | `/api/apps` | List all apps for org (with spend/access counts) |
| POST | `/api/apps` | Create a new app |
| GET | `/api/apps/[id]` | Single app with employees, spend, contract |
| PATCH | `/api/apps/[id]` | Update app (notes, status, seats, etc.) |
| DELETE | `/api/apps/[id]` | Delete app |

### Alerts
| Method | Route | Description |
|---|---|---|
| GET | `/api/alerts` | List active (non-dismissed) alerts |
| PATCH | `/api/alerts/[id]` | Dismiss or read an alert |

### Offboarding
| Method | Route | Description |
|---|---|---|
| GET | `/api/offboarding` | List all offboardings + active employee candidates |
| POST | `/api/offboarding` | Start a new offboarding (generates step checklist) |
| GET | `/api/offboarding/[id]` | Get offboarding with steps and progress |
| PATCH | `/api/offboarding/[id]/step` | Mark a step done/skipped/pending (fires side effects) |

### Integrations
| Method | Route | Description |
|---|---|---|
| GET | `/api/integrations` | List connected integrations |
| GET | `/api/integrations/google/auth` | Redirect to Google OAuth2 consent |
| GET | `/api/integrations/google/callback` | Handle OAuth2 callback, store tokens |
| POST | `/api/integrations/google/sync` | Sync users/apps from Google Workspace |
| POST | `/api/integrations/csv` | Upload and parse CSV (auto-detects format) |
| POST | `/api/integrations/plaid/link` | Create Plaid Link token |
| POST | `/api/integrations/plaid/exchange` | Exchange public token for access token |
| POST | `/api/integrations/plaid/sync` | Pull transactions, match vendors, detect shadow IT |

### AI
| Method | Route | Description |
|---|---|---|
| GET | `/api/ai/analyze` | Run redundancy analysis (cached 1 hour) |
| POST | `/api/ai/analyze` | Force re-analysis (clears cache) |

---

## Integrations

### Google Workspace
Connects via OAuth2. On sync, pulls:
- All users in the directory (creates/updates `Employee` records)
- All installed Marketplace apps (creates `SaasApp` records)
- User-app access relationships (`AppAccess` records)

Requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env`

### CSV Import
Auto-detects one of three formats:

| Format | Detected By | Creates |
|---|---|---|
| Bank statement | Columns: date, description, amount | `SpendRecord` + `SaasApp` via vendor matching |
| App inventory | Columns: name, category, monthly\_spend | `SaasApp` records |
| Employee list | Columns: name, email, department | `Employee` records |

Download templates directly from the integrations page.

### Plaid (Bank Feed)
- Opens Plaid Link widget in sandbox or production mode
- On sync: pulls 90 days of transactions
- Matches transactions against 26 known SaaS vendor patterns
- Flags unknown recurring charges as **shadow IT**
- Creates spend records and app records for matched vendors

Requires: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` in `.env`

---

## AI Engine

### Redundancy Detection (`lib/ai/redundancy.ts`)

**Step 1 — Heuristic scoring** (always runs, no API key needed):
- Groups apps by category
- Scores each multi-app group 0–100 based on:
  - Competitive overlap: 40+ known competing tool pairs (Slack/Teams, Jira/Asana/Linear, Figma/Sketch, Zoom/Meet, GitHub/GitLab, Salesforce/HubSpot, etc.)
  - Number of tools in category (+25 per extra tool)
  - Utilization similarity (+10 when tools have similar adoption rates)
- Picks the "KEEP" app: highest utilization, tiebreak by lowest cost-per-seat
- Generates migration steps from templates
- Estimates monthly savings and annual impact

**Step 2 — LLM enrichment** (runs when `OPENROUTER_API_KEY` is set):
- Sends all flagged groups to `arcee-ai/trinity-large-preview:free` via OpenRouter
- LLM returns: executive summary, per-group insight (why the redundancy exists, who's impacted, risk of inaction), and tailored migration steps
- Results are parsed from JSON response and merged into the heuristic output
- Cached in memory per org for 1 hour

---

## Auth & Security

- Passwords hashed with `bcryptjs` (12 rounds)
- Sessions are signed JWTs stored in `httpOnly` cookies — not accessible to JavaScript
- `middleware.ts` runs on every request and validates the session token before any page or API route is reached
- All database queries are scoped to `orgId` extracted from the verified JWT — no cross-tenant data leakage possible
- Public routes (login, register, API auth endpoints) are explicitly excluded from middleware

---

## Design System

**Theme**: Dark industrial — zero tolerance for generic SaaS blue

| Token | Value | Usage |
|---|---|---|
| `--base` | `#070809` | Page background |
| `--surface` | `#0d1117` | Card backgrounds |
| `--elevated` | `#111827` | Hover states, inputs |
| `--border` | `#1e2634` | All borders |
| `--accent` | `#00d97e` | Money green — CTAs, savings numbers |
| `--danger` | `#ff4757` | Errors, high-severity alerts |
| `--warning` | `#ffb142` | Warnings, medium alerts |
| `--info` | `#38bdf8` | Info states |

**Fonts**:
- `Syne` — headings and display text (loaded via `next/font/google`)
- `DM Sans` — body text
- `JetBrains Mono` — all numbers, currency, percentages

**Components** (in `components/ui/`):
- `Button` — variants: primary · secondary · ghost · danger · outline; sizes: xs · sm · md · lg; loading spinner state
- `Input` — label, error, hint, icon props
- `Badge` — variants: default · success · warning · danger · info · neutral
- `Card` / `CardHeader` / `CardTitle` / `CardBody` — elevated prop for layered depth

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install

```bash
cd SaaS
npm install
```

### Database Setup

```bash
npx prisma db push          # Create database from schema
npm run db:seed             # Load demo data
```

### Run

```bash
npm run dev                 # Starts on http://localhost:3000 (or next available port)
```

### Other Commands

```bash
npm run build               # Production build
npm run db:studio           # Open Prisma Studio (visual DB browser)
npm run db:migrate          # Run schema migrations
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here-change-in-production"

# Google Workspace Integration (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Plaid Bank Feed (optional)
PLAID_CLIENT_ID=""
PLAID_SECRET=""
PLAID_ENV="sandbox"           # sandbox | development | production

# AI Redundancy Analysis (optional but recommended)
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="arcee-ai/trinity-large-preview:free"
```

The app runs fully on demo data without any of the optional keys. Add them progressively to unlock each integration.

---

## Demo Credentials

```
URL:      http://localhost:3000
Email:    admin@acmecorp.io
Password: demo1234
```

**Demo org: Acme Corp**
- 12 SaaS apps across 7 categories
- 40 employees (36 active, 4 offboarded)
- 6 months of spend history
- 4 pre-seeded alerts (zombie apps, upcoming renewal, redundancy, unused seats)
- 3 zombie apps with high unused seat counts (Notion, Asana, Monday.com)

---

## Pricing Model

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0/mo | Up to 10 apps, manual entry only |
| **Growth** | $299/mo | Unlimited apps, all integrations, AI analysis |
| **Enterprise** | 20% of first-year savings | Usage-based, dedicated support, custom integrations |

The Enterprise tier is self-funding: customers only pay after SaaS-Scrub proves it saved them money.

---

## Roadmap

### Built
- [x] Multi-tenant scaffold (org, users, JWT auth, middleware)
- [x] Google Workspace integration (OAuth2 + Admin SDK sync)
- [x] CSV import (bank statement · app inventory · employee list)
- [x] Plaid bank feed (26 vendor patterns, shadow IT detection)
- [x] Dashboard (KPIs, spend trend, utilization table, alerts)
- [x] SaaS stack management (CRUD, detail view, flag/cancel)
- [x] Spend analytics (trend, category breakdown, top apps)
- [x] Alert center (severity grouping, dismiss)
- [x] Employee offboarding (step checklist, email drafts, real-time progress)
- [x] AI redundancy detection (heuristic + LLM enrichment via OpenRouter)

### Next
- [ ] Contracts page — full CRUD, renewal calendar, auto-renew warnings
- [ ] Vendor negotiation AI — benchmark pricing, draft negotiation emails
- [ ] Budget forecasting — project spend 12 months out, flag budget overruns
- [ ] Multi-user invite flow — invite teammates by email with role assignment
- [ ] Public marketing landing page with demo request form
- [ ] Okta / Azure AD integrations
- [ ] Slack notifications for critical alerts
