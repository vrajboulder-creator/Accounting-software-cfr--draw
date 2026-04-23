// Supabase-based seeder. Runs directly with `node scripts/seed-supabase.mjs`.
// Wipes and repopulates divisions, bid line items, transactions, draws,
// draw_line_items, received_funds, invoice_backup for one project.

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const PROJECT_ID = "proj-residenceinn-wx";

function loadExtracted(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "extracted", name), "utf8"));
}

async function chunkInsert(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await sb.from(table).insert(slice);
    if (error) {
      console.error(`Insert into ${table} failed at chunk ${i}:`, error.message);
      throw error;
    }
  }
}

async function wipe(table) {
  const { error } = await sb.from(table).delete().neq("id", "__never__");
  if (error) throw error;
}

async function main() {
  console.log("Wiping existing data…");
  for (const t of [
    "audit_log",
    "invoice_backup",
    "received_funds",
    "draw_line_items",
    "draws",
    "change_orders",
    "transactions",
    "bid_line_items",
    "divisions",
    "project_memberships",
    "projects",
    "org_memberships",
    "users",
    "organizations",
  ]) {
    await wipe(t);
    console.log(`  cleared ${t}`);
  }

  console.log("Organizations…");
  await sb.from("organizations").insert([
    { id: "org-boulder",     name: "Boulder Construction",                 type: "contractor", address: "2775 Villa Creek Dr, Suite B-240, Farmers Branch, TX 75234" },
    { id: "org-divineforce", name: "Divine Force JD RI Waxahachie, LLC",  type: "contractor" },
    { id: "org-prevail",     name: "Prevail Waxahachie, LLC",              type: "owner",      address: "205 Murphy Drive, Southlake, Texas 76092" },
    { id: "org-maust",       name: "Maust Architectural Services",         type: "architect" },
    { id: "org-summit-cpa",  name: "Summit CPA Group",                     type: "accountant" },
  ]).throwOnError();

  console.log("Users…");
  await sb.from("users").insert([
    { id: "u-pm",         email: "miguel@boulderconstruction.com", name: "Miguel Alvarez", org_id: "org-boulder",    avatar_color: "#F26B35" },
    { id: "u-admin",      email: "sarah@boulderconstruction.com",  name: "Sarah Chen",     org_id: "org-boulder",    avatar_color: "#0EA5E9" },
    { id: "u-viewer",     email: "james@boulderconstruction.com",  name: "James O'Brien",  org_id: "org-boulder",    avatar_color: "#10B981" },
    { id: "u-owner",      email: "david@prevail-wx.com",           name: "David Patel",    org_id: "org-prevail",    avatar_color: "#8B5CF6" },
    { id: "u-architect",  email: "lauren@maust-arch.com",          name: "Lauren Maust",   org_id: "org-maust",      avatar_color: "#EC4899" },
    { id: "u-accountant", email: "robert@summit-cpa.com",          name: "Robert Kim",     org_id: "org-summit-cpa", avatar_color: "#64748B" },
  ]).throwOnError();

  await sb.from("org_memberships").insert([
    { id: "om-1", user_id: "u-admin",      org_id: "org-boulder",    org_role: "admin" },
    { id: "om-2", user_id: "u-pm",         org_id: "org-boulder",    org_role: "member" },
    { id: "om-3", user_id: "u-viewer",     org_id: "org-boulder",    org_role: "viewer" },
    { id: "om-4", user_id: "u-owner",      org_id: "org-prevail",    org_role: "admin" },
    { id: "om-5", user_id: "u-architect",  org_id: "org-maust",      org_role: "admin" },
    { id: "om-6", user_id: "u-accountant", org_id: "org-summit-cpa", org_role: "member" },
  ]).throwOnError();

  console.log("Projects…");
  await sb.from("projects").insert([
    {
      id: PROJECT_ID, contractor_org_id: "org-boulder", owner_org_id: "org-prevail", architect_org_id: "org-maust",
      name: "Residence Inn Waxahachie", project_number: "BC-2024-017", address: "Waxahachie, Texas",
      contract_date: "2024-07-15", contract_sum_cents: 1180000000, default_retainage_bps: 1000,
      retainage_on_stored_materials: true, status: "active", cover_color: "#F26B35",
    },
    {
      id: "proj-hilton-gardens-frisco", contractor_org_id: "org-boulder", owner_org_id: "org-prevail", architect_org_id: "org-maust",
      name: "Hilton Garden Inn Frisco", project_number: "BC-2024-019", address: "Frisco, Texas",
      contract_date: "2024-11-02", contract_sum_cents: 1650000000, default_retainage_bps: 1000,
      retainage_on_stored_materials: true, status: "active", cover_color: "#0EA5E9",
    },
    {
      id: "proj-holiday-inn-dallas", contractor_org_id: "org-boulder", owner_org_id: "org-prevail", architect_org_id: "org-maust",
      name: "Holiday Inn Express Dallas", project_number: "BC-2023-011", address: "Dallas, Texas",
      contract_date: "2023-05-20", contract_sum_cents: 890000000, default_retainage_bps: 1000,
      retainage_on_stored_materials: true, status: "completed", cover_color: "#10B981",
    },
  ]).throwOnError();

  await sb.from("project_memberships").insert([
    { id: "pm-1", project_id: PROJECT_ID, user_id: "u-admin",      project_role: "contractor_admin" },
    { id: "pm-2", project_id: PROJECT_ID, user_id: "u-pm",         project_role: "contractor_pm" },
    { id: "pm-3", project_id: PROJECT_ID, user_id: "u-viewer",     project_role: "contractor_viewer" },
    { id: "pm-4", project_id: PROJECT_ID, user_id: "u-owner",      project_role: "owner" },
    { id: "pm-5", project_id: PROJECT_ID, user_id: "u-architect",  project_role: "architect" },
    { id: "pm-6", project_id: PROJECT_ID, user_id: "u-accountant", project_role: "accountant" },
  ]).throwOnError();

  console.log("Divisions…");
  const divData = [
    { number: 1,  name: "General Conditions",            scheduled_value_cents: 65000000 },
    { number: 2,  name: "Sitework",                      scheduled_value_cents: 88600000 },
    { number: 3,  name: "Concrete",                      scheduled_value_cents: 107400000 },
    { number: 4,  name: "Masonry",                       scheduled_value_cents: 900000 },
    { number: 5,  name: "Metals",                        scheduled_value_cents: 15500000 },
    { number: 6,  name: "Wood, Plastics & Composites",   scheduled_value_cents: 130100000 },
    { number: 7,  name: "Thermal & Moisture Protection", scheduled_value_cents: 100600000 },
    { number: 8,  name: "Openings",                      scheduled_value_cents: 80500000 },
    { number: 9,  name: "Finishes",                      scheduled_value_cents: 104000000 },
    { number: 10, name: "Specialties & Equipment",       scheduled_value_cents: 43000000 },
    { number: 11, name: "Furnishings",                   scheduled_value_cents: 29000000 },
    { number: 12, name: "Swimming Pool",                 scheduled_value_cents: 21500000 },
    { number: 13, name: "Conveying Equipment",           scheduled_value_cents: 27000000 },
    { number: 14, name: "Fire Suppression",              scheduled_value_cents: 19700000 },
    { number: 15, name: "Plumbing / HVAC",               scheduled_value_cents: 189100000 },
    { number: 16, name: "Electrical",                    scheduled_value_cents: 118900000 },
    { number: 17, name: "General Liability",             scheduled_value_cents: 9200000 },
    { number: 18, name: "Contractor's Fee",              scheduled_value_cents: 30000000 },
  ];
  await sb.from("divisions").insert(
    divData.map((d) => ({
      id: `div-${PROJECT_ID}-${d.number}`,
      project_id: PROJECT_ID,
      number: d.number,
      name: d.name,
      scheduled_value_cents: d.scheduled_value_cents,
      sort_order: d.number,
    }))
  ).throwOnError();

  console.log("Bid line items…");
  const bidItems = loadExtracted("parsed_bid.json");
  const bidItemRows = bidItems.map((b, idx) => ({
    id: `bli-${b.divNum}-${idx + 1}`,
    division_id: `div-${PROJECT_ID}-${b.divNum}`,
    name: b.name,
    coding: b.coding || null,
    budget_cents: b.budgetCents,
    sort_order: b.sortOrder,
  }));
  await chunkInsert("bid_line_items", bidItemRows);
  console.log(`  → ${bidItemRows.length} bid items`);

  // Map (divNum, lowercase name) → bli id so transactions can reference by name
  const bliByNameDiv = new Map();
  for (const b of bidItemRows) {
    const divNum = Number(b.division_id.split("-").pop());
    bliByNameDiv.set(`${divNum}::${(b.name || "").trim().toLowerCase()}`, b.id);
  }

  console.log("Transactions…");
  const debits = loadExtracted("parsed_debits.json");
  // Sequential unique codes per division: RIW-CFR-{div:02}-{seq:03}
  const seqByDiv = {};
  let matchedBli = 0;
  const txRows = debits.map((d, idx) => {
    const divNum = d.divNum;
    seqByDiv[divNum] = (seqByDiv[divNum] ?? 0) + 1;
    const uniqueCode = `RIW-CFR-${String(divNum).padStart(2, "0")}-${String(seqByDiv[divNum]).padStart(3, "0")}`;
    const bliId = d.bidItem ? bliByNameDiv.get(`${divNum}::${d.bidItem.trim().toLowerCase()}`) : null;
    if (bliId) matchedBli++;
    return {
      id: `tx-${idx + 1}`,
      project_id: PROJECT_ID,
      division_id: `div-${PROJECT_ID}-${d.divNum}`,
      bid_line_item_id: bliId || null,
      date: d.date,
      amount_cents: d.grossCents,
      retainage_cents: Math.abs(d.retainageCents),
      net_cents: d.netCents,
      vendor: d.counterparty || (d.description ? d.description.slice(0, 80) : "—"),
      counterparty: d.counterparty || null,
      paid_by: d.paidBy || null,
      description: d.description || d.commentary || "—",
      commentary: d.commentary || null,
      type: "invoice",
      payment_status: "paid",
      source: "excel_import",
      draw_number: d.drawNum || null,
      backup: d.backup || null,
      g703: d.g703 || null,
      unique_code: uniqueCode,
      payment_type: d.type || null,
      received_k1: d.receivedK1 || null,
    };
  });
  console.log(`  → matched ${matchedBli}/${debits.length} transactions to bid line items by name`);
  await chunkInsert("transactions", txRows);
  console.log(`  → ${txRows.length} transactions`);

  console.log("Change orders…");
  await sb.from("change_orders").insert([
    { id: "co-1", project_id: PROJECT_ID, number: 1, date: "2026-01-15", description: "Model Room additional scope (Finishes)", amount_cents: 1315000, status: "pending" },
    { id: "co-2", project_id: PROJECT_ID, number: 2, date: "2026-02-08", description: "Pool heater upgrade — Owner requested",  amount_cents: 845000,  status: "pending" },
  ]).throwOnError();

  console.log("Draws (17)…");
  const allG703 = loadExtracted("parsed_g703.json");
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
      project_id: PROJECT_ID,
      number: n,
      period_end_date: new Date(2024, 7 + Math.floor((n - 1) / 1.5), 25).toISOString().slice(0, 10),
      status: n < 17 ? "paid" : "submitted",
      line1_contract_sum_cents: 1180000000,
      line2_net_co_cents: 0,
      line3_contract_sum_to_date_cents: 1180000000,
      line4_completed_stored_cents: completedToDate,
      line5_retainage_cents: retainage,
      line6_earned_less_retainage_cents: earned,
      line7_less_previous_cents: prev,
      line8_current_payment_due_cents: due,
      line9_balance_to_finish_cents: 1180000000 - earned,
    };
  });
  drawRows[16].period_end_date = "2026-03-01";
  await sb.from("draws").insert(drawRows).throwOnError();

  console.log("Draw line items (G703)…");
  const dliRows = allG703.map((r) => ({
    id: `dli-${r.drawNum}-${r.divNum}`,
    draw_id: `draw-${PROJECT_ID}-${r.drawNum}`,
    division_id: `div-${PROJECT_ID}-${r.divNum}`,
    col_c_scheduled_value_cents: r.scheduledCents,
    col_d_from_previous_cents: r.fromPrevCents,
    col_e_this_period_cents: r.thisPeriodCents,
    col_f_materials_stored_cents: r.storedCents,
    col_g_completed_stored_cents: r.completedCents,
    col_g_percent_bps: r.pctBps,
    col_h_balance_cents: r.balanceCents,
    col_i_retainage_cents: r.retainageCents,
  }));
  await chunkInsert("draw_line_items", dliRows);
  console.log(`  → ${dliRows.length} G703 line items`);

  console.log("Received funds (credits)…");
  const credits = loadExtracted("parsed_credits.json");
  const rfRows = credits.map((c, idx) => ({
    id: `rf-${idx + 1}`,
    project_id: PROJECT_ID,
    draw_id: c.drawNum ? `draw-${PROJECT_ID}-${c.drawNum}` : null,
    draw_number: c.drawNum,
    division_id: `div-${PROJECT_ID}-${c.divNum}`,
    date: c.date,
    description: c.description || c.commentary || `Draw ${c.drawNum} Funds`,
    gross_cents: c.grossCents,
    retainage_cents: Math.abs(c.retainageCents),
    net_cents: c.netCents,
    counterparty: c.counterparty || null,
    g703: c.g703 || null,
  }));
  await chunkInsert("received_funds", rfRows);
  console.log(`  → ${rfRows.length} credits`);

  console.log("Invoice backup…");
  const backups = loadExtracted("parsed_invoice_backup.json");
  const ibRows = backups.map((b, idx) => ({
    id: `ib-${idx + 1}`,
    draw_id: `draw-${PROJECT_ID}-${b.drawNum}`,
    g703_division_id: `div-${PROJECT_ID}-${b.divNum}`,
    description: b.description || "—",
    commentary: b.commentary || null,
    amount_cents: b.amountCents,
    retainage_cents: b.retainageCents,
    net_cents: b.netCents,
    check_ref: b.checkRef || null,
  }));
  await chunkInsert("invoice_backup", ibRows);
  console.log(`  → ${ibRows.length} invoice backup rows`);

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
