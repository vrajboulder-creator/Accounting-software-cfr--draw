"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { BoulderMark } from "./boulder-logo";
import { useRole } from "./role-context";
import { cn } from "@/lib/utils";

export function TopBar({
  backHref,
  backLabel,
  breadcrumb,
}: {
  backHref?: string;
  backLabel?: string;
  breadcrumb?: React.ReactNode;
}) {
  const { user } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center h-14 px-6 gap-6">
        <Link href="/projects" className="shrink-0">
          <BoulderMark size="sm" />
        </Link>
        <div className="h-5 w-px bg-neutral-200" />

        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-boulder-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel ?? "Back"}
          </Link>
        )}

        {breadcrumb && <div className="text-sm text-neutral-600 flex-1 min-w-0 truncate">{breadcrumb}</div>}

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-neutral-900">{user.name}</span>
            <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">{user.email}</span>
          </div>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ background: user.avatarColor ?? "#64748B" }}
          >
            {user.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <button
            onClick={() => router.push("/login")}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { role } = useRole();
  const base = `/projects/${projectId}`;

  const allTabs = [
    { href: base, label: "Overview", roles: "all" as const },
    { href: `${base}/cfr`, label: "CFR", roles: "no-owner" as const },
    { href: `${base}/draws`, label: "Draws", roles: "all" as const },
    { href: `${base}/transactions`, label: "Transactions", roles: "contractor-only" as const },
    { href: `${base}/change-orders`, label: "Change Orders", roles: "no-owner" as const },
    { href: `${base}/team`, label: "Team", roles: "admin-only" as const },
    { href: `${base}/settings`, label: "Settings", roles: "admin-only" as const },
  ];

  const tabs = allTabs.filter((t) => {
    if (t.roles === "all") return true;
    if (t.roles === "no-owner") return role !== "owner";
    if (t.roles === "contractor-only")
      return role === "contractor_admin" || role === "contractor_pm" || role === "contractor_viewer" || role === "accountant";
    if (t.roles === "admin-only") return role === "contractor_admin";
    return true;
  });

  return (
    <nav className="border-b border-neutral-200 bg-white px-6">
      <ul className="flex items-center gap-1 -mb-px overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== base && pathname.startsWith(t.href));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
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
  );
}
