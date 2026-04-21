"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TopBar } from "@/components/shell";
import { cn } from "@/lib/utils";
import { useRole } from "@/components/role-context";
import { useProjectData } from "./project-data-context";

type TabDef = { href: string; label: string; match: string; roles: "all" | "no-owner" | "contractor-only" | "admin-only" };

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { role } = useRole();
  const { project } = useProjectData();

  const tabs: TabDef[] = [
    { href: `/projects/${projectId}`,                label: "Overview",       match: "",                roles: "all" },
    { href: `/projects/${projectId}/cfr`,            label: "CFR",             match: "cfr",             roles: "no-owner" },
    { href: `/projects/${projectId}/draws`,          label: "Draws",           match: "draws",           roles: "all" },
    { href: `/projects/${projectId}/transactions`,   label: "Transactions",    match: "transactions",    roles: "contractor-only" },
    { href: `/projects/${projectId}/change-orders`,  label: "Change Orders",   match: "change-orders",   roles: "no-owner" },
    { href: `/projects/${projectId}/team`,           label: "Team",            match: "team",            roles: "admin-only" },
    { href: `/projects/${projectId}/settings`,       label: "Settings",        match: "settings",        roles: "admin-only" },
  ];

  const visible = tabs.filter((t) => {
    if (t.roles === "all") return true;
    if (t.roles === "no-owner") return role !== "owner";
    if (t.roles === "contractor-only") return ["contractor_admin", "contractor_pm", "contractor_viewer", "accountant"].includes(role);
    if (t.roles === "admin-only") return role === "contractor_admin";
    return true;
  });

  return (
    <>
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
          {visible.map((t) => {
            const active =
              t.match === ""
                ? pathname === `/projects/${projectId}`
                : pathname.startsWith(`/projects/${projectId}/${t.match}`);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  prefetch
                  className={cn(
                    "inline-flex items-center px-3 h-11 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-boulder-500 text-boulder-700"
                      : "border-transparent text-neutral-600 hover:text-neutral-900",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
