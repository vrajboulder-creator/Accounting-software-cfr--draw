// Compare xlsx CFR Detail rows vs actual Supabase data (transactions + received_funds).
// Run with: node scripts/compare-xlsx-vs-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "proj-residenceinn-wx";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// parsed_debits.json / parsed_credits.json already encode the xlsx Detail rows
// (verified 1:1 against CFR v31.xlsx by compare-xlsx-vs-db.py). Using them as the
// xlsx proxy avoids re-parsing the workbook inside Node.
const xlsxDebits = JSON.parse(fs.readFileSync(path.join(__dirname, "extracted", "parsed_debits.json"), "utf8"));
const xlsxCredits = JSON.parse(fs.readFileSync(path.join(__dirname, "extracted", "parsed_credits.json"), "utf8"));

async function fetchAll(table, cols) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from(table)
      .select(cols)
      .eq("project_id", PROJECT_ID)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

const divNumFromId = (id) => {
  if (!id) return null;
  const m = /div-.*-(\d+)$/.exec(id);
  return m ? parseInt(m[1], 10) : null;
};

const key5 = (r) =>
  `${r.divNum}|${r.drawNum ?? ""}|${r.date ?? ""}|${(r.description ?? "").trim()}|${r.grossCents}`;

console.log("Fetching Supabase data…");
const [txs, rfs] = await Promise.all([
  fetchAll("transactions", "id,division_id,draw_number,date,amount_cents,description"),
  fetchAll("received_funds", "id,division_id,draw_number,date,gross_cents,description"),
]);

const dbDebits = txs.map((t) => ({
  divNum: divNumFromId(t.division_id),
  drawNum: t.draw_number,
  date: t.date,
  description: t.description,
  grossCents: t.amount_cents,
}));
const dbCredits = rfs.map((r) => ({
  divNum: divNumFromId(r.division_id),
  drawNum: r.draw_number,
  date: r.date,
  description: r.description,
  grossCents: r.gross_cents,
}));

function report(label, xlsx, db) {
  const xSet = new Map(xlsx.map((r) => [key5(r), r]));
  const dSet = new Map(db.map((r) => [key5(r), r]));
  const onlyX = [...xSet.keys()].filter((k) => !dSet.has(k));
  const onlyD = [...dSet.keys()].filter((k) => !xSet.has(k));

  const xTotal = xlsx.reduce((s, r) => s + r.grossCents, 0);
  const dTotal = db.reduce((s, r) => s + r.grossCents, 0);

  console.log("\n" + "=".repeat(70));
  console.log(label);
  console.log("=".repeat(70));
  console.log(`xlsx rows:    ${xlsx.length}`);
  console.log(`supabase:     ${db.length}`);
  console.log(`matched:      ${xSet.size - onlyX.length}`);
  console.log(`only xlsx:    ${onlyX.length}`);
  console.log(`only db:      ${onlyD.length}`);
  console.log(`xlsx total:   $${(xTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`db total:     $${(dTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`delta:        $${((dTotal - xTotal) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  if (onlyX.length) {
    console.log("\nFirst 10 in xlsx but NOT in db:");
    onlyX.slice(0, 10).forEach((k) => {
      const r = xSet.get(k);
      console.log(`  div=${r.divNum} draw=${r.drawNum} date=${r.date} desc=${JSON.stringify((r.description || "").slice(0, 40))} gross=${(r.grossCents / 100).toFixed(2)}`);
    });
  }
  if (onlyD.length) {
    console.log("\nFirst 10 in db but NOT in xlsx:");
    onlyD.slice(0, 10).forEach((k) => {
      const r = dSet.get(k);
      console.log(`  div=${r.divNum} draw=${r.drawNum} date=${r.date} desc=${JSON.stringify((r.description || "").slice(0, 40))} gross=${(r.grossCents / 100).toFixed(2)}`);
    });
  }

  console.log("\nPer-division totals:");
  const byDivX = new Map();
  const byDivD = new Map();
  for (const r of xlsx) {
    const v = byDivX.get(r.divNum) ?? [0, 0];
    v[0]++; v[1] += r.grossCents; byDivX.set(r.divNum, v);
  }
  for (const r of db) {
    const v = byDivD.get(r.divNum) ?? [0, 0];
    v[0]++; v[1] += r.grossCents; byDivD.set(r.divNum, v);
  }
  const divs = [...new Set([...byDivX.keys(), ...byDivD.keys()])].sort((a, b) => a - b);
  console.log("  div  xlsx_n   db_n    xlsx_$          db_$            delta");
  for (const d of divs) {
    const [xn, xs] = byDivX.get(d) ?? [0, 0];
    const [dn, ds] = byDivD.get(d) ?? [0, 0];
    const mark = xn === dn && xs === ds ? "" : "  <-- MISMATCH";
    console.log(
      `  ${String(d).padStart(3)} ${String(xn).padStart(7)} ${String(dn).padStart(6)}  ` +
        `${(xs / 100).toFixed(2).padStart(14)}  ${(ds / 100).toFixed(2).padStart(14)}  ` +
        `${((ds - xs) / 100).toFixed(2).padStart(10)}${mark}`,
    );
  }
}

report("DEBITS  (xlsx  vs  transactions)", xlsxDebits, dbDebits);
report("CREDITS (xlsx  vs  received_funds)", xlsxCredits, dbCredits);
