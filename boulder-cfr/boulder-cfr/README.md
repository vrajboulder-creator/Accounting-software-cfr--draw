# Boulder CFR & Draw Management System

A Next.js prototype of the construction billing & budget tracking system described in `PRD_v3_Construction_CFR_Draw_System.docx`.

Built for **Boulder Construction** (orange-on-white branding matching the logo).

## What this is

A multi-tenant construction billing platform prototype featuring:

- **Login** with split-panel branding and marketing hero
- **Projects list** — portfolio view of contracts with progress, draw status, contract sum
- **Overview dashboard** — contract stats, draw history timeline, overrun alerts
- **CFR (Cost-to-Finish Report)** — 3 sub-tabs: Summary (division rollup), Bid (line items with overrun flags), Detail (transactions)
- **Draws list** — AIA G702/G703 pay applications with status filtering per role
- **Draw detail** — the centerpiece. G702 cover page + G703 continuation sheet **with the CFR context pane** side-by-side so the PM can see "am I billing within remaining budget?" at a glance
- **Transactions** — full cost ledger with vendor, division coding, payment status
- **Change Orders** — contract modifications tracked separately
- **Team** — project memberships and role assignments
- **Settings** — project configuration
- **Role switcher** (bottom-right floating widget) — instantly preview the UI as any of 6 roles. Owner has CFR locked out at the route level.

## Data

Seeded with real values from your reference files (`CFR_v31.xlsx` and `Draw_17.xlsx`) — Residence Inn Waxahachie, $11.8M contract, Draw #17 with actual G703 numbers, the overrun line items (Flooring Install 213%, Metal Flashing 423%, Guest Room Windows 164%), and representative Boulder invoice transactions.

All data is in-memory (`lib/data/seed.ts`). Phase 2 would swap this for Supabase or Postgres.

## Stack

- **Next.js 15** (App Router) + React 19
- **TypeScript** strict
- **Tailwind CSS** with Boulder orange palette (`#F26B35`)
- **shadcn/ui** component primitives (Radix)
- **Framer Motion** for animations
- **Lucide React** icons
- Fonts: Inter (body), Space Grotesk (display), JetBrains Mono (numbers)

## Getting started

```bash
# 1. Install
npm install

# 2. Run dev server
npm run dev

# 3. Open http://localhost:3000
```

Any email/password combination works on login — it's a prototype. Use the **role switcher** (bottom-right) to preview the app as:

| Role | Sees CFR | Sees Draws | Can edit | Can certify |
|---|---|---|---|---|
| Contractor Admin | ✓ | ✓ | ✓ | |
| Contractor PM (default) | ✓ | ✓ | ✓ (drafts) | |
| Contractor Viewer | ✓ | ✓ | | |
| Owner | **Locked** | ✓ (submitted+) | | |
| Architect | Summary only | ✓ | | ✓ |
| Accountant | ✓ (read) | ✓ (read) | | |

## Project structure

```
boulder-cfr/
├─ app/
│  ├─ layout.tsx              # Root layout with RoleProvider + RoleSwitcher
│  ├─ globals.css             # Tailwind + Boulder brand tokens
│  ├─ page.tsx                # Redirects to /login
│  ├─ login/page.tsx          # Login with split-panel hero
│  └─ projects/
│     ├─ page.tsx             # Projects list (portfolio)
│     └─ [id]/
│        ├─ layout.tsx        # TopBar + ProjectTabs wrapper
│        ├─ page.tsx          # Overview dashboard
│        ├─ cfr/page.tsx      # CFR with 3 sub-tabs
│        ├─ draws/
│        │  ├─ page.tsx       # Draws list
│        │  └─ [drawId]/page.tsx  # Draw detail with CFR split-pane ⭐
│        ├─ transactions/page.tsx
│        ├─ change-orders/page.tsx
│        ├─ team/page.tsx
│        └─ settings/page.tsx
├─ components/
│  ├─ ui/                     # shadcn primitives
│  ├─ boulder-logo.tsx        # Brand mark (outlined or filled)
│  ├─ role-context.tsx        # RoleProvider + useRole hook
│  ├─ role-switcher.tsx       # Floating bottom-right widget
│  ├─ shell.tsx               # TopBar + ProjectTabs
│  └─ stat-card.tsx
└─ lib/
   ├─ types.ts                # Domain model types
   ├─ roles.ts                # Permission rules
   ├─ utils.ts                # cn, formatCurrency, formatPercent, formatDate
   └─ data/seed.ts            # All seeded data from Excel files
```

## The critical display rule (from your PRD)

The Draw Detail view (`app/projects/[id]/draws/[drawId]/page.tsx`) implements the rule you asked for:

- **Draw view** shows the Draw (G702 + G703) **AND** the CFR context pane on the right by default
- Users can toggle the CFR pane with "Hide CFR" / "Show CFR"
- For **Owner role**, the CFR pane is completely hidden — replaced with a "restricted" lock message
- Each CFR row aligns visually with the corresponding G703 division so the PM can spot overruns while billing

## Next steps (phase 2)

1. **Database** — Supabase or Postgres with the schema in PRD section 8.2
2. **Auth** — Clerk, Auth0, or Supabase Auth (org + project RBAC)
3. **Real G702/G703 PDF export** — Puppeteer-rendered, matches AIA 1992 exactly
4. **Excel import** — parse `CFR_v31`-shape and `Draw_17`-shape files via SheetJS
5. **Reconciliation engine** — the checks from PRD section 7.6
6. **Invoice backup ingestion** — Boulder Invoice sheet → transaction rows

## Brand

- **Primary orange**: `#F26B35` (Boulder 500)
- **Display font**: Space Grotesk (bold, tight tracking — echoes the chunky logo)
- **Body font**: Inter
- **Tabular numbers**: JetBrains Mono for large currency values

The outlined wordmark style used in the login hero matches the stroke-only treatment of the uploaded Boulder logo.

---

Prototype built from `CFR_v31.xlsx` + `Draw_17.xlsx` reference data. See `PRD_v3_Construction_CFR_Draw_System.docx` for full requirements.
