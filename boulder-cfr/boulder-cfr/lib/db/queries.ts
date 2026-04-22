"use server";
import { db } from "./index";
import { nanoid } from "nanoid";
import type { Database } from "./database.types";

// ── helpers ───────────────────────────────────────────────────────────────────

function must<T>(data: T | null, error: unknown): T {
  if (error) throw new Error((error as { message: string }).message);
  return data as T;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  const { data, error } = await db.from("projects").select("*").order("name");
  return must(data, error) ?? [];
}

export async function getProjectsWithStats() {
  const projects = await getProjects();

  const { data: schedRows } = await db
    .from("divisions")
    .select("project_id, scheduled_value_cents");
  const scheduledByProject: Record<string, number> = {};
  for (const r of schedRows ?? []) {
    scheduledByProject[r.project_id] = (scheduledByProject[r.project_id] ?? 0) + Number(r.scheduled_value_cents);
  }

  const { data: spentRows } = await db
    .from("transactions")
    .select("project_id, amount_cents")
    .eq("payment_status", "paid");
  const spentByProject: Record<string, number> = {};
  for (const r of spentRows ?? []) {
    spentByProject[r.project_id] = (spentByProject[r.project_id] ?? 0) + Number(r.amount_cents);
  }

  const { data: drawRows } = await db
    .from("draws")
    .select("*")
    .order("number", { ascending: false });
  type DrawRow = NonNullable<typeof drawRows>[number];
  const latestDrawByProject: Record<string, DrawRow> = {};
  for (const d of drawRows ?? []) {
    if (!latestDrawByProject[d.project_id]) latestDrawByProject[d.project_id] = d;
  }

  return projects.map((p) => ({
    ...toCamel(p),
    scheduledCents: scheduledByProject[p.id] ?? 0,
    spentCents: spentByProject[p.id] ?? 0,
    latestDraw: latestDrawByProject[p.id] ? toCamel(latestDrawByProject[p.id]) : null,
  }));
}

export async function getProject(id: string) {
  const { data, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCamel(data) : null;
}

export async function createProject(data: {
  name: string; projectNumber?: string; address: string;
  contractorOrgId: string; ownerOrgId: string; architectOrgId: string;
  contractDate: string; contractSumCents: number;
  defaultRetainageBps: number; coverColor?: string;
}) {
  const id = `proj-${nanoid(10)}`;
  const { error } = await db.from("projects").insert({
    id, status: "active", cover_color: "#F26B35", retainage_on_stored_materials: true,
    name: data.name, project_number: data.projectNumber ?? null,
    address: data.address, contractor_org_id: data.contractorOrgId,
    owner_org_id: data.ownerOrgId, architect_org_id: data.architectOrgId,
    contract_date: data.contractDate, contract_sum_cents: data.contractSumCents,
    default_retainage_bps: data.defaultRetainageBps,
    ...(data.coverColor ? { cover_color: data.coverColor } : {}),
  });
  must(null, error);
  return id;
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  const { error } = await db.from("projects").update({ ...toSnake(data), updated_at: new Date().toISOString() }).eq("id", id);
  must(null, error);
}

// ── Divisions ─────────────────────────────────────────────────────────────────

export async function getDivisions(projectId: string) {
  const { data, error } = await db.from("divisions").select("*").eq("project_id", projectId).order("sort_order");
  return (must(data, error) ?? []).map(toCamel);
}

export async function createDivision(data: { projectId: string; number: number; name: string; scheduledValueCents: number; sortOrder?: number }) {
  const id = `div-${data.projectId}-${data.number}-${nanoid(4)}`;
  const { error } = await db.from("divisions").insert({
    id, project_id: data.projectId, number: data.number,
    name: data.name, scheduled_value_cents: data.scheduledValueCents,
    sort_order: data.sortOrder ?? data.number,
  });
  must(null, error);
  return id;
}

export async function updateDivision(id: string, data: Record<string, unknown>) {
  const { error } = await db.from("divisions").update({ ...toSnake(data), updated_at: new Date().toISOString() }).eq("id", id);
  must(null, error);
}

// ── Bid Line Items ────────────────────────────────────────────────────────────

export async function getBidLineItems(projectId: string) {
  const divs = await getDivisions(projectId);
  const divIds = divs.map((d) => d.id);
  if (!divIds.length) return [];
  const { data, error } = await db.from("bid_line_items").select("*").in("division_id", divIds).order("sort_order");
  return (must(data, error) ?? []).map(toCamel);
}

export async function getBidLineItemsByDivision(divisionId: string) {
  const { data, error } = await db.from("bid_line_items").select("*").eq("division_id", divisionId).order("sort_order");
  return (must(data, error) ?? []).map(toCamel);
}

export async function createBidLineItem(data: { divisionId: string; name: string; budgetCents: number; sortOrder?: number }) {
  const id = `bli-${nanoid(8)}`;
  const { error } = await db.from("bid_line_items").insert({
    id, division_id: data.divisionId, name: data.name,
    budget_cents: data.budgetCents, sort_order: data.sortOrder ?? 0,
  });
  must(null, error);
  return id;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(projectId: string) {
  const { data, error } = await db.from("transactions").select("*").eq("project_id", projectId).order("date", { ascending: false });
  return (must(data, error) ?? []).map(toCamel);
}

export async function createTransaction(data: {
  projectId: string; divisionId: string; bidLineItemId?: string;
  date: string; amountCents: number; vendor: string; description: string;
  type?: Database["public"]["Enums"]["tx_type"];
  paymentStatus?: Database["public"]["Enums"]["tx_payment_status"];
}) {
  const id = `tx-${nanoid(8)}`;
  const { error } = await db.from("transactions").insert({
    id, source: "manual" as const, type: data.type ?? "invoice",
    payment_status: data.paymentStatus ?? "pending",
    project_id: data.projectId, division_id: data.divisionId,
    bid_line_item_id: data.bidLineItemId ?? null,
    date: data.date, amount_cents: data.amountCents,
    vendor: data.vendor, description: data.description,
  });
  must(null, error);
  return id;
}

export async function updateTransaction(id: string, data: Record<string, unknown>) {
  const { error } = await db.from("transactions").update({ ...toSnake(data), updated_at: new Date().toISOString() }).eq("id", id);
  must(null, error);
}

export async function deleteTransaction(id: string) {
  const { error } = await db.from("transactions").delete().eq("id", id);
  must(null, error);
}

export async function getCFRActuals(projectId: string) {
  const { data, error } = await db
    .from("transactions")
    .select("division_id, amount_cents")
    .eq("project_id", projectId)
    .eq("payment_status", "paid");
  const rows = must(data, error) ?? [];
  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.division_id] = (result[r.division_id] ?? 0) + Number(r.amount_cents);
  }
  return result;
}

export async function getReceivedFundsByDivision(projectId: string) {
  const { data, error } = await db
    .from("received_funds")
    .select("division_id, gross_cents, retainage_cents, net_cents")
    .eq("project_id", projectId);
  const rows = must(data, error) ?? [];
  const result: Record<string, { grossCents: number; retainageCents: number; netCents: number }> = {};
  for (const r of rows) {
    const prev = result[r.division_id] ?? { grossCents: 0, retainageCents: 0, netCents: 0 };
    result[r.division_id] = {
      grossCents: prev.grossCents + Number(r.gross_cents),
      retainageCents: prev.retainageCents + Number(r.retainage_cents),
      netCents: prev.netCents + Number(r.net_cents),
    };
  }
  return result;
}

export async function getReceivedFunds(projectId: string) {
  const { data, error } = await db.from("received_funds").select("*").eq("project_id", projectId).order("draw_number");
  return (must(data, error) ?? []).map(toCamel);
}

export async function getInvoiceBackup(drawId: string) {
  const { data, error } = await db.from("invoice_backup").select("*").eq("draw_id", drawId);
  return (must(data, error) ?? []).map(toCamel);
}

// ── Change Orders ─────────────────────────────────────────────────────────────

export async function getChangeOrders(projectId: string) {
  const { data, error } = await db.from("change_orders").select("*").eq("project_id", projectId).order("number");
  return (must(data, error) ?? []).map(toCamel);
}

export async function createChangeOrder(data: {
  projectId: string; number: number; date: string;
  description: string; amountCents: number;
}) {
  const id = `co-${nanoid(8)}`;
  const { error } = await db.from("change_orders").insert({
    id, status: "pending", project_id: data.projectId,
    number: data.number, date: data.date,
    description: data.description, amount_cents: data.amountCents,
  });
  must(null, error);
  return id;
}

export async function updateChangeOrderStatus(id: string, status: Database["public"]["Enums"]["co_status"], approvedInDrawId?: string) {
  const { error } = await db.from("change_orders").update({
    status, approved_in_draw_id: approvedInDrawId ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  must(null, error);
}

// ── Draws ─────────────────────────────────────────────────────────────────────

export async function getDraws(projectId: string) {
  const { data, error } = await db.from("draws").select("*").eq("project_id", projectId).order("number", { ascending: false });
  return (must(data, error) ?? []).map(toCamel);
}

export async function getDraw(id: string) {
  const { data, error } = await db.from("draws").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCamel(data) : null;
}

export async function getDrawLineItems(drawId: string) {
  const { data, error } = await db.from("draw_line_items").select("*").eq("draw_id", drawId).order("division_id");
  return (must(data, error) ?? []).map(toCamel);
}

export async function createDraw(data: {
  projectId: string; number: number; periodEndDate: string;
  line1ContractSumCents: number; line2NetCoCents?: number;
}) {
  const id = `draw-${data.projectId}-${data.number}`;
  const line3 = data.line1ContractSumCents + (data.line2NetCoCents ?? 0);
  const { error } = await db.from("draws").insert({
    id, status: "draft",
    project_id: data.projectId, number: data.number,
    period_end_date: data.periodEndDate,
    line1_contract_sum_cents: data.line1ContractSumCents,
    line2_net_co_cents: data.line2NetCoCents ?? 0,
    line3_contract_sum_to_date_cents: line3,
    line4_completed_stored_cents: 0,
    line5_retainage_cents: 0,
    line6_earned_less_retainage_cents: 0,
    line7_less_previous_cents: 0,
    line8_current_payment_due_cents: 0,
    line9_balance_to_finish_cents: line3,
  });
  must(null, error);
  return id;
}

export async function upsertDrawLineItem(data: {
  drawId: string; divisionId: string;
  colCScheduledValueCents: number; colDFromPreviousCents: number;
  colEThisPeriodCents: number; colFMaterialsStoredCents: number;
  retainageBps: number;
}) {
  const colG = data.colDFromPreviousCents + data.colEThisPeriodCents + data.colFMaterialsStoredCents;
  const colGPct = data.colCScheduledValueCents > 0
    ? Math.round((colG / data.colCScheduledValueCents) * 10000) : 0;
  const colH = Math.max(0, data.colCScheduledValueCents - colG);
  const colI = Math.round((data.colDFromPreviousCents + data.colEThisPeriodCents) * data.retainageBps / 10000);
  const id = `dli-${data.drawId}-${data.divisionId}`;

  const { error } = await db.from("draw_line_items").upsert({
    id, draw_id: data.drawId, division_id: data.divisionId,
    col_c_scheduled_value_cents: data.colCScheduledValueCents,
    col_d_from_previous_cents: data.colDFromPreviousCents,
    col_e_this_period_cents: data.colEThisPeriodCents,
    col_f_materials_stored_cents: data.colFMaterialsStoredCents,
    col_g_completed_stored_cents: colG,
    col_g_percent_bps: colGPct,
    col_h_balance_cents: colH,
    col_i_retainage_cents: colI,
    updated_at: new Date().toISOString(),
  }, { onConflict: "draw_id,division_id" });
  must(null, error);
}

export async function recalcDrawTotals(drawId: string) {
  const lines = await getDrawLineItems(drawId);
  const draw = await getDraw(drawId);
  if (!draw) return;

  const line4 = lines.reduce((s, l) => s + l.colGCompletedStoredCents, 0);
  const line5 = lines.reduce((s, l) => s + l.colIRetainageCents, 0);
  const line6 = line4 - line5;
  const line8 = line6 - draw.line7LessPreviousCents;
  const line9 = draw.line3ContractSumToDateCents - line6;

  const { error } = await db.from("draws").update({
    line4_completed_stored_cents: line4,
    line5_retainage_cents: line5,
    line6_earned_less_retainage_cents: line6,
    line8_current_payment_due_cents: line8,
    line9_balance_to_finish_cents: line9,
    updated_at: new Date().toISOString(),
  }).eq("id", drawId);
  must(null, error);
}

export async function updateDrawLine7(drawId: string, line7: number) {
  const draw = await getDraw(drawId);
  if (!draw) return;
  const line8 = draw.line6EarnedLessRetainageCents - line7;
  const line9 = draw.line3ContractSumToDateCents - draw.line6EarnedLessRetainageCents;
  const { error } = await db.from("draws").update({
    line7_less_previous_cents: line7,
    line8_current_payment_due_cents: line8,
    line9_balance_to_finish_cents: line9,
    updated_at: new Date().toISOString(),
  }).eq("id", drawId);
  must(null, error);
}

export async function submitDraw(drawId: string) {
  const { error } = await db.from("draws").update({
    status: "submitted", submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", drawId);
  must(null, error);
}

export async function certifyDraw(drawId: string, certifiedBy: string) {
  const { error } = await db.from("draws").update({
    status: "certified", certified_at: new Date().toISOString(),
    certified_by: certifiedBy, updated_at: new Date().toISOString(),
  }).eq("id", drawId);
  must(null, error);
}

export async function markDrawPaid(drawId: string) {
  const { error } = await db.from("draws").update({
    status: "paid", paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", drawId);
  must(null, error);
}

// ── Users & Orgs ──────────────────────────────────────────────────────────────

export async function getUsers() {
  const { data, error } = await db.from("users").select("*").order("name");
  return (must(data, error) ?? []).map(toCamel);
}

export async function getOrganizations() {
  const { data, error } = await db.from("organizations").select("*").order("name");
  return (must(data, error) ?? []).map(toCamel);
}

export async function getProjectMemberships(projectId: string) {
  const { data, error } = await db
    .from("project_memberships")
    .select("*")
    .eq("project_id", projectId);
  const memberships = must(data, error) ?? [];
  if (!memberships.length) return [];

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const { data: usersData } = await db.from("users").select("*").in("id", userIds);
  const usersMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]));

  const orgIds = [...new Set((usersData ?? []).map((u) => u.org_id))];
  const { data: orgsData } = await db.from("organizations").select("*").in("id", orgIds);
  const orgsMap = Object.fromEntries((orgsData ?? []).map((o) => [o.id, o]));

  return memberships.map((row) => {
    const user = usersMap[row.user_id];
    return {
      membership: toCamel(row),
      user: toCamel(user),
      org: toCamel(orgsMap[user?.org_id]),
    };
  });
}

// ── Reconciliation ────────────────────────────────────────────────────────────

export async function getOverrunFlags(projectId: string) {
  const divs = await getDivisions(projectId);
  const actuals = await getCFRActuals(projectId);

  const divisionFlags = divs
    .map((d) => {
      const spent = actuals[d.id] ?? 0;
      const pct = d.scheduledValueCents > 0 ? spent / d.scheduledValueCents : 0;
      return { division: d, spent, pct, over: pct > 1.0, critical: pct > 1.2 };
    })
    .filter((f) => f.over);

  return { divisionFlags, lineItemFlags: [] };
}

// ── camelCase / snake_case converters ─────────────────────────────────────────

type SnakeToCamel<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<SnakeToCamel<T>>}`
  : S;
type CamelKeys<T> = { [K in keyof T as K extends string ? SnakeToCamel<K> : K]: T[K] };

function toCamel<T extends Record<string, unknown>>(obj: T): CamelKeys<T> {
  if (!obj || typeof obj !== "object") return obj as unknown as CamelKeys<T>;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ])
  ) as CamelKeys<T>;
}

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`),
      v,
    ])
  );
}
