import {
  pgTable, text, bigint, integer, boolean, timestamp, jsonb,
  pgEnum, unique, index,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const orgTypeEnum = pgEnum("org_type", ["contractor", "owner", "architect", "accountant"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "member", "viewer"]);
export const projectRoleEnum = pgEnum("project_role", [
  "contractor_admin", "contractor_pm", "contractor_viewer",
  "owner", "architect", "accountant",
]);
export const projectStatusEnum = pgEnum("project_status", ["active", "completed", "on_hold"]);
export const drawStatusEnum = pgEnum("draw_status", ["draft", "submitted", "certified", "paid", "voided"]);
export const txTypeEnum = pgEnum("tx_type", ["invoice", "payroll", "expense", "change_order_cost", "credit"]);
export const txPaymentStatusEnum = pgEnum("tx_payment_status", ["pending", "paid", "voided"]);
export const txSourceEnum = pgEnum("tx_source", ["manual", "excel_import", "invoice_upload", "api"]);
export const coStatusEnum = pgEnum("co_status", ["pending", "approved", "rejected"]);

// ── Timestamps helper ─────────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

// ── Organizations ─────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: orgTypeEnum("type").notNull(),
  address: text("address"),
  contactEmail: text("contact_email"),
  ...timestamps,
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  avatarColor: text("avatar_color").notNull().default("#64748B"),
  authProviderId: text("auth_provider_id"),
  ...timestamps,
});

// ── Org Memberships ───────────────────────────────────────────────────────────

export const orgMemberships = pgTable("org_memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  orgRole: orgRoleEnum("org_role").notNull().default("member"),
  ...timestamps,
}, (t) => [unique().on(t.userId, t.orgId)]);

// ── Projects ──────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  contractorOrgId: text("contractor_org_id").notNull().references(() => organizations.id),
  ownerOrgId: text("owner_org_id").notNull().references(() => organizations.id),
  architectOrgId: text("architect_org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  projectNumber: text("project_number"),
  address: text("address").notNull(),
  contractDate: text("contract_date").notNull(),
  contractSumCents: bigint("contract_sum_cents", { mode: "number" }).notNull(),
  defaultRetainageBps: integer("default_retainage_bps").notNull().default(1000),
  retainageOnStoredMaterials: boolean("retainage_on_stored_materials").notNull().default(true),
  status: projectStatusEnum("status").notNull().default("active"),
  coverColor: text("cover_color").notNull().default("#F26B35"),
  ...timestamps,
});

// ── Project Memberships ───────────────────────────────────────────────────────

export const projectMemberships = pgTable("project_memberships", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => users.id),
  projectRole: projectRoleEnum("project_role").notNull(),
  ...timestamps,
}, (t) => [unique().on(t.projectId, t.userId)]);

// ── Divisions ─────────────────────────────────────────────────────────────────

export const divisions = pgTable("divisions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  scheduledValueCents: bigint("scheduled_value_cents", { mode: "number" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  retainageBpsOverride: integer("retainage_bps_override"),
  ...timestamps,
}, (t) => [index("divisions_project_idx").on(t.projectId)]);

// ── Bid Line Items ────────────────────────────────────────────────────────────

export const bidLineItems = pgTable("bid_line_items", {
  id: text("id").primaryKey(),
  divisionId: text("division_id").notNull().references(() => divisions.id),
  name: text("name").notNull(),
  coding: text("coding"),
  budgetCents: bigint("budget_cents", { mode: "number" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [index("bli_division_idx").on(t.divisionId)]);

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  divisionId: text("division_id").notNull().references(() => divisions.id),
  bidLineItemId: text("bid_line_item_id").references(() => bidLineItems.id),
  date: text("date"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  retainageCents: bigint("retainage_cents", { mode: "number" }).notNull().default(0),
  netCents: bigint("net_cents", { mode: "number" }).notNull().default(0),
  vendor: text("vendor").notNull(),
  counterparty: text("counterparty"),
  paidBy: text("paid_by"),
  description: text("description").notNull(),
  commentary: text("commentary"),
  type: txTypeEnum("type").notNull().default("invoice"),
  paymentStatus: txPaymentStatusEnum("payment_status").notNull().default("pending"),
  source: txSourceEnum("source").notNull().default("manual"),
  linkedInvoiceId: text("linked_invoice_id"),
  linkedDrawId: text("linked_draw_id"),
  drawNumber: integer("draw_number"),
  ...timestamps,
}, (t) => [
  index("tx_project_idx").on(t.projectId),
  index("tx_division_idx").on(t.divisionId),
  index("tx_draw_number_idx").on(t.drawNumber),
]);

// ── Received Funds (credits — owner payments per draw, per division) ──────────

export const receivedFunds = pgTable("received_funds", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  drawId: text("draw_id").references(() => draws.id, { onDelete: "cascade" }),
  drawNumber: integer("draw_number").notNull(),
  divisionId: text("division_id").notNull().references(() => divisions.id),
  date: text("date"),
  description: text("description").notNull(),
  grossCents: bigint("gross_cents", { mode: "number" }).notNull(),
  retainageCents: bigint("retainage_cents", { mode: "number" }).notNull().default(0),
  netCents: bigint("net_cents", { mode: "number" }).notNull().default(0),
  counterparty: text("counterparty"),
  ...timestamps,
}, (t) => [
  index("rf_project_idx").on(t.projectId),
  index("rf_division_idx").on(t.divisionId),
  index("rf_draw_idx").on(t.drawId),
]);

// ── Change Orders ─────────────────────────────────────────────────────────────

export const changeOrders = pgTable("change_orders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  number: integer("number").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  status: coStatusEnum("status").notNull().default("pending"),
  approvedInDrawId: text("approved_in_draw_id"),
  ...timestamps,
}, (t) => [index("co_project_idx").on(t.projectId)]);

// ── Draws ─────────────────────────────────────────────────────────────────────

export const draws = pgTable("draws", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  number: integer("number").notNull(),
  periodEndDate: text("period_end_date").notNull(),
  status: drawStatusEnum("status").notNull().default("draft"),
  line1ContractSumCents: bigint("line1_contract_sum_cents", { mode: "number" }).notNull(),
  line2NetCoCents: bigint("line2_net_co_cents", { mode: "number" }).notNull().default(0),
  line3ContractSumToDateCents: bigint("line3_contract_sum_to_date_cents", { mode: "number" }).notNull(),
  line4CompletedStoredCents: bigint("line4_completed_stored_cents", { mode: "number" }).notNull(),
  line5RetainageCents: bigint("line5_retainage_cents", { mode: "number" }).notNull(),
  line6EarnedLessRetainageCents: bigint("line6_earned_less_retainage_cents", { mode: "number" }).notNull(),
  line7LessPreviousCents: bigint("line7_less_previous_cents", { mode: "number" }).notNull(),
  line8CurrentPaymentDueCents: bigint("line8_current_payment_due_cents", { mode: "number" }).notNull(),
  line9BalanceToFinishCents: bigint("line9_balance_to_finish_cents", { mode: "number" }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  certifiedBy: text("certified_by"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("draws_project_idx").on(t.projectId),
  unique().on(t.projectId, t.number),
]);

// ── Draw Line Items (G703) ────────────────────────────────────────────────────

export const drawLineItems = pgTable("draw_line_items", {
  id: text("id").primaryKey(),
  drawId: text("draw_id").notNull().references(() => draws.id, { onDelete: "cascade" }),
  divisionId: text("division_id").notNull().references(() => divisions.id),
  colCScheduledValueCents: bigint("col_c_scheduled_value_cents", { mode: "number" }).notNull(),
  colDFromPreviousCents: bigint("col_d_from_previous_cents", { mode: "number" }).notNull().default(0),
  colEThisPeriodCents: bigint("col_e_this_period_cents", { mode: "number" }).notNull().default(0),
  colFMaterialsStoredCents: bigint("col_f_materials_stored_cents", { mode: "number" }).notNull().default(0),
  colGCompletedStoredCents: bigint("col_g_completed_stored_cents", { mode: "number" }).notNull().default(0),
  colGPercentBps: integer("col_g_percent_bps").notNull().default(0),
  colHBalanceCents: bigint("col_h_balance_cents", { mode: "number" }).notNull().default(0),
  colIRetainageCents: bigint("col_i_retainage_cents", { mode: "number" }).notNull().default(0),
  ...timestamps,
}, (t) => [
  index("dli_draw_idx").on(t.drawId),
  unique().on(t.drawId, t.divisionId),
]);

// ── Invoice Backup ────────────────────────────────────────────────────────────

export const invoiceBackup = pgTable("invoice_backup", {
  id: text("id").primaryKey(),
  drawId: text("draw_id").notNull().references(() => draws.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id").references(() => transactions.id),
  g703DivisionId: text("g703_division_id").notNull().references(() => divisions.id),
  description: text("description").notNull(),
  commentary: text("commentary"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  retainageCents: bigint("retainage_cents", { mode: "number" }).notNull().default(0),
  netCents: bigint("net_cents", { mode: "number" }).notNull().default(0),
  checkRef: text("check_ref"),
  ...timestamps,
}, (t) => [index("ib_draw_idx").on(t.drawId)]);

// ── Audit Log ─────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  userId: text("user_id"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)]);
