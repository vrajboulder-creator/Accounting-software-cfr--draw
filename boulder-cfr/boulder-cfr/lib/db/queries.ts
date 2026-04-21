"use server";
import { db } from "./index";
import * as schema from "./schema";
import { eq, desc, asc, and, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  return db.select().from(schema.projects).orderBy(asc(schema.projects.name));
}

export async function getProjectsWithStats() {
  const projects = await db.select().from(schema.projects).orderBy(asc(schema.projects.name));

  const schedRows = await db
    .select({
      projectId: schema.divisions.projectId,
      scheduledCents: sql<string>`sum(${schema.divisions.scheduledValueCents})`,
    })
    .from(schema.divisions)
    .groupBy(schema.divisions.projectId);
  const scheduledByProject = Object.fromEntries(schedRows.map((r) => [r.projectId, Number(r.scheduledCents ?? 0)]));

  const spentRows = await db
    .select({
      projectId: schema.transactions.projectId,
      spentCents: sql<string>`sum(${schema.transactions.amountCents})`,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.paymentStatus, "paid"))
    .groupBy(schema.transactions.projectId);
  const spentByProject = Object.fromEntries(spentRows.map((r) => [r.projectId, Number(r.spentCents ?? 0)]));

  const latestDraws = await db
    .select()
    .from(schema.draws)
    .orderBy(desc(schema.draws.number));
  const latestDrawByProject: Record<string, typeof latestDraws[0]> = {};
  for (const d of latestDraws) {
    if (!latestDrawByProject[d.projectId]) latestDrawByProject[d.projectId] = d;
  }

  return projects.map((p) => ({
    ...p,
    scheduledCents: scheduledByProject[p.id] ?? 0,
    spentCents: spentByProject[p.id] ?? 0,
    latestDraw: latestDrawByProject[p.id] ?? null,
  }));
}

export async function getProject(id: string) {
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  return rows[0] ?? null;
}

export async function createProject(data: {
  name: string; projectNumber?: string; address: string;
  contractorOrgId: string; ownerOrgId: string; architectOrgId: string;
  contractDate: string; contractSumCents: number;
  defaultRetainageBps: number; coverColor?: string;
}) {
  const id = `proj-${nanoid(10)}`;
  await db.insert(schema.projects).values({ id, status: "active", coverColor: "#F26B35", retainageOnStoredMaterials: true, ...data });
  return id;
}

export async function updateProject(id: string, data: Partial<typeof schema.projects.$inferInsert>) {
  await db.update(schema.projects).set({ ...data, updatedAt: new Date() }).where(eq(schema.projects.id, id));
}

// ── Divisions ─────────────────────────────────────────────────────────────────

export async function getDivisions(projectId: string) {
  return db.select().from(schema.divisions)
    .where(eq(schema.divisions.projectId, projectId))
    .orderBy(asc(schema.divisions.sortOrder));
}

export async function createDivision(data: { projectId: string; number: number; name: string; scheduledValueCents: number; sortOrder?: number }) {
  const id = `div-${data.projectId}-${data.number}-${nanoid(4)}`;
  await db.insert(schema.divisions).values({ id, sortOrder: data.number, ...data });
  return id;
}

export async function updateDivision(id: string, data: Partial<typeof schema.divisions.$inferInsert>) {
  await db.update(schema.divisions).set({ ...data, updatedAt: new Date() }).where(eq(schema.divisions.id, id));
}

// ── Bid Line Items ────────────────────────────────────────────────────────────

export async function getBidLineItems(projectId: string) {
  const divs = await getDivisions(projectId);
  const divIds = divs.map((d) => d.id);
  if (!divIds.length) return [];
  return db.select().from(schema.bidLineItems)
    .where(inArray(schema.bidLineItems.divisionId, divIds))
    .orderBy(asc(schema.bidLineItems.sortOrder));
}

export async function getBidLineItemsByDivision(divisionId: string) {
  return db.select().from(schema.bidLineItems)
    .where(eq(schema.bidLineItems.divisionId, divisionId))
    .orderBy(asc(schema.bidLineItems.sortOrder));
}

export async function createBidLineItem(data: { divisionId: string; name: string; budgetCents: number; sortOrder?: number }) {
  const id = `bli-${nanoid(8)}`;
  await db.insert(schema.bidLineItems).values({ id, sortOrder: 0, ...data });
  return id;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(projectId: string) {
  return db.select().from(schema.transactions)
    .where(eq(schema.transactions.projectId, projectId))
    .orderBy(desc(schema.transactions.date));
}

export async function createTransaction(data: {
  projectId: string; divisionId: string; bidLineItemId?: string;
  date: string; amountCents: number; vendor: string; description: string;
  type?: "invoice" | "payroll" | "expense" | "change_order_cost" | "credit";
  paymentStatus?: "pending" | "paid" | "voided";
}) {
  const id = `tx-${nanoid(8)}`;
  await db.insert(schema.transactions).values({ id, source: "manual", type: "invoice", paymentStatus: "pending", ...data });
  return id;
}

export async function updateTransaction(id: string, data: Partial<typeof schema.transactions.$inferInsert>) {
  await db.update(schema.transactions).set({ ...data, updatedAt: new Date() }).where(eq(schema.transactions.id, id));
}

export async function deleteTransaction(id: string) {
  await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
}

// CFR: compute actuals from transactions per division (gross spend)
export async function getCFRActuals(projectId: string) {
  const rows = await db
    .select({
      divisionId: schema.transactions.divisionId,
      totalCents: sql<string>`sum(${schema.transactions.amountCents})`,
    })
    .from(schema.transactions)
    .where(and(
      eq(schema.transactions.projectId, projectId),
      eq(schema.transactions.paymentStatus, "paid"),
    ))
    .groupBy(schema.transactions.divisionId);
  return Object.fromEntries(rows.map((r) => [r.divisionId, Number(r.totalCents ?? 0)]));
}

// CFR: net received per division (credits from owner draws)
export async function getReceivedFundsByDivision(projectId: string) {
  const rows = await db
    .select({
      divisionId: schema.receivedFunds.divisionId,
      grossCents: sql<string>`sum(${schema.receivedFunds.grossCents})`,
      retainageCents: sql<string>`sum(${schema.receivedFunds.retainageCents})`,
      netCents: sql<string>`sum(${schema.receivedFunds.netCents})`,
    })
    .from(schema.receivedFunds)
    .where(eq(schema.receivedFunds.projectId, projectId))
    .groupBy(schema.receivedFunds.divisionId);
  return Object.fromEntries(rows.map((r) => [r.divisionId, {
    grossCents: Number(r.grossCents ?? 0),
    retainageCents: Number(r.retainageCents ?? 0),
    netCents: Number(r.netCents ?? 0),
  }]));
}

export async function getReceivedFunds(projectId: string) {
  return db.select().from(schema.receivedFunds)
    .where(eq(schema.receivedFunds.projectId, projectId))
    .orderBy(asc(schema.receivedFunds.drawNumber));
}

export async function getInvoiceBackup(drawId: string) {
  return db.select().from(schema.invoiceBackup)
    .where(eq(schema.invoiceBackup.drawId, drawId));
}

// ── Change Orders ─────────────────────────────────────────────────────────────

export async function getChangeOrders(projectId: string) {
  return db.select().from(schema.changeOrders)
    .where(eq(schema.changeOrders.projectId, projectId))
    .orderBy(asc(schema.changeOrders.number));
}

export async function createChangeOrder(data: {
  projectId: string; number: number; date: string;
  description: string; amountCents: number;
}) {
  const id = `co-${nanoid(8)}`;
  await db.insert(schema.changeOrders).values({ id, status: "pending", ...data });
  return id;
}

export async function updateChangeOrderStatus(id: string, status: "pending" | "approved" | "rejected", approvedInDrawId?: string) {
  await db.update(schema.changeOrders)
    .set({ status, approvedInDrawId: approvedInDrawId ?? null, updatedAt: new Date() })
    .where(eq(schema.changeOrders.id, id));
}

// ── Draws ─────────────────────────────────────────────────────────────────────

export async function getDraws(projectId: string) {
  return db.select().from(schema.draws)
    .where(eq(schema.draws.projectId, projectId))
    .orderBy(desc(schema.draws.number));
}

export async function getDraw(id: string) {
  const rows = await db.select().from(schema.draws).where(eq(schema.draws.id, id));
  return rows[0] ?? null;
}

export async function getDrawLineItems(drawId: string) {
  return db.select().from(schema.drawLineItems)
    .where(eq(schema.drawLineItems.drawId, drawId))
    .orderBy(asc(schema.drawLineItems.divisionId));
}

export async function createDraw(data: {
  projectId: string; number: number; periodEndDate: string;
  line1ContractSumCents: number; line2NetCoCents?: number;
}) {
  const id = `draw-${data.projectId}-${data.number}`;
  const line3 = data.line1ContractSumCents + (data.line2NetCoCents ?? 0);
  await db.insert(schema.draws).values({
    id,
    status: "draft",
    line2NetCoCents: 0,
    line3ContractSumToDateCents: line3,
    line4CompletedStoredCents: 0,
    line5RetainageCents: 0,
    line6EarnedLessRetainageCents: 0,
    line7LessPreviousCents: 0,
    line8CurrentPaymentDueCents: 0,
    line9BalanceToFinishCents: line3,
    ...data,
  });
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
    ? Math.round((colG / data.colCScheduledValueCents) * 10000)
    : 0;
  const colH = Math.max(0, data.colCScheduledValueCents - colG);
  const colI = Math.round((data.colDFromPreviousCents + data.colEThisPeriodCents) * data.retainageBps / 10000);

  const id = `dli-${data.drawId}-${data.divisionId}`;
  await db.insert(schema.drawLineItems).values({
    id,
    drawId: data.drawId,
    divisionId: data.divisionId,
    colCScheduledValueCents: data.colCScheduledValueCents,
    colDFromPreviousCents: data.colDFromPreviousCents,
    colEThisPeriodCents: data.colEThisPeriodCents,
    colFMaterialsStoredCents: data.colFMaterialsStoredCents,
    colGCompletedStoredCents: colG,
    colGPercentBps: colGPct,
    colHBalanceCents: colH,
    colIRetainageCents: colI,
  }).onConflictDoUpdate({
    target: [schema.drawLineItems.drawId, schema.drawLineItems.divisionId],
    set: {
      colCScheduledValueCents: data.colCScheduledValueCents,
      colDFromPreviousCents: data.colDFromPreviousCents,
      colEThisPeriodCents: data.colEThisPeriodCents,
      colFMaterialsStoredCents: data.colFMaterialsStoredCents,
      colGCompletedStoredCents: colG,
      colGPercentBps: colGPct,
      colHBalanceCents: colH,
      colIRetainageCents: colI,
      updatedAt: new Date(),
    },
  });
}

export async function recalcDrawTotals(drawId: string) {
  const lines = await getDrawLineItems(drawId);
  const draw = await getDraw(drawId);
  if (!draw) return;

  const line4 = lines.reduce((s, l) => s + l.colGCompletedStoredCents, 0);
  const line5 = lines.reduce((s, l) => s + l.colIRetainageCents, 0);
  const line6 = line4 - line5;
  const line7 = draw.line7LessPreviousCents;
  const line8 = line6 - line7;
  const line9 = draw.line3ContractSumToDateCents - line6;

  await db.update(schema.draws).set({
    line4CompletedStoredCents: line4,
    line5RetainageCents: line5,
    line6EarnedLessRetainageCents: line6,
    line8CurrentPaymentDueCents: line8,
    line9BalanceToFinishCents: line9,
    updatedAt: new Date(),
  }).where(eq(schema.draws.id, drawId));
}

export async function updateDrawLine7(drawId: string, line7: number) {
  const draw = await getDraw(drawId);
  if (!draw) return;
  const line8 = draw.line6EarnedLessRetainageCents - line7;
  const line9 = draw.line3ContractSumToDateCents - draw.line6EarnedLessRetainageCents;
  await db.update(schema.draws).set({
    line7LessPreviousCents: line7,
    line8CurrentPaymentDueCents: line8,
    line9BalanceToFinishCents: line9,
    updatedAt: new Date(),
  }).where(eq(schema.draws.id, drawId));
}

export async function submitDraw(drawId: string) {
  await db.update(schema.draws).set({
    status: "submitted",
    submittedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(schema.draws.id, drawId));
}

export async function certifyDraw(drawId: string, certifiedBy: string) {
  await db.update(schema.draws).set({
    status: "certified",
    certifiedAt: new Date(),
    certifiedBy,
    updatedAt: new Date(),
  }).where(eq(schema.draws.id, drawId));
}

export async function markDrawPaid(drawId: string) {
  await db.update(schema.draws).set({
    status: "paid",
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(schema.draws.id, drawId));
}

// ── Users & Orgs ──────────────────────────────────────────────────────────────

export async function getUsers() {
  return db.select().from(schema.users).orderBy(asc(schema.users.name));
}

export async function getOrganizations() {
  return db.select().from(schema.organizations).orderBy(asc(schema.organizations.name));
}

export async function getProjectMemberships(projectId: string) {
  return db.select({
    membership: schema.projectMemberships,
    user: schema.users,
    org: schema.organizations,
  })
    .from(schema.projectMemberships)
    .innerJoin(schema.users, eq(schema.projectMemberships.userId, schema.users.id))
    .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
    .where(eq(schema.projectMemberships.projectId, projectId));
}

// ── Reconciliation ────────────────────────────────────────────────────────────

export async function getOverrunFlags(projectId: string) {
  const divs = await getDivisions(projectId);
  const actuals = await getCFRActuals(projectId);
  const blis = await getBidLineItems(projectId);

  const divisionFlags = divs
    .map((d) => {
      const spent = actuals[d.id] ?? 0;
      const pct = d.scheduledValueCents > 0 ? spent / d.scheduledValueCents : 0;
      return { division: d, spent, pct, over: pct > 1.0, critical: pct > 1.2 };
    })
    .filter((f) => f.over);

  const lineItemFlags = blis
    .map((b) => {
      // actual is computed from transactions grouped by bid_line_item_id — simplified: use budgetCents ratio for now
      // In future: join transactions on bidLineItemId
      return null;
    })
    .filter(Boolean);

  return { divisionFlags, lineItemFlags };
}
