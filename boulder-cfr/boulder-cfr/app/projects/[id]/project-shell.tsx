"use client";
import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { TopBar } from "@/components/shell";
import { useRole } from "@/components/role-context";
import { cn, formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { permissions, ROLES } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import { XlsxSheet } from "@/components/xlsx-sheet";
import { AnimatePresence, motion } from "framer-motion";
import type { ProjectPageData } from "./page-data";
import {
  actionCreateTransaction, actionDeleteTransaction,
  actionCreateChangeOrder, actionApproveChangeOrder, actionRejectChangeOrder,
  actionCreateDraw, actionSaveDrawLineItem,
  actionSubmitDraw, actionCertifyDraw, actionMarkDrawPaid,
  actionUpdateProject, actionGetDrawLineItems,
} from "@/lib/actions";
import {
  AlertTriangle, DollarSign, Layers, PieChart, TrendingDown, Receipt,
  TrendingUp, Lock, FileText, Search, Download, Upload, Plus, Mail, Save,
  ChevronRight, PanelRightClose, PanelRightOpen, Send, FileCheck2, Printer,
  Trash2, CheckCircle2, XCircle, Clock, X, Eye,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "overview" | "cfr" | "draws" | "transactions" | "change-orders" | "budget" | "team" | "settings";

const TAB_DEFS: { id: TabId; label: string; roles: "all" | "no-owner" | "contractor-only" | "admin-only" }[] = [
  { id: "overview",      label: "Overview",      roles: "all" },
  { id: "cfr",           label: "CFR",            roles: "no-owner" },
  { id: "draws",         label: "Draws",          roles: "all" },
  { id: "transactions",  label: "Transactions",   roles: "contractor-only" },
  { id: "change-orders", label: "Change Orders",  roles: "no-owner" },
  { id: "budget",        label: "Budget",         roles: "all" },
  { id: "team",          label: "Team",           roles: "admin-only" },
  { id: "settings",      label: "Settings",       roles: "admin-only" },
];

// ── Shell ─────────────────────────────────────────────────────────────────────

export function ProjectShell({ data }: { data: ProjectPageData }) {
  const { role } = useRole();
  const tabs = TAB_DEFS.filter((t) => {
    if (t.roles === "all") return true;
    if (t.roles === "no-owner") return role !== "owner";
    if (t.roles === "contractor-only") return ["contractor_admin","contractor_pm","contractor_viewer","accountant"].includes(role);
    if (t.roles === "admin-only") return role === "contractor_admin";
    return true;
  });

  const [activeTab, setActiveTab] = React.useState<TabId>("overview");
  const [openDrawId, setOpenDrawId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) setActiveTab(tabs[0]?.id ?? "overview");
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const { project } = data;

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <TopBar
        backHref="/projects"
        backLabel="All projects"
        breadcrumb={
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-neutral-400">/</span>
            <span className="font-semibold text-neutral-900 truncate">{project.name}</span>
            <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-neutral-400 shrink-0">
              {project.projectNumber}
            </span>
          </div>
        }
      />
      <nav className="border-b border-neutral-200 bg-white px-6">
        <ul className="flex items-center gap-1 -mb-px overflow-x-auto">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "inline-flex items-center px-3 h-11 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === t.id
                    ? "border-boulder-500 text-boulder-700"
                    : "border-transparent text-neutral-600 hover:text-neutral-900",
                )}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={activeTab === "overview"      ? undefined : "hidden"}><OverviewTab      data={data} setActiveTab={setActiveTab} onOpenDraw={(id) => { setOpenDrawId(id); setActiveTab("draws"); }} /></div>
      <div className={activeTab === "cfr"           ? undefined : "hidden"}><CFRTab           data={data} /></div>
      <div className={activeTab === "draws"         ? undefined : "hidden"}><DrawsTab         data={data} initialDrawId={openDrawId} /></div>
      <div className={activeTab === "transactions"  ? undefined : "hidden"}><TransactionsTab  data={data} /></div>
      <div className={activeTab === "change-orders" ? undefined : "hidden"}><ChangeOrdersTab  data={data} /></div>
      <div className={activeTab === "budget"        ? undefined : "hidden"}><BudgetTab        data={data} /></div>
      <div className={activeTab === "team"          ? undefined : "hidden"}><TeamTab          data={data} /></div>
      <div className={activeTab === "settings"      ? undefined : "hidden"}><SettingsTab      data={data} /></div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

// ── Draw Detail Modal ─────────────────────────────────────────────────────────

function AmountRow({ label, gross, retainage, net, received }: {
  label: string; gross: number; retainage: number; net: number; received: number;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 py-2.5 border-b border-neutral-100 last:border-0 text-sm">
      <div className="font-medium text-neutral-700">{label}</div>
      <div className="text-right tabular text-neutral-900">{formatCurrency(gross, { showCents: false })}</div>
      <div className="text-right tabular text-amber-700">{formatCurrency(retainage, { showCents: false })}</div>
      <div className="text-right tabular text-neutral-900 font-semibold">{formatCurrency(net, { showCents: false })}</div>
      <div className="text-right tabular text-emerald-700 font-semibold">{formatCurrency(received, { showCents: false })}</div>
    </div>
  );
}

function DrawDetailModal({ draw, receivedFunds, contractSumCents, onClose, onOpenDetail }: {
  draw: ProjectPageData["draws"][0];
  receivedFunds: ProjectPageData["receivedFunds"];
  contractSumCents: number;
  onClose: () => void;
  onOpenDetail?: () => void;
}) {
  // Received for this draw
  const drawReceived = receivedFunds.filter((r) => r.drawNumber === draw.number);
  const receivedGross = drawReceived.reduce((s, r) => s + r.grossCents, 0);
  const receivedRetainage = drawReceived.reduce((s, r) => s + r.retainageCents, 0);
  const receivedNet = drawReceived.reduce((s, r) => s + r.netCents, 0);

  // Cumulative received up to this draw
  const cumulReceived = receivedFunds.filter((r) => r.drawNumber <= draw.number);
  const cumulReceivedNet = cumulReceived.reduce((s, r) => s + r.netCents, 0);

  // Reimbursement = what was billed this period (line8 = current payment due)
  const reimbGross = draw.line4CompletedStoredCents;
  const reimbRetainage = draw.line5RetainageCents;
  const reimbNet = draw.line8CurrentPaymentDueCents;

  // To Be Paid = billed but not yet received (net)
  const toBePaidNet = reimbNet - receivedNet;
  const toBePaidGross = reimbGross - receivedGross;
  const toBePaidRetainage = reimbRetainage - receivedRetainage;

  // Forecast = balance to finish
  const forecastGross = draw.line9BalanceToFinishCents;
  const forecastRetainage = Math.round(forecastGross * (draw.line5RetainageCents / Math.max(draw.line4CompletedStoredCents, 1)));
  const forecastNet = forecastGross - forecastRetainage;
  const forecastReceived = 0; // not yet received

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl text-neutral-950">Draw #{draw.number}</span>
              <DrawStatusBadge status={draw.status} />
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Period ending {new Date(draw.periodEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Column headers */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-5 gap-2 pb-2 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Section</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 text-right">Gross</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-500 text-right">Retainage</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 text-right">Net</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 text-right">Received</div>
          </div>

          {/* Reimbursement */}
          <div className="mt-3 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-boulder-600">Reimbursement</span>
          </div>
          <AmountRow label="This draw" gross={reimbGross} retainage={reimbRetainage} net={reimbNet} received={receivedNet} />

          {/* To Be Paid */}
          <div className="mt-3 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600">To Be Paid</span>
          </div>
          <AmountRow label="Outstanding" gross={Math.max(0, toBePaidGross)} retainage={Math.max(0, toBePaidRetainage)} net={Math.max(0, toBePaidNet)} received={0} />

          {/* Forecast */}
          <div className="mt-3 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Forecast</span>
          </div>
          <AmountRow label="Balance to finish" gross={forecastGross} retainage={forecastRetainage} net={forecastNet} received={forecastReceived} />
        </div>

        {/* Footer totals */}
        <div className="px-6 py-4 mt-2 bg-neutral-50 border-t border-neutral-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Cumulative received</div>
              <div className="mt-1 font-display font-bold text-lg text-emerald-700">{formatCurrency(cumulReceivedNet, { compact: true })}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Current due</div>
              <div className="mt-1 font-display font-bold text-lg text-boulder-600">{formatCurrency(draw.line8CurrentPaymentDueCents, { compact: true })}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Balance to finish</div>
              <div className="mt-1 font-display font-bold text-lg text-neutral-700">{formatCurrency(draw.line9BalanceToFinishCents, { compact: true })}</div>
            </div>
          </div>
          {onOpenDetail && (
            <button
              onClick={onOpenDetail}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:text-boulder-700 hover:border-boulder-300 transition-colors"
            >
              <Eye className="h-4 w-4" />
              View G702 / G703 detail
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function OverviewTab({ data, setActiveTab, onOpenDraw }: { data: ProjectPageData; setActiveTab?: (t: TabId) => void; onOpenDraw?: (id: string) => void }) {
  const { project, divisions, draws, changeOrders, bidLineItems, receivedFunds } = data;
  const { role } = useRole();
  const isOwner = role === "owner";
  const [selectedDraw, setSelectedDraw] = React.useState<ProjectPageData["draws"][0] | null>(null);

  const latestDraw = draws[0];
  const scheduled = divisions.reduce((s, d) => s + d.scheduledValueCents, 0);
  const spent = divisions.reduce((s, d) => s + d.grossSpendCents, 0);
  const billed = latestDraw?.line4CompletedStoredCents ?? 0;
  const pctComplete = scheduled > 0 ? Math.min(100, (billed / scheduled) * 100) : 0;
  const remaining = project.contractSumCents - billed;

  // Total received across all draws
  const totalReceivedNet = receivedFunds.reduce((s, r) => s + r.netCents, 0);

  // Per-draw received lookup
  const receivedNetByDraw: Record<number, number> = {};
  const receivedGrossByDraw: Record<number, number> = {};
  const receivedRetainageByDraw: Record<number, number> = {};
  for (const r of receivedFunds) {
    receivedNetByDraw[r.drawNumber] = (receivedNetByDraw[r.drawNumber] ?? 0) + r.netCents;
    receivedGrossByDraw[r.drawNumber] = (receivedGrossByDraw[r.drawNumber] ?? 0) + r.grossCents;
    receivedRetainageByDraw[r.drawNumber] = (receivedRetainageByDraw[r.drawNumber] ?? 0) + r.retainageCents;
  }

  const overrunLines = bidLineItems
    .filter((b) => b.budgetCents > 0 && b.actualCents > b.budgetCents * 1.05)
    .map((b) => ({
      ...b,
      division: divisions.find((d) => d.id === b.divisionId)!,
      pctOver: Math.round((b.actualCents / b.budgetCents) * 100),
    }))
    .filter((b) => b.division)
    .sort((a, b) => b.pctOver - a.pctOver);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Overview</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">{project.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Contract signed {new Date(project.contractDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Retainage {formatPercent(project.defaultRetainageBps)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={project.status === "active" ? "default" : "success"} className="capitalize">{project.status}</Badge>
          {changeOrders.filter((c) => c.status === "pending").length > 0 && !isOwner && (
            <Badge variant="warning">{changeOrders.filter((c) => c.status === "pending").length} COs pending</Badge>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contract sum" value={formatCurrency(project.contractSumCents, { compact: true })} sub={formatCurrency(project.contractSumCents)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Billed to date" value={`${pctComplete.toFixed(1)}%`} sub={formatCurrency(billed, { compact: true })} accent="orange" icon={<PieChart className="h-4 w-4" />} />
        <StatCard label="Balance to finish" value={formatCurrency(remaining, { compact: true })} sub="after retainage release" icon={<Layers className="h-4 w-4" />} />
        <StatCard
          label={isOwner ? "Draws certified" : "Cost vs. budget"}
          value={isOwner ? draws.filter((d) => d.status === "paid" || d.status === "certified").length : formatCurrency(spent, { compact: true })}
          sub={isOwner ? `${draws.filter((d) => d.status === "submitted").length} pending` : `${scheduled > 0 ? ((spent / scheduled) * 100).toFixed(1) : "0"}% of budget`}
          accent={!isOwner && spent > scheduled ? "red" : "neutral"}
          icon={isOwner ? <Receipt className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
      </div>

      {/* Draws section */}
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-950">Draws</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {draws.length} draw{draws.length === 1 ? "" : "s"} · {formatCurrency(totalReceivedNet, { compact: true })} received to date
            </p>
          </div>
          <Link href={`/projects/${project.id}/draws`} className="text-xs font-semibold text-boulder-600 hover:text-boulder-700">View all →</Link>
        </div>

        {draws.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">No draws yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left py-3 pl-5 pr-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 w-20">Draw</th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Period</th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Status</th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400 w-40">Progress</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Gross</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-amber-500">Retainage</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Net Amount</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Received</th>
                  <th className="w-10 py-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {draws.map((d) => {
                  const gross = d.line4CompletedStoredCents;
                  const retainage = d.line5RetainageCents;
                  const net = d.line8CurrentPaymentDueCents;
                  const received = receivedNetByDraw[d.number] ?? 0;
                  const isPaid = received >= net && net > 0;
                  return (
                    <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 pl-5 pr-3">
                        <div className="h-8 w-8 rounded-lg bg-boulder-50 text-boulder-700 flex items-center justify-center font-bold text-sm tabular">
                          {d.number}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-neutral-500 text-xs">
                        {new Date(d.periodEndDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-3"><DrawStatusBadge status={d.status} /></td>
                      <td className="py-3 px-3">
                        {net > 0 ? (() => {
                          const pct = (received / net) * 100;
                          const clamped = Math.min(100, pct);
                          const isPaid = pct >= 99.99;
                          const barColor = isPaid ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
                          const textColor = isPaid ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600";
                          return (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden flex-1 min-w-[60px]">
                                <div className={cn("h-full transition-all", barColor)} style={{ width: `${clamped}%` }} />
                              </div>
                              <span className={cn("text-[10px] font-semibold tabular shrink-0 w-9 text-right", textColor)}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          );
                        })() : <span className="text-xs text-neutral-400">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right tabular text-neutral-700">{formatCurrency(gross, { compact: true })}</td>
                      <td className="py-3 px-3 text-right tabular text-amber-700">{formatCurrency(retainage, { compact: true })}</td>
                      <td className="py-3 px-3 text-right tabular font-semibold text-neutral-950">{formatCurrency(net, { compact: true })}</td>
                      <td className="py-3 px-3 text-right tabular">
                        <span className={cn("font-semibold", isPaid ? "text-emerald-600" : received > 0 ? "text-amber-600" : "text-neutral-400")}>
                          {received > 0 ? formatCurrency(received, { compact: true }) : "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <button
                          onClick={() => setSelectedDraw(d)}
                          className="text-neutral-300 hover:text-boulder-500 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {!isOwner ? (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="font-display font-bold text-lg text-neutral-950">Budget overruns</h2>
              </div>
              <Badge variant="destructive">{overrunLines.length}</Badge>
            </div>
            <div className="p-1.5 max-h-[420px] overflow-y-auto">
              {overrunLines.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">No overruns — nice work.</div>
              ) : overrunLines.map((o) => (
                <div key={o.id} className="p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-950 truncate">{o.name}</div>
                      <div className="text-[11px] text-neutral-500 truncate">Div {o.division.number} · {o.division.name}</div>
                    </div>
                    <Badge variant={o.pctOver > 150 ? "destructive" : "warning"} className="shrink-0 tabular">{o.pctOver}%</Badge>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full ${o.pctOver > 150 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, o.pctOver)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-boulder-500" />
              <h2 className="font-display font-bold text-lg text-neutral-950">Next payment due</h2>
            </div>
            <p className="mt-3 text-xs text-neutral-500">Draw {latestDraw?.number} · pending certification</p>
            <div className="mt-3 font-display text-4xl font-bold tabular text-boulder-600">
              {formatCurrency(latestDraw?.line8CurrentPaymentDueCents ?? 0, { compact: true })}
            </div>
          </div>
        )}
      </div>

      {/* Draw detail modal */}
      <AnimatePresence>
        {selectedDraw && (
          <DrawDetailModal
            draw={selectedDraw}
            receivedFunds={receivedFunds}
            contractSumCents={project.contractSumCents}
            onClose={() => setSelectedDraw(null)}
            onOpenDetail={() => { onOpenDraw?.(selectedDraw.id); setSelectedDraw(null); }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ── CFR Detail Sheet with division filter ────────────────────────────────────

type Cell = string | number | boolean | null;

function BidSheetView({ sheet }: { sheet: Cell[][] }) {
  // row 0 = title, row 1 = column headers, row 2+ = data
  const allRows = sheet.slice(1); // keep col headers as row 0

  // section headers: ALL-CAPS string with empty B/C cols
  const sections = React.useMemo(() => {
    const list: { label: string; startIdx: number }[] = [];
    allRows.forEach((r, i) => {
      if (i === 0) return; // skip col header row
      if (typeof r[0] === "string" && r[0].trim() !== "" && r[1] === "" && r[2] === "") {
        list.push({ label: r[0].trim(), startIdx: i });
      }
    });
    return list;
  }, [allRows]);

  const [selected, setSelected] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    if (selected === "all") return allRows;
    const sec = sections.find((s) => s.label === selected);
    if (!sec) return allRows;
    const next = sections[sections.indexOf(sec) + 1];
    return [
      allRows[0], // col headers
      ...allRows.slice(sec.startIdx, next ? next.startIdx : undefined),
    ];
  }, [selected, allRows, sections]);

  const sectionRows = filtered.reduce<number[]>((acc, r, i) => {
    if (i === 0) return acc;
    if (typeof r[0] === "string" && r[0].trim() !== "" && r[1] === "" && r[2] === "") acc.push(i);
    return acc;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Section</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-boulder-400"
        >
          <option value="all">All sections</option>
          {sections.map((s) => (
            <option key={s.label} value={s.label}>{s.label}</option>
          ))}
        </select>
        {selected !== "all" && (
          <span className="text-xs text-neutral-500">{filtered.length - 1} rows</span>
        )}
      </div>
      <XlsxSheet
        data={filtered}
        title="Bid Summary"
        boldRows={[0, ...sectionRows]}
        sectionRows={sectionRows}
        mergeRows={sectionRows}
        percentCols={[4]}
        rawNumberCols={[7]}
      />
    </div>
  );
}

function DetailSheetView({ sheet }: { sheet: Cell[][] }) {
  // rows 0-1 are junk; row 2 = group headers, row 3 = col names, row 4+ = data
  const allRows = sheet.slice(2);

  // build division list from rows that match "N. Name"
  const divisions = React.useMemo(() => {
    const list: { label: string; startIdx: number }[] = [];
    allRows.forEach((r, i) => {
      if (typeof r[0] === "string" && /^\d+\./.test(r[0])) {
        list.push({ label: r[0] as string, startIdx: i });
      }
    });
    return list;
  }, [allRows]);

  const [selected, setSelected] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    if (selected === "all") return allRows.slice(0, 3000);
    const div = divisions.find((d) => d.label === selected);
    if (!div) return allRows.slice(0, 3000);
    const nextDiv = divisions[divisions.indexOf(div) + 1];
    return [
      allRows[0], // group header row (Debits/Credits/Other)
      allRows[1], // column names
      ...allRows.slice(div.startIdx, nextDiv ? nextDiv.startIdx : undefined),
    ];
  }, [selected, allRows, divisions]);

  const divisionRows = filtered.reduce<number[]>((acc, r, i) => {
    if (typeof r[0] === "string" && /^\d+\./.test(r[0])) acc.push(i);
    return acc;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Section</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-boulder-400"
        >
          <option value="all">All sections</option>
          {divisions.map((d) => (
            <option key={d.label} value={d.label}>{d.label}</option>
          ))}
        </select>
        {selected !== "all" && (
          <span className="text-xs text-neutral-500">{filtered.length - 2} rows</span>
        )}
        {selected === "all" && allRows.length > 3000 && (
          <span className="text-xs text-neutral-500">Showing first 3,000 of {(allRows.length).toLocaleString()} rows</span>
        )}
      </div>
      <XlsxSheet
        data={filtered}
        title="Detailed Spend"
        sectionRows={[0, ...divisionRows]}
        mergeRows={[0, ...divisionRows]}
        boldRows={[1, ...divisionRows]}
        rawNumberCols={[1, 2]}
        rowAccentFn={(_rIdx, row) => {
          // col 5 = Debits Gross, col 8 = Credits Gross
          // skip header rows (row[0] is string label or empty non-data)
          const debit = row[5];
          const credit = row[8];
          if (typeof credit === "number" && credit > 0) return "green";
          if (typeof debit === "number" && debit > 0) return "red";
          return null;
        }}
      />
    </div>
  );
}

// ── CFR ───────────────────────────────────────────────────────────────────────

export function CFRTab({ data }: { data: ProjectPageData }) {
  const { divisions, bidLineItems, transactions, receivedFunds } = data;
  const { role } = useRole();

  const [summarySheet, setSummarySheet] = React.useState<(string | number | boolean | null)[][] | null>(null);
  const [bidSheet, setBidSheet] = React.useState<(string | number | boolean | null)[][] | null>(null);
  const [detailSheet, setDetailSheet] = React.useState<(string | number | boolean | null)[][] | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/cfr-xlsx/cfr_Summary.json").then((r) => r.json()),
      fetch("/cfr-xlsx/cfr_Bid.json").then((r) => r.json()),
      fetch("/cfr-xlsx/cfr_Detail.json").then((r) => r.json()),
    ]).then(([s, b, d]) => {
      setSummarySheet(s);
      setBidSheet(b);
      setDetailSheet(d);
    }).catch(() => {});
  }, []);

  if (role === "owner") {
    return (
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Lock className="h-6 w-6 text-amber-600 mx-auto" />
          <h1 className="mt-3 font-display text-xl font-bold text-amber-900">CFR not available</h1>
          <p className="mt-2 text-sm text-amber-800 max-w-md mx-auto">CFR is internal to contractor. Switch to Draws tab.</p>
        </div>
      </main>
    );
  }

  const totals = {
    scheduled: divisions.reduce((s, d) => s + d.scheduledValueCents, 0),
    gross: divisions.reduce((s, d) => s + d.grossSpendCents, 0),
    retn: divisions.reduce((s, d) => s + d.retainageCents, 0),
    net: divisions.reduce((s, d) => s + d.netReceivedCents, 0),
  };
  const remaining = totals.scheduled - totals.gross;

  return (
    <main className="w-full px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Cost-to-Finish Report</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Internal cost tracking</h1>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500">Remaining budget</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular ${remaining < 0 ? "text-red-600" : "text-neutral-950"}`}>
            {formatCurrency(remaining, { compact: true })}
          </div>
        </div>
      </div>

      <Tabs defaultValue="summary" className="mt-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="bid">Bid</TabsTrigger>
          <TabsTrigger value="detail">Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          {summarySheet ? (
            <XlsxSheet
              data={summarySheet}
              title="AIA Summary"
              boldRows={[1, 3, 4, 23]}
              sectionRows={[0]}
              mergeRows={[2]}
              rawNumberCols={[0]}
              rowAccentFn={(rIdx, row) => {
                // data rows are indexes 5–22 (division rows)
                if (rIdx < 5 || rIdx > 22) return null;
                const netSpend = row[5];
                const netReceived = row[6];
                if (typeof netSpend !== "number" || typeof netReceived !== "number") return null;
                return netReceived >= netSpend ? "green" : "red";
              }}
            />
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
          )}
        </TabsContent>

        <TabsContent value="bid">
          {bidSheet ? (
            <BidSheetView sheet={bidSheet} />
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
          )}
        </TabsContent>

        <TabsContent value="detail">
          {detailSheet ? (
            <DetailSheetView sheet={detailSheet} />
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
          )}
        </TabsContent>

      </Tabs>
    </main>
  );
}

// ── Budget ────────────────────────────────────────────────────────────────────

export function BudgetTab({ data }: { data: ProjectPageData }) {
  const { draws, drawLineItems, divisions, bidLineItems, project } = data;
  const latestDraw = draws[0] ?? null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">AIA Pay Application</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Budget</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {latestDraw ? `Draw #${latestDraw.number} · period ending ${new Date(latestDraw.periodEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "No draws yet"}
        </p>
      </div>

      <Tabs defaultValue="g702" className="space-y-6">
        <TabsList>
          <TabsTrigger value="g702">G702 — Summary</TabsTrigger>
          <TabsTrigger value="g703">G703 — Continuation Sheet</TabsTrigger>
          <TabsTrigger value="bid">Bid</TabsTrigger>
        </TabsList>

        {/* ── G702 ── */}
        <TabsContent value="g702">
          {!latestDraw ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">No draws yet.</div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden max-w-2xl">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50">
                <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">AIA Document G702</div>
                <div className="mt-0.5 font-display font-bold text-lg text-neutral-950">Application and Certificate for Payment</div>
              </div>
              <div className="divide-y divide-neutral-100">
                {[
                  { label: "1. Original Contract Sum", value: latestDraw.line1ContractSumCents, highlight: false },
                  { label: "2. Net Change by Change Orders", value: latestDraw.line2NetCoCents, highlight: false },
                  { label: "3. Contract Sum to Date (1+2)", value: latestDraw.line3ContractSumToDateCents, highlight: false },
                  { label: "4. Total Completed & Stored to Date", value: latestDraw.line4CompletedStoredCents, highlight: false },
                  { label: "5. Retainage", value: latestDraw.line5RetainageCents, highlight: false, indent: true, muted: true },
                  { label: "6. Total Earned Less Retainage (4−5)", value: latestDraw.line6EarnedLessRetainageCents, highlight: false },
                  { label: "7. Less Previous Certificates for Payment", value: latestDraw.line7LessPreviousCents, highlight: false, muted: true },
                  { label: "8. Current Payment Due", value: latestDraw.line8CurrentPaymentDueCents, highlight: true },
                  { label: "9. Balance to Finish, Including Retainage (3−6)", value: latestDraw.line9BalanceToFinishCents, highlight: false },
                ].map(({ label, value, highlight, indent, muted }) => (
                  <div key={label} className={cn("flex items-center justify-between gap-4 px-5 py-3", highlight && "bg-boulder-50")}>
                    <span className={cn("text-sm", indent && "pl-4", muted ? "text-neutral-500" : highlight ? "font-semibold text-boulder-700" : "text-neutral-700")}>{label}</span>
                    <span className={cn("text-sm tabular font-semibold shrink-0", muted ? "text-neutral-500" : highlight ? "text-boulder-700 text-base" : "text-neutral-950")}>
                      {formatCurrency(value ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── G703 ── */}
        <TabsContent value="g703">
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                  <tr>
                    <th className="text-left py-3 pl-5 pr-2 w-10">Item</th>
                    <th className="text-left py-3 px-2 min-w-[180px]">Description of Work</th>
                    <th className="text-right py-3 px-2">C — Scheduled Value</th>
                    <th className="text-right py-3 px-2">D — From Previous</th>
                    <th className="text-right py-3 px-2">E — This Period</th>
                    <th className="text-right py-3 px-2">F — Materials Stored</th>
                    <th className="text-right py-3 px-2">G — Total Completed</th>
                    <th className="text-right py-3 px-2">G ÷ C</th>
                    <th className="text-right py-3 px-2">H — Balance</th>
                    <th className="text-right py-3 pl-2 pr-5 text-amber-500">I — Retainage</th>
                  </tr>
                </thead>
                <tbody>
                  {divisions.map((div) => {
                    const li = drawLineItems.find((l) => l.divisionId === div.id);
                    const colC = li?.colCScheduledValueCents ?? div.scheduledValueCents;
                    const colD = li?.colDFromPreviousCents ?? 0;
                    const colE = li?.colEThisPeriodCents ?? 0;
                    const colF = li?.colFMaterialsStoredCents ?? 0;
                    const colG = li?.colGCompletedStoredCents ?? (colD + colE + colF);
                    const colGPct = colC > 0 ? (colG / colC) * 100 : 0;
                    const colH = li?.colHBalanceCents ?? Math.max(0, colC - colG);
                    const colI = li?.colIRetainageCents ?? 0;
                    return (
                      <tr key={div.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                        <td className="py-2.5 pl-5 pr-2 text-neutral-400 font-medium">{div.number}</td>
                        <td className="py-2.5 px-2 font-medium text-neutral-900">{div.name}</td>
                        <td className="py-2.5 px-2 text-right">{formatCurrency(colC, { compact: true })}</td>
                        <td className="py-2.5 px-2 text-right text-neutral-500">{formatCurrency(colD, { compact: true })}</td>
                        <td className="py-2.5 px-2 text-right">{formatCurrency(colE, { compact: true })}</td>
                        <td className="py-2.5 px-2 text-right text-neutral-500">{formatCurrency(colF, { compact: true })}</td>
                        <td className="py-2.5 px-2 text-right font-semibold">{formatCurrency(colG, { compact: true })}</td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={cn("text-xs font-semibold", colGPct >= 100 ? "text-emerald-600" : colGPct > 50 ? "text-boulder-600" : "text-neutral-500")}>
                            {colGPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-neutral-500">{formatCurrency(colH, { compact: true })}</td>
                        <td className="py-2.5 pl-2 pr-5 text-right text-amber-700">{colI > 0 ? formatCurrency(colI, { compact: true }) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-bold">
                    <td colSpan={2} className="py-3 pl-5 pr-2 text-neutral-950">Totals</td>
                    {(() => {
                      const totC = divisions.reduce((s, div) => { const li = drawLineItems.find((l) => l.divisionId === div.id); return s + (li?.colCScheduledValueCents ?? div.scheduledValueCents); }, 0);
                      const totD = drawLineItems.reduce((s, l) => s + l.colDFromPreviousCents, 0);
                      const totE = drawLineItems.reduce((s, l) => s + l.colEThisPeriodCents, 0);
                      const totF = drawLineItems.reduce((s, l) => s + l.colFMaterialsStoredCents, 0);
                      const totG = drawLineItems.reduce((s, l) => s + l.colGCompletedStoredCents, 0);
                      const totGPct = totC > 0 ? (totG / totC) * 100 : 0;
                      const totH = drawLineItems.reduce((s, l) => s + l.colHBalanceCents, 0);
                      const totI = drawLineItems.reduce((s, l) => s + l.colIRetainageCents, 0);
                      return (<>
                        <td className="py-3 px-2 text-right">{formatCurrency(totC, { compact: true })}</td>
                        <td className="py-3 px-2 text-right text-neutral-500">{formatCurrency(totD, { compact: true })}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(totE, { compact: true })}</td>
                        <td className="py-3 px-2 text-right text-neutral-500">{formatCurrency(totF, { compact: true })}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(totG, { compact: true })}</td>
                        <td className="py-3 px-2 text-right text-boulder-600">{totGPct.toFixed(1)}%</td>
                        <td className="py-3 px-2 text-right text-neutral-500">{formatCurrency(totH, { compact: true })}</td>
                        <td className="py-3 pl-2 pr-5 text-right text-amber-700">{formatCurrency(totI, { compact: true })}</td>
                      </>);
                    })()}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Bid ── */}
        <TabsContent value="bid">
          <div className="space-y-5">
            {divisions.map((div) => {
              const items = bidLineItems.filter((b) => b.divisionId === div.id);
              if (!items.length) return null;
              const totalBudget = items.reduce((s, b) => s + b.budgetCents, 0);
              const totalActual = items.reduce((s, b) => s + b.actualCents, 0);
              const totalRemaining = totalBudget - totalActual;
              return (
                <div key={div.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-5 py-3 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center tabular">{div.number}</span>
                      <h3 className="font-display font-bold text-base text-neutral-950">{div.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs tabular">
                      <span className="text-neutral-500">Budget: <span className="font-semibold text-neutral-800">{formatCurrency(totalBudget, { compact: true })}</span></span>
                      <span className="text-neutral-500">Spent: <span className="font-semibold text-neutral-800">{formatCurrency(totalActual, { compact: true })}</span></span>
                      <span className={cn("font-semibold", totalRemaining < 0 ? "text-red-600" : "text-emerald-700")}>
                        {totalRemaining < 0 ? `(${formatCurrency(-totalRemaining, { compact: true })})` : formatCurrency(totalRemaining, { compact: true })} remaining
                      </span>
                    </div>
                  </div>
                  <table className="w-full text-sm tabular">
                    <thead className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 bg-neutral-50/40">
                      <tr>
                        <th className="text-left py-2 pl-5 pr-3">Description</th>
                        <th className="text-right py-2 px-3">Budget</th>
                        <th className="text-right py-2 px-3">Total Spend</th>
                        <th className="text-right py-2 px-3">Remaining</th>
                        <th className="text-right py-2 pl-3 pr-5">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((b) => {
                        const pct = b.budgetCents > 0 ? (b.actualCents / b.budgetCents) * 100 : 0;
                        const rem = b.budgetCents - b.actualCents;
                        const over = rem < 0;
                        return (
                          <tr key={b.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                            <td className="py-2.5 pl-5 pr-3">
                              <div className="flex items-center gap-2">
                                {over && pct > 150 && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                                {over && pct <= 150 && <TrendingUp className="h-3 w-3 text-amber-500 shrink-0" />}
                                <span className={cn("text-neutral-900", over && pct > 150 && "font-semibold")}>{b.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-neutral-500">{formatCurrency(b.budgetCents, { compact: true })}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(b.actualCents, { compact: true })}</td>
                            <td className={cn("py-2.5 px-3 text-right font-semibold", over ? "text-red-600" : "text-emerald-700")}>
                              {over ? `(${formatCurrency(-rem, { compact: true })})` : formatCurrency(rem, { compact: true })}
                            </td>
                            <td className="py-2.5 pl-3 pr-5 text-right">
                              <Badge variant={pct > 150 ? "destructive" : pct > 105 ? "warning" : pct > 50 ? "default" : "secondary"} className="tabular">
                                {pct.toFixed(0)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-bold text-sm">
                        <td className="py-2.5 pl-5 pr-3 text-neutral-700">Total</td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(totalBudget, { compact: true })}</td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(totalActual, { compact: true })}</td>
                        <td className={cn("py-2.5 px-3 text-right", totalRemaining < 0 ? "text-red-600" : "text-emerald-700")}>
                          {totalRemaining < 0 ? `(${formatCurrency(-totalRemaining, { compact: true })})` : formatCurrency(totalRemaining, { compact: true })}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 text-right text-neutral-500">
                          {totalBudget > 0 ? `${((totalActual / totalBudget) * 100).toFixed(0)}%` : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

// ── Draws ─────────────────────────────────────────────────────────────────────

export function DrawsTab({ data, initialDrawId }: { data: ProjectPageData; initialDrawId?: string | null }) {
  const { project, draws, divisions, drawLineItems } = data;
  const { role } = useRole();
  const [selectedDrawId, setSelectedDrawId] = React.useState<string | null>(initialDrawId ?? null);
  const [showNewDraw, setShowNewDraw] = React.useState(false);
  const [fetchedLineItems, setFetchedLineItems] = React.useState<ProjectPageData["drawLineItems"] | null>(null);
  const prevInitialDrawId = React.useRef<string | null>(null);

  const filteredDraws = draws.filter((d) => permissions.filterDrawsForRole(role)(d.status));

  // when a new initialDrawId arrives from overview, open it
  React.useEffect(() => {
    if (initialDrawId && initialDrawId !== prevInitialDrawId.current) {
      prevInitialDrawId.current = initialDrawId;
      handleSelectDraw(initialDrawId);
    }
  }, [initialDrawId]);

  async function handleSelectDraw(drawId: string) {
    setSelectedDrawId(drawId);
    setFetchedLineItems(null);
    const items = await actionGetDrawLineItems(drawId);
    setFetchedLineItems(items);
  }

  if (selectedDrawId) {
    const draw = draws.find((d) => d.id === selectedDrawId)!;
    const dli = fetchedLineItems ?? drawLineItems;
    return <DrawDetailView project={project} draw={draw} drawLineItems={dli} divisions={divisions} onBack={() => { setSelectedDrawId(null); setFetchedLineItems(null); }} />;
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Pay applications</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Draws</h1>
          <p className="mt-1 text-sm text-neutral-500">AIA G702 / G703 billing applications to {project.name}&rsquo;s owner.</p>
        </div>
        {permissions.canEditDraw(role) && (
          <Button onClick={() => setShowNewDraw(true)}><Plus className="h-4 w-4" />New draw</Button>
        )}
      </div>

      {showNewDraw && (
        <NewDrawModal
          project={project}
          draws={draws}
          divisions={divisions}
          drawLineItems={drawLineItems}
          onClose={() => setShowNewDraw(false)}
        />
      )}

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm tabular">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
            <tr>
              <th className="text-left py-3 pl-5 pr-3 w-16">#</th>
              <th className="text-left py-3 px-3">Period end</th>
              <th className="text-left py-3 px-3">Status</th>
              <th className="text-right py-3 px-3">Completed to date</th>
              <th className="text-right py-3 px-3">Retainage</th>
              <th className="text-right py-3 px-3">Payment due</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredDraws.map((d) => (
              <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                <td className="py-3 pl-5 pr-3 font-bold text-boulder-700">#{d.number}</td>
                <td className="py-3 px-3">{formatDate(d.periodEndDate)}</td>
                <td className="py-3 px-3"><DrawStatusBadge status={d.status} /></td>
                <td className="py-3 px-3 text-right font-medium">{formatCurrency(d.line4CompletedStoredCents, { compact: true })}</td>
                <td className="py-3 px-3 text-right text-neutral-500">({formatCurrency(d.line5RetainageCents, { compact: true })})</td>
                <td className="py-3 px-3 text-right font-bold text-boulder-700">{formatCurrency(d.line8CurrentPaymentDueCents, { compact: true })}</td>
                <td className="py-3 pr-5">
                  <button onClick={() => handleSelectDraw(d.id)} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-400 hover:text-boulder-600 hover:bg-boulder-50 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// ── New Draw Modal ────────────────────────────────────────────────────────────

function NewDrawModal({ project, draws, divisions, drawLineItems, onClose }: {
  project: ProjectPageData["project"];
  draws: ProjectPageData["draws"];
  divisions: ProjectPageData["divisions"];
  drawLineItems: ProjectPageData["drawLineItems"];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const latestDraw = draws[0];
  const nextNumber = (latestDraw?.number ?? 0) + 1;
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [lines, setLines] = React.useState<Record<string, number>>(
    Object.fromEntries(divisions.map((d) => [d.id, 0]))
  );

  function getPrev(divId: string) {
    const prev = drawLineItems.find((l) => l.divisionId === divId);
    return prev?.colGCompletedStoredCents ?? 0;
  }

  function handleSubmit() {
    if (!periodEnd) return;
    startTransition(async () => {
      const line7 = latestDraw?.line6EarnedLessRetainageCents ?? 0;
      const { id: drawId } = await actionCreateDraw({
        projectId: project.id,
        number: nextNumber,
        periodEndDate: periodEnd,
        line1ContractSumCents: project.contractSumCents,
        line7LessPreviousCents: line7,
      });
      // Save each line item
      for (const div of divisions) {
        await actionSaveDrawLineItem({
          drawId,
          divisionId: div.id,
          colCScheduledValueCents: div.scheduledValueCents,
          colDFromPreviousCents: getPrev(div.id),
          colEThisPeriodCents: lines[div.id] ?? 0,
          colFMaterialsStoredCents: 0,
          retainageBps: project.defaultRetainageBps,
          projectId: project.id,
        });
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-neutral-950">New Draw #{nextNumber}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-neutral-400" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className="text-xs font-medium text-neutral-700">Period end date</label>
            <Input type="date" className="mt-1.5 w-48" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <p className="text-xs text-neutral-500 mb-3">Enter <strong>This Period</strong> amounts per division (dollars):</p>
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                <tr>
                  <th className="text-left py-2 pl-4 pr-2 w-8">#</th>
                  <th className="text-left py-2 pr-3">Division</th>
                  <th className="text-right py-2 px-3">From prev</th>
                  <th className="text-right py-2 px-3">Balance left</th>
                  <th className="text-right py-2 pl-3 pr-4">This period ($)</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((d) => {
                  const prev = getPrev(d.id);
                  const balance = d.scheduledValueCents - prev;
                  return (
                    <tr key={d.id} className="border-t border-neutral-100">
                      <td className="py-2 pl-4 pr-2 text-neutral-400 text-xs">{d.number}</td>
                      <td className="py-2 pr-3 text-xs font-medium text-neutral-900">{d.name}</td>
                      <td className="py-2 px-3 text-right text-xs text-neutral-500">{formatCurrency(prev, { compact: true })}</td>
                      <td className="py-2 px-3 text-right text-xs text-neutral-500">{formatCurrency(balance, { compact: true })}</td>
                      <td className="py-2 pl-3 pr-4">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          className="w-full text-right text-sm border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-boulder-500"
                          value={(lines[d.id] ?? 0) / 100}
                          onChange={(e) => setLines((prev) => ({ ...prev, [d.id]: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !periodEnd}>
            {isPending ? "Creating…" : "Create draw"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Draw Detail ───────────────────────────────────────────────────────────────

function DrawDetailView({ project, draw, drawLineItems, divisions, onBack }: {
  project: ProjectPageData["project"];
  draw: ProjectPageData["draws"][0];
  drawLineItems: ProjectPageData["drawLineItems"];
  divisions: ProjectPageData["divisions"];
  onBack: () => void;
}) {
  const { role } = useRole();
  const [isPending, startTransition] = useTransition();
  const canSeeCFRPane = permissions.canSeeCFR(role);
  const [cfrOpen, setCfrOpen] = React.useState(canSeeCFRPane);

  function handleStatusChange(action: "submit" | "certify" | "pay") {
    startTransition(async () => {
      if (action === "submit") await actionSubmitDraw(draw.id, project.id);
      if (action === "certify") await actionCertifyDraw(draw.id, project.id, "u-architect");
      if (action === "pay") await actionMarkDrawPaid(draw.id, project.id);
    });
  }

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <button onClick={onBack} className="text-xs text-boulder-600 hover:text-boulder-700 font-medium mb-2">← Back to draws</button>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">AIA G702 / G703 · Pay Application</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Draw #{draw.number}</h1>
          <p className="mt-1 text-sm text-neutral-500">Period ending {formatDate(draw.periodEndDate)} · <DrawStatusBadge status={draw.status} /></p>
        </div>
        <div className="flex items-center gap-2">
          {canSeeCFRPane && (
            <Button variant="outline" size="sm" onClick={() => setCfrOpen(!cfrOpen)} className="hidden lg:inline-flex">
              {cfrOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {cfrOpen ? "Hide CFR" : "Show CFR"}
            </Button>
          )}
          <Button variant="outline" size="sm"><Printer className="h-4 w-4" />Print</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export PDF</Button>
          {permissions.canEditDraw(role) && draw.status === "draft" && (
            <Button size="sm" onClick={() => handleStatusChange("submit")} disabled={isPending}>
              <Send className="h-4 w-4" />Submit
            </Button>
          )}
          {permissions.canCertifyDraw(role) && draw.status === "submitted" && (
            <Button size="sm" onClick={() => handleStatusChange("certify")} disabled={isPending}>
              <FileCheck2 className="h-4 w-4" />Certify
            </Button>
          )}
          {role === "contractor_admin" && draw.status === "certified" && (
            <Button size="sm" onClick={() => handleStatusChange("pay")} disabled={isPending}>
              <CheckCircle2 className="h-4 w-4" />Mark paid
            </Button>
          )}
        </div>
      </div>

      <div className={cn("mt-6 grid gap-6", cfrOpen && canSeeCFRPane ? "lg:grid-cols-[1.5fr_1fr]" : "grid-cols-1")}>
        <div className="space-y-5">
          {/* G702 */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-gradient-to-br from-boulder-50 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-boulder-700">G702 · Application & Certification for Payment</div>
                  <h2 className="mt-2 font-display text-xl font-bold text-neutral-950">{project.name}</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">{project.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Application #</div>
                  <div className="tabular font-display text-3xl font-bold text-boulder-600">{draw.number}</div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-2 tabular text-sm">
              <G702Row n="1" label="Original contract sum" value={draw.line1ContractSumCents} />
              <G702Row n="2" label="Net change by change orders" value={draw.line2NetCoCents} />
              <G702Row n="3" label="Contract sum to date (Line 1 ± 2)" value={draw.line3ContractSumToDateCents} bold />
              <G702Row n="4" label="Total completed & stored to date" value={draw.line4CompletedStoredCents} />
              <G702Row n="5" label="Retainage" value={draw.line5RetainageCents} muted />
              <G702Row n="6" label="Total earned less retainage (Line 4 − 5)" value={draw.line6EarnedLessRetainageCents} bold />
              <G702Row n="7" label="Less previous certificates" value={draw.line7LessPreviousCents} muted />
              <Separator className="my-3" />
              <div className="flex items-center justify-between p-3 rounded-lg bg-boulder-50 border border-boulder-200">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-boulder-700">Line 8 · Current payment due</div>
                  <div className="text-xs text-boulder-700/70 mt-0.5">Line 6 − Line 7</div>
                </div>
                <div className="font-display text-2xl font-bold tabular text-boulder-700">{formatCurrency(draw.line8CurrentPaymentDueCents)}</div>
              </div>
              <G702Row n="9" label="Balance to finish, including retainage" value={draw.line9BalanceToFinishCents} muted />
            </div>
          </div>

          {/* G703 */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">G703 · Continuation sheet</div>
                <p className="text-xs text-neutral-500 mt-0.5">Work completed per division</p>
              </div>
              <span className="text-xs text-neutral-500 tabular">{drawLineItems.length} divisions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[18%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead className="bg-neutral-50 text-[9px] font-semibold text-neutral-700 uppercase tracking-wider">
                  {/* Row 1: letter codes + descriptions inline. D·E grouped. */}
                  <tr className="border-b border-neutral-200">
                    <th className="text-center py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>A</th>
                    <th className="text-left py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>B<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Description of Work</span></th>
                    <th className="text-right py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>C<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Scheduled Value</span></th>
                    <th className="text-center py-1 px-2 border-r border-neutral-200 bg-neutral-100" colSpan={2}>D · E — Work Completed</th>
                    <th className="text-right py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>F<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Materials Presently Stored</span></th>
                    <th className="text-right py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>G<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Total Completed &amp; Stored (D+E+F)</span></th>
                    <th className="text-center py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>G÷C<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">%</span></th>
                    <th className="text-right py-1.5 px-2 border-r border-neutral-200" rowSpan={2}>H<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Balance to Finish (C−G)</span></th>
                    <th className="text-right py-1.5 px-2" rowSpan={2}>I<br/><span className="font-normal normal-case text-neutral-400 text-[8px]">Retainage (if variable)</span></th>
                  </tr>
                  <tr className="border-b border-neutral-200 bg-neutral-100">
                    <th className="text-right py-1 px-2 border-r border-neutral-200 font-normal normal-case text-neutral-500">D — From Previous Application</th>
                    <th className="text-right py-1 px-2 border-r border-neutral-200 font-normal normal-case text-neutral-500">E — This Period</th>
                  </tr>
                </thead>
                <tbody>
                  {drawLineItems.map((l) => {
                    const d = divisions.find((dd) => dd.id === l.divisionId);
                    return (
                      <tr key={l.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                        <td className="py-2 pl-4 pr-2 text-neutral-400 font-medium">{d?.number}</td>
                        <td className="py-2 pr-2 font-medium text-neutral-900">{d?.name}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(l.colCScheduledValueCents, { compact: true })}</td>
                        <td className="py-2 px-2 text-right text-neutral-500">{formatCurrency(l.colDFromPreviousCents, { compact: true })}</td>
                        <td className={cn("py-2 px-2 text-right", l.colEThisPeriodCents > 0 ? "text-boulder-700 font-semibold" : "text-neutral-400")}>
                          {l.colEThisPeriodCents > 0 ? formatCurrency(l.colEThisPeriodCents, { compact: true }) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right text-neutral-400">{l.colFMaterialsStoredCents > 0 ? formatCurrency(l.colFMaterialsStoredCents, { compact: true }) : "—"}</td>
                        <td className="py-2 px-2 text-right font-semibold">{formatCurrency(l.colGCompletedStoredCents, { compact: true })}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-bold", l.colGPercentBps === 10000 ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700")}>
                            {formatPercent(l.colGPercentBps, 0)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-neutral-500">{l.colHBalanceCents > 0 ? formatCurrency(l.colHBalanceCents, { compact: true }) : "—"}</td>
                        <td className="py-2 pl-2 pr-4 text-right text-neutral-500">{l.colIRetainageCents > 0 ? formatCurrency(l.colIRetainageCents, { compact: true }) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-bold text-[11px]">
                    <td colSpan={2} className="py-3 pl-4 text-neutral-950">GRAND TOTAL</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colCScheduledValueCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colDFromPreviousCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2 text-right text-boulder-700">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colEThisPeriodCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colFMaterialsStoredCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colGCompletedStoredCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2"></td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colHBalanceCents, 0), { compact: true })}</td>
                    <td className="py-3 pl-2 pr-4 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colIRetainageCents, 0), { compact: true })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* CFR pane */}
        <AnimatePresence>
          {cfrOpen && canSeeCFRPane && (
            <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-5">
              <div className="rounded-xl border-2 border-boulder-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-boulder-50 border-b border-boulder-200 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-boulder-500 animate-pulse" />
                  <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-boulder-700">CFR context</div>
                  <span className="text-[10px] text-boulder-700/60 ml-auto">Contractor-only</span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {divisions.map((d) => {
                    const line = drawLineItems.find((l) => l.divisionId === d.id);
                    const pctOfBudget = d.scheduledValueCents > 0 ? (d.grossSpendCents / d.scheduledValueCents) * 100 : 0;
                    const over = d.grossSpendCents > d.scheduledValueCents;
                    return (
                      <div key={d.id} className="p-3 hover:bg-neutral-50/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-neutral-400 tabular w-5 shrink-0">{d.number}</span>
                            <span className="text-xs font-medium text-neutral-900 truncate">{d.name}</span>
                          </div>
                          <span className={cn("text-[11px] font-bold tabular shrink-0", over ? "text-red-600" : "text-neutral-600")}>{pctOfBudget.toFixed(0)}%</span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-neutral-100 overflow-hidden">
                          <div className={cn("h-full", over ? "bg-red-500" : "bg-boulder-500")} style={{ width: `${Math.min(100, pctOfBudget)}%` }} />
                        </div>
                        {line && line.colEThisPeriodCents > 0 && (
                          <div className="mt-1 text-[10px] text-boulder-700 font-semibold tabular">+{formatCurrency(line.colEThisPeriodCents, { compact: true })} this draw</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
          {!canSeeCFRPane && (
            <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col items-center justify-center text-center">
              <Lock className="h-5 w-5 text-neutral-400" />
              <p className="mt-2 text-xs text-neutral-500 max-w-[240px]">CFR context visible only to contractor.</p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function TransactionsTab({ data }: { data: ProjectPageData }) {
  const { project, divisions, transactions } = data;
  const { role } = useRole();
  const [query, setQuery] = React.useState("");
  const [isPending, startTransition] = useTransition();
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState({ divisionId: divisions[0]?.id ?? "", vendor: "", description: "", date: "", amountDollars: "", type: "invoice" as const });

  if (!permissions.canSeeTransactionDetail(role)) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Lock className="h-6 w-6 text-amber-600 mx-auto" />
          <h1 className="mt-3 font-display text-xl font-bold text-amber-900">Transactions restricted</h1>
        </div>
      </main>
    );
  }

  const filtered = transactions.filter((t) =>
    t.vendor.toLowerCase().includes(query.toLowerCase()) ||
    t.description.toLowerCase().includes(query.toLowerCase())
  );
  const total = filtered.reduce((s, t) => s + t.amountCents, 0);

  const PAGE_SIZE = 50;
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setPage(1); }, [query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleCreate() {
    startTransition(async () => {
      await actionCreateTransaction({
        projectId: project.id,
        divisionId: form.divisionId,
        date: form.date,
        amountCents: Math.round(parseFloat(form.amountDollars || "0") * 100),
        vendor: form.vendor,
        description: form.description,
        type: form.type,
        paymentStatus: "paid",
      });
      setShowNew(false);
      setForm({ divisionId: divisions[0]?.id ?? "", vendor: "", description: "", date: "", amountDollars: "", type: "invoice" });
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await actionDeleteTransaction(id, project.id); });
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Cost ledger</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Transactions</h1>
          <p className="mt-1 text-sm text-neutral-500">{filtered.length} transactions · {formatCurrency(total, { compact: true })} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search…" className="pl-9 w-[220px]" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          {permissions.canEditDraw(role) && (
            <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />Add transaction</Button>
          )}
        </div>
      </div>

      {showNew && (
        <div className="mt-4 rounded-xl border border-boulder-200 bg-boulder-50 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">New transaction</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-neutral-700">Division</label>
              <select className="mt-1 w-full border border-neutral-200 rounded-md px-3 py-2 text-sm" value={form.divisionId} onChange={(e) => setForm((f) => ({ ...f, divisionId: e.target.value }))}>
                {divisions.map((d) => <option key={d.id} value={d.id}>Div {d.number} · {d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Vendor</label>
              <Input className="mt-1" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Date</label>
              <Input type="date" className="mt-1" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Amount ($)</label>
              <Input type="number" step="0.01" className="mt-1" value={form.amountDollars} onChange={(e) => setForm((f) => ({ ...f, amountDollars: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Description</label>
              <Input className="mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Type</label>
              <select className="mt-1 w-full border border-neutral-200 rounded-md px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}>
                <option value="invoice">Invoice</option>
                <option value="payroll">Payroll</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCreate} disabled={isPending || !form.vendor || !form.date || !form.amountDollars}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
              <tr>
                <th className="text-left py-3 pl-5 pr-3 w-28">Date</th>
                <th className="text-left py-3 px-3">Vendor</th>
                <th className="text-left py-3 px-3">Description</th>
                <th className="text-left py-3 px-3">Division</th>
                <th className="text-left py-3 px-3">Type</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-right py-3 pl-3 pr-3">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => {
                const div = divisions.find((d) => d.id === t.divisionId);
                return (
                  <tr key={t.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                    <td className="py-3 pl-5 pr-3 text-neutral-500">{t.date ? formatDate(t.date) : "—"}</td>
                    <td className="py-3 px-3 font-medium text-neutral-950">{t.vendor}</td>
                    <td className="py-3 px-3 text-neutral-700">{t.description}</td>
                    <td className="py-3 px-3"><Badge variant="outline" className="font-normal">{div?.number} · {div?.name}</Badge></td>
                    <td className="py-3 px-3 text-neutral-500 capitalize text-xs">{t.type.replace("_", " ")}</td>
                    <td className="py-3 px-3"><Badge variant={t.paymentStatus === "paid" ? "success" : "warning"} className="capitalize">{t.paymentStatus}</Badge></td>
                    <td className="py-3 pl-3 pr-3 text-right font-bold">{formatCurrency(t.amountCents, { showCents: true })}</td>
                    <td className="py-3 pr-4">
                      {permissions.canEditDraw(role) && (
                        <button onClick={() => handleDelete(t.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 text-xs tabular">
              <span className="text-neutral-500">
                Page {page} of {pageCount} · rows {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>« First</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next ›</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page === pageCount}>Last »</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Change Orders ─────────────────────────────────────────────────────────────

export function ChangeOrdersTab({ data }: { data: ProjectPageData }) {
  const { project, changeOrders } = data;
  const { role } = useRole();
  const [isPending, startTransition] = useTransition();
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState({ description: "", date: "", amountDollars: "" });

  const pendingTotal = changeOrders.filter((c) => c.status === "pending").reduce((s, c) => s + c.amountCents, 0);
  const approvedTotal = changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + c.amountCents, 0);

  function handleCreate() {
    startTransition(async () => {
      await actionCreateChangeOrder({
        projectId: project.id,
        number: changeOrders.length + 1,
        date: form.date,
        description: form.description,
        amountCents: Math.round(parseFloat(form.amountDollars || "0") * 100),
      });
      setShowNew(false);
      setForm({ description: "", date: "", amountDollars: "" });
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Contract modifications</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Change Orders</h1>
          <p className="mt-1 text-sm text-neutral-500">{changeOrders.length} total · {formatCurrency(pendingTotal + approvedTotal, { compact: true })} cumulative</p>
        </div>
        {(role === "contractor_admin" || role === "contractor_pm") && (
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />New change order</Button>
        )}
      </div>

      {showNew && (
        <div className="mt-4 rounded-xl border border-boulder-200 bg-boulder-50 p-4">
          <h3 className="text-sm font-semibold mb-3">New change order</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-neutral-700">Description</label>
              <Input className="mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Date</label>
              <Input type="date" className="mt-1" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700">Amount ($)</label>
              <Input type="number" step="0.01" className="mt-1" value={form.amountDollars} onChange={(e) => setForm((f) => ({ ...f, amountDollars: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCreate} disabled={isPending || !form.description || !form.date}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Pending</div>
          <div className="mt-2 font-display text-2xl font-bold tabular text-amber-600">{formatCurrency(pendingTotal, { compact: true })}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Approved</div>
          <div className="mt-2 font-display text-2xl font-bold tabular text-emerald-600">{formatCurrency(approvedTotal, { compact: true })}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">New contract sum</div>
          <div className="mt-2 font-display text-2xl font-bold tabular text-neutral-950">{formatCurrency(project.contractSumCents + approvedTotal, { compact: true })}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm tabular">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
            <tr>
              <th className="text-left py-3 pl-5 pr-3 w-16">CO #</th>
              <th className="text-left py-3 px-3 w-28">Date</th>
              <th className="text-left py-3 px-3">Description</th>
              <th className="text-left py-3 px-3 w-28">Status</th>
              <th className="text-right py-3 pl-3 pr-3 w-36">Amount</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {changeOrders.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-neutral-500">No change orders yet</td></tr>
            ) : changeOrders.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                <td className="py-3 pl-5 pr-3 font-bold text-neutral-950">#{c.number}</td>
                <td className="py-3 px-3 text-neutral-500">{formatDate(c.date)}</td>
                <td className="py-3 px-3 text-neutral-900">{c.description}</td>
                <td className="py-3 px-3">
                  <Badge variant={c.status === "approved" ? "success" : c.status === "pending" ? "warning" : "destructive"} className="capitalize">
                    {c.status}
                  </Badge>
                </td>
                <td className="py-3 pl-3 pr-3 text-right font-bold">{c.amountCents >= 0 ? "+" : ""}{formatCurrency(c.amountCents)}</td>
                <td className="py-3 pr-4">
                  {c.status === "pending" && role === "contractor_admin" && (
                    <div className="flex gap-1">
                      <button onClick={() => startTransition(() => actionApproveChangeOrder(c.id, project.id))} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Approve</button>
                      <span className="text-neutral-300">·</span>
                      <button onClick={() => startTransition(() => actionRejectChangeOrder(c.id, project.id))} className="text-red-500 hover:text-red-600 text-xs font-medium">Reject</button>
                    </div>
                  )}
                  {c.status === "pending" && role === "architect" && (
                    <button onClick={() => startTransition(() => actionApproveChangeOrder(c.id, project.id))} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────

export function TeamTab({ data }: { data: ProjectPageData }) {
  const { project, memberships } = data;
  const { role } = useRole();

  if (role !== "contractor_admin") {
    return (
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Lock className="h-6 w-6 text-amber-600 mx-auto" />
          <h1 className="mt-3 font-display text-xl font-bold text-amber-900">Admin only</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Project access</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Team</h1>
          <p className="mt-1 text-sm text-neutral-500">{memberships.length} people have access to {project.name}</p>
        </div>
        <Button><Plus className="h-4 w-4" />Invite member</Button>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
            <tr>
              <th className="text-left py-3 pl-5 pr-3">Member</th>
              <th className="text-left py-3 px-3">Organization</th>
              <th className="text-left py-3 px-3">Role</th>
              <th className="text-left py-3 px-3">Scope</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const roleInfo = ROLES.find((r) => r.id === m.membership.projectRole);
              return (
                <tr key={m.membership.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: m.user.avatarColor }}>
                        {m.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-neutral-950">{m.user.name}</div>
                        <div className="inline-flex items-center gap-1 text-[11px] text-neutral-500"><Mail className="h-3 w-3" />{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-neutral-700">{m.org.name}</td>
                  <td className="py-3 px-3">
                    <Badge variant={m.membership.projectRole.startsWith("contractor") ? "default" : m.membership.projectRole === "owner" ? "warning" : "secondary"}>
                      {roleInfo?.label ?? m.membership.projectRole}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-xs text-neutral-500">{roleInfo?.description}</td>
                  <td className="py-3 pr-5"><Button variant="ghost" size="sm" className="text-xs">Edit</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SettingsTab({ data }: { data: ProjectPageData }) {
  const { project, organizations } = data;
  const { role } = useRole();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = React.useState(project.name);
  const [address, setAddress] = React.useState(project.address);
  const [contractDate, setContractDate] = React.useState(project.contractDate);
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("boulder-compact") === "1";
    setCompact(saved);
    document.documentElement.classList.toggle("compact", saved);
  }, []);

  function toggleCompact(next: boolean) {
    setCompact(next);
    localStorage.setItem("boulder-compact", next ? "1" : "0");
    document.documentElement.classList.toggle("compact", next);
  }

  const owner = organizations.find((o) => o.id === project.ownerOrgId);
  const architect = organizations.find((o) => o.id === project.architectOrgId);

  if (role !== "contractor_admin") {
    return (
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Lock className="h-6 w-6 text-amber-600 mx-auto" />
          <h1 className="mt-3 font-display text-xl font-bold text-amber-900">Admin only</h1>
        </div>
      </main>
    );
  }

  function handleSave() {
    startTransition(async () => {
      await actionUpdateProject(project.id, { name, address, contractDate });
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">Project configuration</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-950">Settings</h1>
      </div>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display font-bold text-base text-neutral-950">Project details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Project name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Project number</label>
              <Input defaultValue={project.projectNumber ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Contract date</label>
              <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display font-bold text-base text-neutral-950">Parties</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Owner</label>
              <Input defaultValue={owner?.name ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Architect</label>
              <Input defaultValue={architect?.name ?? ""} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display font-bold text-base text-neutral-950">Contract & retainage</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Contract sum</label>
              <Input defaultValue={`$${(project.contractSumCents / 100).toLocaleString()}`} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Default retainage rate</label>
              <Input defaultValue={formatPercent(project.defaultRetainageBps)} disabled />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4" />{isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display font-bold text-base text-neutral-950">Display</h2>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-neutral-900">Compact view</div>
              <p className="mt-0.5 text-xs text-neutral-500">Reduces padding and font sizes across the UI for denser data tables.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={compact}
              onClick={() => toggleCompact(!compact)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                compact ? "bg-boulder-500" : "bg-neutral-300",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                  compact ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-display font-bold text-red-900">Danger zone</h3>
          <p className="text-xs text-red-800 mt-1">Archiving hides project from active views. Certified draws remain immutable.</p>
          <Button variant="outline" className="mt-3 border-red-300 text-red-700 hover:bg-red-100" size="sm">Archive project</Button>
        </div>
      </div>
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DrawStatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "default" | "warning" | "secondary" | "outline"> = {
    paid: "success", certified: "default", submitted: "warning", draft: "secondary", voided: "outline",
  };
  return <Badge variant={map[status] ?? "outline"} className="capitalize">{status}</Badge>;
}

function G702Row({ n, label, value, bold, muted }: { n: string; label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[10px] font-bold text-neutral-400 tabular shrink-0 w-5">{n}.</span>
        <span className={cn("text-xs", bold ? "font-bold text-neutral-950" : "text-neutral-700", muted && "text-neutral-500")}>{label}</span>
      </div>
      <span className={cn("tabular shrink-0", bold ? "text-sm font-bold text-neutral-950" : "text-sm text-neutral-700", muted && "text-neutral-500")}>{formatCurrency(value)}</span>
    </div>
  );
}
