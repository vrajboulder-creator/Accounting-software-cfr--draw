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
  Trash2, CheckCircle2, XCircle, Clock, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "overview" | "cfr" | "draws" | "transactions" | "change-orders" | "team" | "settings";

const TAB_DEFS: { id: TabId; label: string; roles: "all" | "no-owner" | "contractor-only" | "admin-only" }[] = [
  { id: "overview",      label: "Overview",      roles: "all" },
  { id: "cfr",           label: "CFR",            roles: "no-owner" },
  { id: "draws",         label: "Draws",          roles: "all" },
  { id: "transactions",  label: "Transactions",   roles: "contractor-only" },
  { id: "change-orders", label: "Change Orders",  roles: "no-owner" },
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

      <div className={activeTab === "overview"      ? undefined : "hidden"}><OverviewTab      data={data} setActiveTab={setActiveTab} /></div>
      <div className={activeTab === "cfr"           ? undefined : "hidden"}><CFRTab           data={data} /></div>
      <div className={activeTab === "draws"         ? undefined : "hidden"}><DrawsTab         data={data} /></div>
      <div className={activeTab === "transactions"  ? undefined : "hidden"}><TransactionsTab  data={data} /></div>
      <div className={activeTab === "change-orders" ? undefined : "hidden"}><ChangeOrdersTab  data={data} /></div>
      <div className={activeTab === "team"          ? undefined : "hidden"}><TeamTab          data={data} /></div>
      <div className={activeTab === "settings"      ? undefined : "hidden"}><SettingsTab      data={data} /></div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

export function OverviewTab({ data, setActiveTab }: { data: ProjectPageData; setActiveTab?: (t: TabId) => void }) {
  const { project, divisions, draws, changeOrders, bidLineItems } = data;
  const { role } = useRole();
  const isOwner = role === "owner";

  const latestDraw = draws[0];
  const scheduled = divisions.reduce((s, d) => s + d.scheduledValueCents, 0);
  const spent = divisions.reduce((s, d) => s + d.grossSpendCents, 0);
  const billed = latestDraw?.line4CompletedStoredCents ?? 0;
  const pctComplete = scheduled > 0 ? Math.min(100, (billed / scheduled) * 100) : 0;
  const remaining = project.contractSumCents - billed;

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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-neutral-950">Draw history</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{draws.length} draw{draws.length === 1 ? "" : "s"} submitted</p>
            </div>
            <Link href={`/projects/${project.id}/draws`} className="text-xs font-semibold text-boulder-600 hover:text-boulder-700">View all →</Link>
          </div>
          <div className="p-5 space-y-3">
            {draws.slice(0, 6).map((d) => {
              const pct = project.contractSumCents > 0 ? (d.line4CompletedStoredCents / project.contractSumCents) * 100 : 0;
              return (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-boulder-50 text-boulder-700 flex items-center justify-center font-bold text-sm tabular shrink-0">{d.number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-950">Draw #{d.number}</span>
                      <DrawStatusBadge status={d.status} />
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-500 tabular">
                      {new Date(d.periodEndDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} · Requested {formatCurrency(d.line8CurrentPaymentDueCents, { compact: true })}
                    </div>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="text-[10px] tabular text-neutral-500 text-right">{pct.toFixed(1)}% cumulative</div>
                    <div className="mt-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-boulder-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
    </main>
  );
}

// ── CFR ───────────────────────────────────────────────────────────────────────

export function CFRTab({ data }: { data: ProjectPageData }) {
  const { divisions, bidLineItems, transactions } = data;
  const { role } = useRole();

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
    <main className="max-w-7xl mx-auto px-6 py-8">
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
          <TabsTrigger value="bid">Bid line items</TabsTrigger>
          <TabsTrigger value="detail">Transactions ({transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                  <tr>
                    <th className="text-left py-3 pl-5 pr-3 w-10">#</th>
                    <th className="text-left py-3 pr-3">Category</th>
                    <th className="text-right py-3 px-3">Scheduled</th>
                    <th className="text-right py-3 px-3">Gross spend</th>
                    <th className="text-right py-3 px-3">Retainage</th>
                    <th className="text-right py-3 px-3">Net received</th>
                    <th className="text-right py-3 px-3" title="Gross spend − Retainage − Net received">Cash balance</th>
                    <th className="text-right py-3 pl-3 pr-5">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {divisions.map((d) => {
                    const rem = d.scheduledValueCents - d.grossSpendCents;
                    const pctUsed = d.scheduledValueCents > 0 ? (d.grossSpendCents / d.scheduledValueCents) * 100 : 0;
                    const over = rem < 0;
                    return (
                      <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                        <td className="py-3 pl-5 pr-3 text-neutral-400 font-medium">{d.number}</td>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-neutral-950">{d.name}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 rounded-full bg-neutral-100 w-24 overflow-hidden">
                              <div className={`h-full ${pctUsed > 100 ? "bg-red-500" : "bg-boulder-500"}`} style={{ width: `${Math.min(100, pctUsed)}%` }} />
                            </div>
                            <span className="text-[10px] text-neutral-500">{pctUsed.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">{formatCurrency(d.scheduledValueCents)}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(d.grossSpendCents)}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{d.retainageCents > 0 ? `(${formatCurrency(d.retainageCents)})` : "—"}</td>
                        <td className="py-3 px-3 text-right font-medium">{formatCurrency(d.netReceivedCents)}</td>
                        <td className={`py-3 px-3 text-right tabular ${Math.abs(d.grossSpendCents - d.retainageCents - d.netReceivedCents) < 100 ? "text-emerald-600" : "text-amber-600"}`}>
                          {formatCurrency(d.grossSpendCents - d.retainageCents - d.netReceivedCents)}
                        </td>
                        <td className={`py-3 pl-3 pr-5 text-right font-semibold ${over ? "text-red-600" : rem < d.scheduledValueCents * 0.02 ? "text-amber-600" : "text-emerald-700"}`}>
                          {over ? `(${formatCurrency(-rem)})` : formatCurrency(rem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-bold">
                    <td colSpan={2} className="py-4 pl-5 pr-3 text-neutral-950">Total</td>
                    <td className="py-4 px-3 text-right">{formatCurrency(totals.scheduled)}</td>
                    <td className="py-4 px-3 text-right">{formatCurrency(totals.gross)}</td>
                    <td className="py-4 px-3 text-right text-neutral-500">({formatCurrency(totals.retn)})</td>
                    <td className="py-4 px-3 text-right">{formatCurrency(totals.net)}</td>
                    <td className={`py-4 px-3 text-right tabular ${Math.abs(totals.gross - totals.retn - totals.net) < 100 ? "text-emerald-600" : "text-amber-600"}`}>
                      {formatCurrency(totals.gross - totals.retn - totals.net)}
                    </td>
                    <td className="py-4 pl-3 pr-5 text-right text-boulder-600">{formatCurrency(remaining)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bid">
          <div className="space-y-5">
            {divisions.map((d) => {
              const items = bidLineItems.filter((b) => b.divisionId === d.id);
              if (!items.length) return null;
              return (
                <div key={d.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-5 py-3 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center tabular">{d.number}</span>
                      <h3 className="font-display font-bold text-base text-neutral-950">{d.name}</h3>
                    </div>
                    <span className="text-xs tabular text-neutral-500">{formatCurrency(d.grossSpendCents, { compact: true })} / {formatCurrency(d.scheduledValueCents, { compact: true })}</span>
                  </div>
                  <table className="w-full text-sm tabular">
                    <thead className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                      <tr>
                        <th className="text-left py-2 pl-5 pr-3">Line item</th>
                        <th className="text-right py-2 px-3">Budget</th>
                        <th className="text-right py-2 px-3">Actual</th>
                        <th className="text-right py-2 px-3">Variance</th>
                        <th className="text-right py-2 pl-3 pr-5">% used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((b) => {
                        const pct = b.budgetCents > 0 ? (b.actualCents / b.budgetCents) * 100 : 0;
                        const variance = b.budgetCents - b.actualCents;
                        const over = variance < 0;
                        return (
                          <tr key={b.id} className="border-t border-neutral-100">
                            <td className="py-2.5 pl-5 pr-3 text-neutral-900">
                              <div className="flex items-center gap-2">
                                {over && pct > 150 && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                {over && pct <= 150 && <TrendingUp className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                <span className={over && pct > 150 ? "font-semibold" : ""}>{b.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-neutral-500">{formatCurrency(b.budgetCents, { compact: true })}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(b.actualCents, { compact: true })}</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${over ? "text-red-600" : "text-neutral-600"}`}>
                              {over ? `(${formatCurrency(-variance, { compact: true })})` : formatCurrency(variance, { compact: true })}
                            </td>
                            <td className="py-2.5 pl-3 pr-5 text-right">
                              <Badge variant={pct > 150 ? "destructive" : pct > 105 ? "warning" : pct > 50 ? "default" : "secondary"} className="tabular">{pct.toFixed(0)}%</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="detail">
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                  <tr>
                    <th className="text-left py-3 pl-5 pr-3">Date</th>
                    <th className="text-left py-3 px-3">Vendor</th>
                    <th className="text-left py-3 px-3">Description</th>
                    <th className="text-left py-3 px-3">Division</th>
                    <th className="text-right py-3 pl-3 pr-5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const div = divisions.find((d) => d.id === t.divisionId);
                    return (
                      <tr key={t.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                        <td className="py-2.5 pl-5 pr-3 text-neutral-500">{t.date ? formatDate(t.date) : "—"}</td>
                        <td className="py-2.5 px-3 font-medium text-neutral-950">{t.vendor}</td>
                        <td className="py-2.5 px-3 text-neutral-700">{t.description}</td>
                        <td className="py-2.5 px-3"><Badge variant="outline" className="font-normal">Div {div?.number} · {div?.name}</Badge></td>
                        <td className="py-2.5 pl-3 pr-5 text-right font-semibold">{formatCurrency(t.amountCents, { showCents: true })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

// ── Draws ─────────────────────────────────────────────────────────────────────

export function DrawsTab({ data }: { data: ProjectPageData }) {
  const { project, draws, divisions, drawLineItems } = data;
  const { role } = useRole();
  const [selectedDrawId, setSelectedDrawId] = React.useState<string | null>(null);
  const [showNewDraw, setShowNewDraw] = React.useState(false);
  const [fetchedLineItems, setFetchedLineItems] = React.useState<ProjectPageData["drawLineItems"] | null>(null);

  const filteredDraws = draws.filter((d) => permissions.filterDrawsForRole(role)(d.status));

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
              <table className="w-full text-xs tabular">
                <thead className="bg-neutral-50 text-[9px] uppercase tracking-wider font-semibold text-neutral-500">
                  <tr>
                    <th className="text-left py-2 pl-4 pr-2 w-8">#</th>
                    <th className="text-left py-2 pr-2">Division</th>
                    <th className="text-right py-2 px-2">Sched (C)</th>
                    <th className="text-right py-2 px-2">From prev (D)</th>
                    <th className="text-right py-2 px-2">This period (E)</th>
                    <th className="text-right py-2 px-2">Stored (F)</th>
                    <th className="text-right py-2 px-2">Total (G)</th>
                    <th className="text-right py-2 px-2">%</th>
                    <th className="text-right py-2 px-2">Balance (H)</th>
                    <th className="text-right py-2 pl-2 pr-4">Retn (I)</th>
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
                    <td colSpan={6} className="py-3 pl-4 text-neutral-950">GRAND TOTAL</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(drawLineItems.reduce((s, l) => s + l.colGCompletedStoredCents, 0), { compact: true })}</td>
                    <td className="py-3 px-2"></td>
                    <td className="py-3 px-2"></td>
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
