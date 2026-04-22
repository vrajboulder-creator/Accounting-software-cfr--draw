"use server";

import { revalidatePath } from "next/cache";
import * as q from "./db/queries";

// ── Transactions ──────────────────────────────────────────────────────────────

export async function actionCreateTransaction(data: {
  projectId: string; divisionId: string; bidLineItemId?: string;
  date: string; amountCents: number; vendor: string; description: string;
  type?: "invoice" | "payroll" | "expense" | "change_order_cost" | "credit";
  paymentStatus?: "pending" | "paid" | "voided";
}) {
  const id = await q.createTransaction(data);
  revalidatePath(`/projects/${data.projectId}`);
  return { id };
}

export async function actionUpdateTransaction(id: string, projectId: string, data: Parameters<typeof q.updateTransaction>[1]) {
  await q.updateTransaction(id, data);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionDeleteTransaction(id: string, projectId: string) {
  await q.deleteTransaction(id);
  revalidatePath(`/projects/${projectId}`);
}

// ── Change Orders ─────────────────────────────────────────────────────────────

export async function actionCreateChangeOrder(data: {
  projectId: string; number: number; date: string;
  description: string; amountCents: number;
}) {
  const id = await q.createChangeOrder(data);
  revalidatePath(`/projects/${data.projectId}`);
  return { id };
}

export async function actionApproveChangeOrder(id: string, projectId: string) {
  await q.updateChangeOrderStatus(id, "approved");
  revalidatePath(`/projects/${projectId}`);
}

export async function actionRejectChangeOrder(id: string, projectId: string) {
  await q.updateChangeOrderStatus(id, "rejected");
  revalidatePath(`/projects/${projectId}`);
}

// ── Draws ─────────────────────────────────────────────────────────────────────

export async function actionCreateDraw(data: {
  projectId: string; number: number; periodEndDate: string;
  line1ContractSumCents: number; line2NetCoCents?: number;
  line7LessPreviousCents: number;
}) {
  const id = await q.createDraw(data);
  // set line7 from previous draw's line6
  await q.updateDrawLine7(id, data.line7LessPreviousCents);
  revalidatePath(`/projects/${data.projectId}`);
  return { id };
}

export async function actionSaveDrawLineItem(data: {
  drawId: string; divisionId: string;
  colCScheduledValueCents: number; colDFromPreviousCents: number;
  colEThisPeriodCents: number; colFMaterialsStoredCents: number;
  retainageBps: number; projectId: string;
}) {
  const { projectId, ...rest } = data;
  await q.upsertDrawLineItem(rest);
  await q.recalcDrawTotals(data.drawId);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionSubmitDraw(drawId: string, projectId: string) {
  await q.submitDraw(drawId);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionCertifyDraw(drawId: string, projectId: string, certifiedBy: string) {
  await q.certifyDraw(drawId, certifiedBy);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionMarkDrawPaid(drawId: string, projectId: string) {
  await q.markDrawPaid(drawId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Draw Line Items (read) ────────────────────────────────────────────────────

export async function actionGetDrawLineItems(drawId: string) {
  return q.getDrawLineItems(drawId);
}

// ── Divisions ────────────────────────────────────────────────────────────────

export async function actionCreateDivision(data: { projectId: string; number: number; name: string; scheduledValueCents: number }) {
  const id = await q.createDivision(data);
  revalidatePath(`/projects/${data.projectId}`);
  return { id };
}

export async function actionUpdateDivision(id: string, projectId: string, data: Record<string, unknown>) {
  await q.updateDivision(id, data);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionDeleteDivision(id: string, projectId: string) {
  await q.deleteDivision(id);
  revalidatePath(`/projects/${projectId}`);
}

// ── Bid Line Items ────────────────────────────────────────────────────────────

export async function actionCreateBidLineItem(data: { divisionId: string; name: string; budgetCents: number; projectId: string }) {
  const { projectId, ...rest } = data;
  const id = await q.createBidLineItem(rest);
  revalidatePath(`/projects/${projectId}`);
  return { id };
}

export async function actionUpdateBidLineItem(id: string, projectId: string, data: Record<string, unknown>) {
  await q.updateBidLineItem(id, data);
  revalidatePath(`/projects/${projectId}`);
}

export async function actionDeleteBidLineItem(id: string, projectId: string) {
  await q.deleteBidLineItem(id);
  revalidatePath(`/projects/${projectId}`);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function actionCreateProject(data: {
  name: string; projectNumber?: string; address: string;
  contractorOrgId: string; ownerOrgId: string; architectOrgId: string;
  contractDate: string; contractSumCents: number;
  defaultRetainageBps: number; coverColor?: string;
}) {
  const id = await q.createProject(data);
  revalidatePath("/projects");
  return { id };
}

export async function actionUpdateProject(id: string, data: Parameters<typeof q.updateProject>[1]) {
  await q.updateProject(id, data);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}
