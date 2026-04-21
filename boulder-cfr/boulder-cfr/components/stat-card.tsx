import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  accent,
  className,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "orange" | "green" | "red" | "neutral";
  className?: string;
  icon?: React.ReactNode;
}) {
  const accentMap = {
    orange: "text-boulder-600",
    green: "text-emerald-600",
    red: "text-red-600",
    neutral: "text-neutral-900",
  };
  return (
    <div
      className={cn(
        "relative rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</div>
        {icon && <div className="text-neutral-300">{icon}</div>}
      </div>
      <div className={cn("mt-3 font-display text-3xl font-bold tabular leading-none", accentMap[accent ?? "neutral"])}>
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-neutral-500 tabular">{sub}</div>}
    </div>
  );
}
