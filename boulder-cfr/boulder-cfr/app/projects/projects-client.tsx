"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Building2, MapPin, Plus, Search } from "lucide-react";
import { TopBar } from "@/components/shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRole } from "@/components/role-context";

type ProjectWithStats = {
  id: string;
  name: string;
  projectNumber: string | null;
  address: string;
  contractSumCents: number;
  status: string;
  coverColor: string;
  scheduledCents: number;
  spentCents: number;
  latestDraw: { number: number; status: string } | null;
};

export function ProjectsClient({ projects }: { projects: ProjectWithStats[] }) {
  const { role } = useRole();
  const [query, setQuery] = React.useState("");

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <TopBar breadcrumb={<span className="font-semibold text-neutral-900">Projects</span>} />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-boulder-600">
              {role === "owner" ? "Projects you own" : "Your portfolio"}
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-neutral-950">
              Projects
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {filtered.length} project{filtered.length === 1 ? "" : "s"} ·{" "}
              {formatCurrency(filtered.reduce((s, p) => s + p.contractSumCents, 0), { compact: true })} under contract
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search projects…"
                className="pl-9 w-[240px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {(role === "contractor_admin" || role === "contractor_pm") && (
              <Button>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => {
            const scheduled = p.scheduledCents || p.contractSumCents;
            const spent = p.spentCents;
            const pct = Math.min(100, Math.round((spent / scheduled) * 100));
            const lastDraw = p.latestDraw;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Link
                  href={`/projects/${p.id}`}
                  className="group block relative overflow-hidden rounded-xl border border-neutral-200 bg-white hover:border-boulder-300 hover:shadow-lg transition-all"
                >
                  <div className="h-1.5 w-full" style={{ background: p.coverColor }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                            {p.projectNumber}
                          </span>
                          <Badge
                            variant={p.status === "active" ? "default" : p.status === "completed" ? "success" : "secondary"}
                            className="capitalize text-[10px] tracking-wider"
                          >
                            {p.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold text-neutral-950 group-hover:text-boulder-700 transition-colors">
                          {p.name}
                        </h3>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
                          <MapPin className="h-3 w-3" />
                          {p.address}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-boulder-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Progress
                        </span>
                        <span className="tabular text-sm font-bold text-neutral-950">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full bg-boulder-500"
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                          Contract sum
                        </div>
                        <div className="tabular text-sm font-semibold text-neutral-950 mt-0.5">
                          {formatCurrency(p.contractSumCents, { compact: true })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                          {lastDraw ? `Draw #${lastDraw.number}` : "No draws"}
                        </div>
                        <div className="tabular text-sm font-semibold text-neutral-950 mt-0.5 capitalize">
                          {lastDraw ? lastDraw.status : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
