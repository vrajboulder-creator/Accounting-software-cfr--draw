import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const PROJECT_ID = "proj-residenceinn-wx";

function loadExtracted<T = any>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "extracted", name), "utf8"));
}

async function insertChunks<T>(table: any, rows: T[], size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

async function main() {
  console.log("🌱 Seeding Supabase...");

  // ── Clear in dependency order ──────────────────────────────────────────────
  console.log("Clearing existing data...");
  await db.execute(sql`DELETE FROM audit_log`);
  await db.execute(sql`DELETE FROM invoice_backup`);
  await db.execute(sql`DELETE FROM received_funds`);
  await db.execute(sql`DELETE FROM draw_line_items`);
  await db.execute(sql`DELETE FROM draws`);
  await db.execute(sql`DELETE FROM change_orders`);
  await db.execute(sql`DELETE FROM transactions`);
  await db.execute(sql`DELETE FROM bid_line_items`);
  await db.execute(sql`DELETE FROM divisions`);
  await db.execute(sql`DELETE FROM project_memberships`);
  await db.execute(sql`DELETE FROM projects`);
  await db.execute(sql`DELETE FROM org_memberships`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`DELETE FROM organizations`);

  // ── Organizations ──────────────────────────────────────────────────────────
  console.log("Inserting organizations...");
  await db.insert(schema.organizations).values([
    { id: "org-boulder",     name: "Boulder Construction",                 type: "contractor", address: "2775 Villa Creek Dr, Suite B-240, Farmers Branch, TX 75234" },
    { id: "org-divineforce", name: "Divine Force JD RI Waxahachie, LLC",  type: "contractor" },
    { id: "org-prevail",     name: "Prevail Waxahachie, LLC",              type: "owner",      address: "205 Murphy Drive, Southlake, Texas 76092" },
    { id: "org-maust",       name: "Maust Architectural Services",         type: "architect" },
    { id: "org-summit-cpa",  name: "Summit CPA Group",                     type: "accountant" },
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log("Inserting users...");
  await db.insert(schema.users).values([
    { id: "u-pm",        email: "miguel@boulderconstruction.com", name: "Miguel Alvarez",  orgId: "org-boulder",    avatarColor: "#F26B35" },
    { id: "u-admin",     email: "sarah@boulderconstruction.com",  name: "Sarah Chen",      orgId: "org-boulder",    avatarColor: "#0EA5E9" },
    { id: "u-viewer",    email: "james@boulderconstruction.com",  name: "James O'Brien",   orgId: "org-boulder",    avatarColor: "#10B981" },
    { id: "u-owner",     email: "david@prevail-wx.com",           name: "David Patel",     orgId: "org-prevail",    avatarColor: "#8B5CF6" },
    { id: "u-architect", email: "lauren@maust-arch.com",          name: "Lauren Maust",    orgId: "org-maust",      avatarColor: "#EC4899" },
    { id: "u-accountant",email: "robert@summit-cpa.com",          name: "Robert Kim",      orgId: "org-summit-cpa", avatarColor: "#64748B" },
  ]);

  // ── Org Memberships ────────────────────────────────────────────────────────
  await db.insert(schema.orgMemberships).values([
    { id: "om-1", userId: "u-admin",     orgId: "org-boulder",    orgRole: "admin" },
    { id: "om-2", userId: "u-pm",        orgId: "org-boulder",    orgRole: "member" },
    { id: "om-3", userId: "u-viewer",    orgId: "org-boulder",    orgRole: "viewer" },
    { id: "om-4", userId: "u-owner",     orgId: "org-prevail",    orgRole: "admin" },
    { id: "om-5", userId: "u-architect", orgId: "org-maust",      orgRole: "admin" },
    { id: "om-6", userId: "u-accountant",orgId: "org-summit-cpa", orgRole: "member" },
  ]);

  // ── Projects ───────────────────────────────────────────────────────────────
  console.log("Inserting projects...");
  await db.insert(schema.projects).values([
    {
      id: "proj-residenceinn-wx",
      contractorOrgId: "org-boulder",
      ownerOrgId: "org-prevail",
      architectOrgId: "org-maust",
      name: "Residence Inn Waxahachie",
      projectNumber: "BC-2024-017",
      address: "Waxahachie, Texas",
      contractDate: "2024-07-15",
      contractSumCents: 1180000000,
      defaultRetainageBps: 1000,
      retainageOnStoredMaterials: true,
      status: "active",
      coverColor: "#F26B35",
    },
    {
      id: "proj-hilton-gardens-frisco",
      contractorOrgId: "org-boulder",
      ownerOrgId: "org-prevail",
      architectOrgId: "org-maust",
      name: "Hilton Garden Inn Frisco",
      projectNumber: "BC-2024-019",
      address: "Frisco, Texas",
      contractDate: "2024-11-02",
      contractSumCents: 1650000000,
      defaultRetainageBps: 1000,
      retainageOnStoredMaterials: true,
      status: "active",
      coverColor: "#0EA5E9",
    },
    {
      id: "proj-holiday-inn-dallas",
      contractorOrgId: "org-boulder",
      ownerOrgId: "org-prevail",
      architectOrgId: "org-maust",
      name: "Holiday Inn Express Dallas",
      projectNumber: "BC-2023-011",
      address: "Dallas, Texas",
      contractDate: "2023-05-20",
      contractSumCents: 890000000,
      defaultRetainageBps: 1000,
      retainageOnStoredMaterials: true,
      status: "completed",
      coverColor: "#10B981",
    },
  ]);

  // ── Project Memberships ────────────────────────────────────────────────────
  await db.insert(schema.projectMemberships).values([
    { id: "pm-1", projectId: PROJECT_ID, userId: "u-admin",     projectRole: "contractor_admin" },
    { id: "pm-2", projectId: PROJECT_ID, userId: "u-pm",        projectRole: "contractor_pm" },
    { id: "pm-3", projectId: PROJECT_ID, userId: "u-viewer",    projectRole: "contractor_viewer" },
    { id: "pm-4", projectId: PROJECT_ID, userId: "u-owner",     projectRole: "owner" },
    { id: "pm-5", projectId: PROJECT_ID, userId: "u-architect", projectRole: "architect" },
    { id: "pm-6", projectId: PROJECT_ID, userId: "u-accountant",projectRole: "accountant" },
  ]);

  // ── Divisions ──────────────────────────────────────────────────────────────
  console.log("Inserting divisions...");
  const divData = [
    { number: 1,  name: "General Conditions",            scheduledValueCents: 65000000 },
    { number: 2,  name: "Sitework",                      scheduledValueCents: 88600000 },
    { number: 3,  name: "Concrete",                      scheduledValueCents: 107400000 },
    { number: 4,  name: "Masonry",                       scheduledValueCents: 900000 },
    { number: 5,  name: "Metals",                        scheduledValueCents: 15500000 },
    { number: 6,  name: "Wood, Plastics & Composites",   scheduledValueCents: 130100000 },
    { number: 7,  name: "Thermal & Moisture Protection", scheduledValueCents: 100600000 },
    { number: 8,  name: "Openings",                      scheduledValueCents: 80500000 },
    { number: 9,  name: "Finishes",                      scheduledValueCents: 104000000 },
    { number: 10, name: "Specialties & Equipment",       scheduledValueCents: 43000000 },
    { number: 11, name: "Furnishings",                   scheduledValueCents: 29000000 },
    { number: 12, name: "Swimming Pool",                 scheduledValueCents: 21500000 },
    { number: 13, name: "Conveying Equipment",           scheduledValueCents: 27000000 },
    { number: 14, name: "Fire Suppression",              scheduledValueCents: 19700000 },
    { number: 15, name: "Plumbing / HVAC",               scheduledValueCents: 189100000 },
    { number: 16, name: "Electrical",                    scheduledValueCents: 118900000 },
    { number: 17, name: "General Liability",             scheduledValueCents: 9200000 },
    { number: 18, name: "Contractor's Fee",              scheduledValueCents: 30000000 },
  ];
  await db.insert(schema.divisions).values(
    divData.map((d) => ({
      id: `div-${PROJECT_ID}-${d.number}`,
      projectId: PROJECT_ID,
      number: d.number,
      name: d.name,
      scheduledValueCents: d.scheduledValueCents,
      sortOrder: d.number,
    }))
  );

  // ── Bid Line Items (from CFR Bid sheet — 118 items) ───────────────────────
  console.log("Inserting bid line items...");
  const bidItems = loadExtracted<{ divNum: number; name: string; coding: string; budgetCents: number; spendCents: number; sortOrder: number }[]>("parsed_bid.json");
  await insertChunks(schema.bidLineItems, bidItems.map((b, idx) => ({
    id: `bli-${b.divNum}-${idx + 1}`,
    divisionId: `div-${PROJECT_ID}-${b.divNum}`,
    name: b.name,
    coding: b.coding,
    budgetCents: b.budgetCents,
    sortOrder: b.sortOrder,
  })));
  console.log(`  → ${bidItems.length} bid items inserted`);

  // ── Transactions (debits from CFR Detail — 1872 rows) ──────────────────────
  console.log("Inserting transactions...");
  type DebitRow = {
    divNum: number; drawNum: number; g703: number; date: string | null;
    description: string; commentary: string;
    grossCents: number; retainageCents: number; netCents: number;
    bidItem: string; counterparty: string; paidBy: string; backup: string; type: string;
  };
  const debits = loadExtracted<DebitRow[]>("parsed_debits.json");
  const txRows = debits.map((d, idx) => ({
    id: `tx-${idx + 1}`,
    projectId: PROJECT_ID,
    divisionId: `div-${PROJECT_ID}-${d.divNum}`,
    date: d.date,
    amountCents: d.grossCents,
    retainageCents: Math.abs(d.retainageCents),
    netCents: d.netCents,
    vendor: d.counterparty || d.description.slice(0, 80) || "—",
    counterparty: d.counterparty || null,
    paidBy: d.paidBy || null,
    description: d.description || d.commentary || "—",
    commentary: d.commentary || null,
    type: "invoice" as const,
    paymentStatus: "paid" as const,
    source: "excel_import" as const,
    drawNumber: d.drawNum || null,
  }));
  await insertChunks(schema.transactions, txRows);
  console.log(`  → ${txRows.length} transactions inserted`);

  // ── Change Orders ──────────────────────────────────────────────────────────
  console.log("Inserting change orders...");
  await db.insert(schema.changeOrders).values([
    { id: "co-1", projectId: PROJECT_ID, number: 1, date: "2026-01-15", description: "Model Room additional scope (Finishes)", amountCents: 1315000, status: "pending" },
    { id: "co-2", projectId: PROJECT_ID, number: 2, date: "2026-02-08", description: "Pool heater upgrade — Owner requested",  amountCents: 845000,  status: "pending" },
  ]);

  // ── Draws (17 draws, computed from parsed G703 cumulative) ─────────────────
  console.log("Inserting 17 draws...");
  type G703Row = {
    drawNum: number; divNum: number;
    scheduledCents: number; fromPrevCents: number; thisPeriodCents: number;
    storedCents: number; completedCents: number; pctBps: number;
    balanceCents: number; retainageCents: number;
  };
  const allG703 = loadExtracted<G703Row[]>("parsed_g703.json");

  const drawRows = Array.from({ length: 17 }, (_, i) => {
    const n = i + 1;
    const lines = allG703.filter((l) => l.drawNum === n);
    const completedToDate = lines.reduce((s, l) => s + l.completedCents, 0);
    const retainage = lines.reduce((s, l) => s + l.retainageCents, 0);
    const earned = completedToDate - retainage;
    const prevLines = allG703.filter((l) => l.drawNum === n - 1);
    const prevCompleted = prevLines.reduce((s, l) => s + l.completedCents, 0);
    const prevRetn = prevLines.reduce((s, l) => s + l.retainageCents, 0);
    const prev = prevCompleted - prevRetn;
    const due = earned - prev;
    return {
      id: `draw-${PROJECT_ID}-${n}`,
      projectId: PROJECT_ID,
      number: n,
      periodEndDate: new Date(2024, 7 + Math.floor((n - 1) / 1.5), 25).toISOString().slice(0, 10),
      status: (n < 17 ? "paid" : "submitted") as "paid" | "submitted",
      line1ContractSumCents: 1180000000,
      line2NetCoCents: 0,
      line3ContractSumToDateCents: 1180000000,
      line4CompletedStoredCents: completedToDate,
      line5RetainageCents: retainage,
      line6EarnedLessRetainageCents: earned,
      line7LessPreviousCents: prev,
      line8CurrentPaymentDueCents: due,
      line9BalanceToFinishCents: 1180000000 - earned,
    };
  });
  // Override draw 17 period_end_date to exact Draw_17.xlsx date
  drawRows[16].periodEndDate = "2026-03-01";

  await db.insert(schema.draws).values(drawRows);

  // ── Draw Line Items (G703 for all 17 draws — 306 rows) ────────────────────
  console.log("Inserting G703 draw line items for all draws...");
  const dliRows = allG703.map((r) => ({
    id: `dli-${r.drawNum}-${r.divNum}`,
    drawId: `draw-${PROJECT_ID}-${r.drawNum}`,
    divisionId: `div-${PROJECT_ID}-${r.divNum}`,
    colCScheduledValueCents: r.scheduledCents,
    colDFromPreviousCents: r.fromPrevCents,
    colEThisPeriodCents: r.thisPeriodCents,
    colFMaterialsStoredCents: r.storedCents,
    colGCompletedStoredCents: r.completedCents,
    colGPercentBps: r.pctBps,
    colHBalanceCents: r.balanceCents,
    colIRetainageCents: r.retainageCents,
  }));
  await insertChunks(schema.drawLineItems, dliRows);
  console.log(`  → ${dliRows.length} G703 line items inserted`);

  // ── Received Funds (credits from CFR Detail — 274 rows) ───────────────────
  console.log("Inserting received funds (credits)...");
  type CreditRow = {
    divNum: number; drawNum: number; date: string | null;
    description: string; commentary: string;
    grossCents: number; retainageCents: number; netCents: number;
    counterparty: string;
  };
  const credits = loadExtracted<CreditRow[]>("parsed_credits.json");
  const rfRows = credits.map((c, idx) => ({
    id: `rf-${idx + 1}`,
    projectId: PROJECT_ID,
    drawId: c.drawNum ? `draw-${PROJECT_ID}-${c.drawNum}` : null,
    drawNumber: c.drawNum,
    divisionId: `div-${PROJECT_ID}-${c.divNum}`,
    date: c.date,
    description: c.description || c.commentary || `Draw ${c.drawNum} Funds`,
    grossCents: c.grossCents,
    retainageCents: Math.abs(c.retainageCents),
    netCents: c.netCents,
    counterparty: c.counterparty || null,
  }));
  await insertChunks(schema.receivedFunds, rfRows);
  console.log(`  → ${rfRows.length} credit rows inserted`);

  // ── Invoice Backup (Boulder Invoice sheet — 1711 rows for draw 17) ────────
  console.log("Inserting invoice backup...");
  type BackupRow = {
    drawNum: number; divNum: number;
    description: string; commentary: string;
    amountCents: number; retainageCents: number; netCents: number;
    checkRef: string;
  };
  const backups = loadExtracted<BackupRow[]>("parsed_invoice_backup.json");
  const ibRows = backups.map((b, idx) => ({
    id: `ib-${idx + 1}`,
    drawId: `draw-${PROJECT_ID}-${b.drawNum}`,
    g703DivisionId: `div-${PROJECT_ID}-${b.divNum}`,
    description: b.description || "—",
    commentary: b.commentary || null,
    amountCents: b.amountCents,
    retainageCents: b.retainageCents,
    netCents: b.netCents,
    checkRef: b.checkRef || null,
  }));
  await insertChunks(schema.invoiceBackup, ibRows);
  console.log(`  → ${ibRows.length} invoice backup rows inserted`);

  console.log("✅ Seed complete!");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
