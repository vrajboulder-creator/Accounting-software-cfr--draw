export type OrgType = "contractor" | "owner" | "architect" | "accountant";

export type ProjectRole =
  | "contractor_admin"
  | "contractor_pm"
  | "contractor_viewer"
  | "owner"
  | "architect"
  | "accountant";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  address?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  orgId: string;
  avatarColor: string;
}

export interface Project {
  id: string;
  name: string;
  projectNumber?: string;
  address: string;
  contractorOrgId: string;
  ownerOrgId: string;
  architectOrgId: string;
  contractDate: string;
  contractSumCents: number;
  defaultRetainageBps: number;
  status: "active" | "completed" | "on_hold";
  coverColor: string;
}

export interface Division {
  id: string;
  projectId: string;
  number: number;
  name: string;
  scheduledValueCents: number;
  grossSpendCents: number;
  retainageCents: number;
  netReceivedCents: number;
}

export interface BidLineItem {
  id: string;
  divisionId: string;
  name: string;
  budgetCents: number;
  actualCents: number;
}

export interface Transaction {
  id: string;
  projectId: string;
  divisionId: string;
  date: string;
  amountCents: number;
  vendor: string;
  description: string;
  type: "invoice" | "payroll" | "expense" | "change_order_cost";
  paymentStatus: "pending" | "paid";
}

export type DrawStatus = "draft" | "submitted" | "certified" | "paid";

export interface Draw {
  id: string;
  projectId: string;
  number: number;
  periodEndDate: string;
  status: DrawStatus;
  line1ContractSumCents: number;
  line2NetCoCents: number;
  line3ContractSumToDateCents: number;
  line4CompletedStoredCents: number;
  line5RetainageCents: number;
  line6EarnedLessRetainageCents: number;
  line7LessPreviousCents: number;
  line8CurrentPaymentDueCents: number;
  line9BalanceToFinishCents: number;
  submittedAt?: string;
  certifiedAt?: string;
}

export interface DrawLineItem {
  id: string;
  drawId: string;
  divisionId: string;
  colCScheduledValueCents: number;
  colDFromPreviousCents: number;
  colEThisPeriodCents: number;
  colFMaterialsStoredCents: number;
  colGCompletedStoredCents: number;
  colGPercentBps: number;
  colHBalanceCents: number;
  colIRetainageCents: number;
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  number: number;
  date: string;
  description: string;
  amountCents: number;
  status: "pending" | "approved" | "rejected";
}
