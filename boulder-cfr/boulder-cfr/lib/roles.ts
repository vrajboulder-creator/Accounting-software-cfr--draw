import type { ProjectRole } from "./types";

export const ROLES: { id: ProjectRole; label: string; description: string }[] = [
  { id: "contractor_admin", label: "Contractor Admin",  description: "Full access; can edit everything" },
  { id: "contractor_pm",    label: "Contractor PM",     description: "Edits drafts, manages cost, submits draws" },
  { id: "contractor_viewer",label: "Contractor Viewer", description: "Read-only on all contractor data" },
  { id: "owner",            label: "Owner",             description: "Sees only certified draws — no CFR / cost data" },
  { id: "architect",        label: "Architect",         description: "Reviews & certifies submitted draws" },
  { id: "accountant",       label: "Accountant",        description: "Read-only on CFR and draws for books" },
];

export const permissions = {
  canSeeCFR: (r: ProjectRole) => r !== "owner",
  canSeeTransactionDetail: (r: ProjectRole) =>
    r === "contractor_admin" || r === "contractor_pm" || r === "contractor_viewer" || r === "accountant",
  canEditDraw: (r: ProjectRole) => r === "contractor_admin" || r === "contractor_pm",
  canCertifyDraw: (r: ProjectRole) => r === "architect",
  canSeeChangeOrders: (r: ProjectRole) => r !== "owner",
  canSeeTeamTab: (r: ProjectRole) => r === "contractor_admin",
  canSeeSettings: (r: ProjectRole) => r === "contractor_admin",
  // Owner sees draws list but only certified/paid ones
  filterDrawsForRole: (r: ProjectRole) => (status: string) => {
    if (r === "owner") return status === "certified" || status === "paid" || status === "submitted";
    return true;
  },
};

export function userForRole(role: ProjectRole) {
  const map: Record<ProjectRole, string> = {
    contractor_admin: "u-admin",
    contractor_pm: "u-pm",
    contractor_viewer: "u-viewer",
    owner: "u-owner",
    architect: "u-architect",
    accountant: "u-accountant",
  };
  return map[role];
}
