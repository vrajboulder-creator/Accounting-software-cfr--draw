"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, X } from "lucide-react";

type Opt = string | { value: string; label: string };
function getValue(o: Opt): string { return typeof o === "string" ? o : o.value; }
function getLabel(o: Opt): string { return typeof o === "string" ? o : o.label; }

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
  maxDisplay = 2,
}: {
  label: string;
  options: Opt[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
  maxDisplay?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [open]);

  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
    else onChange([...selected, v]);
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, query]);

  const valueToLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(getValue(o), getLabel(o));
    return m;
  }, [options]);
  const selectedLabels = selected.map((v) => valueToLabel.get(v) ?? v);

  const labelText = selected.length === 0
    ? label
    : selected.length <= maxDisplay
    ? `${label}: ${selectedLabels.join(", ")}`
    : `${label} (${selected.length})`;

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 text-[10px] border border-neutral-300 rounded-md px-1.5 py-1 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-boulder-400 max-w-[180px] truncate",
          selected.length > 0 && "border-boulder-400 bg-boulder-50"
        )}
        type="button"
      >
        <span className="truncate">{labelText}</span>
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-neutral-200 rounded-lg shadow-lg w-56">
          <div className="p-2 border-b border-neutral-100">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-full text-[10px] border border-neutral-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-boulder-400"
            />
          </div>
          <div className="max-h-52 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-1 text-[10px] text-neutral-400">No matches</div>
            ) : filtered.map((o) => {
              const v = getValue(o);
              return (
                <label key={v} className="flex items-center gap-2 px-2 py-1 text-[10px] hover:bg-neutral-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} className="accent-boulder-500" />
                  <span className="truncate">{getLabel(o)}</span>
                </label>
              );
            })}
          </div>
          {(selected.length > 0 || filtered.length > 0) && (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-neutral-100 text-[10px]">
              <button onClick={() => onChange(filtered.map(getValue))} className="text-boulder-600 hover:text-boulder-800 font-semibold">Select all</button>
              {selected.length > 0 && (
                <button onClick={() => onChange([])} className="flex items-center gap-0.5 text-neutral-500 hover:text-neutral-700">
                  <X className="h-2.5 w-2.5" />Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
