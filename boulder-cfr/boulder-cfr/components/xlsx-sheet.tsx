"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Cell = string | number | boolean | null;
type Row = Cell[];

function formatCellNumber(n: number, isPct = false): string {
  if (isPct) return `${(n * 100).toFixed(1)}%`;
  if (Math.abs(n) < 0.005) return "-";
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  return n < 0 ? `(${formatted})` : formatted;
}

function isNumber(v: Cell): v is number {
  return typeof v === "number";
}

function isEmpty(v: Cell): boolean {
  return v === null || v === undefined || v === "" || v === " ";
}

type Props = {
  data: Row[];
  title?: string;
  /** Column indexes that should render as percentages */
  percentCols?: number[];
  /** Column indexes that should NOT be number-formatted even if numeric (e.g. id/row#) */
  rawNumberCols?: number[];
  /** Row indexes that are bold/totals/header rows */
  boldRows?: number[];
  /** Row indexes that are subsection headers (bold + bg) */
  sectionRows?: number[];
  /** Row indexes where consecutive empty cells after a label should be merged into that label cell */
  mergeRows?: number[];
  /** Returns "green" | "red" | null for a left-edge accent bar per row */
  rowAccentFn?: (rIdx: number, row: Row) => "green" | "red" | null;
};

export function XlsxSheet({ data, title, percentCols = [], rawNumberCols = [], boldRows = [], sectionRows = [], mergeRows = [], rowAccentFn }: Props) {
  if (!data || data.length === 0) return null;
  const colCount = Math.max(...data.map((r) => r.length));

  return (
    <div className="rounded-lg border border-neutral-300 bg-white overflow-hidden">
      {title && (
        <div className="px-3 py-1.5 border-b border-neutral-300 bg-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-700">{title}</div>
      )}
      <table className="w-full border-collapse text-[10px] tabular font-sans table-fixed">
        <tbody>
          {data.map((row, rIdx) => {
            const isBold = boldRows.includes(rIdx);
            const isSection = sectionRows.includes(rIdx);
            const shouldMerge = mergeRows.includes(rIdx);

            // Build merged cell layout for group-header rows:
            // each non-empty cell spans forward over consecutive empty cells.
            const cells: { cIdx: number; span: number; v: Cell }[] = [];
            if (shouldMerge) {
              let c = 0;
              while (c < colCount) {
                const v = row[c];
                if (isEmpty(v)) {
                  cells.push({ cIdx: c, span: 1, v: "" });
                  c++;
                } else {
                  let span = 1;
                  while (c + span < colCount && isEmpty(row[c + span])) span++;
                  cells.push({ cIdx: c, span, v });
                  c += span;
                }
              }
            } else {
              for (let c = 0; c < colCount; c++) cells.push({ cIdx: c, span: 1, v: row[c] });
            }

            const accent = rowAccentFn?.(rIdx, row) ?? null;

            return (
              <tr key={rIdx} className={cn(isSection && "bg-neutral-100", isBold && !isSection && "bg-neutral-50 font-bold")}>
                {cells.map(({ cIdx, span, v }, cellIdx) => {
                  const numeric = isNumber(v) && !rawNumberCols.includes(cIdx);
                  const pct = percentCols.includes(cIdx);
                  const display = isEmpty(v)
                    ? ""
                    : numeric
                    ? formatCellNumber(v as number, pct)
                    : String(v);
                  const isNeg = numeric && (v as number) < 0;
                  return (
                    <td
                      key={cIdx}
                      colSpan={span > 1 ? span : undefined}
                      className={cn(
                        "border border-neutral-300 px-1.5 py-0.5 align-top overflow-hidden text-ellipsis",
                        numeric ? "text-right" : shouldMerge && span > 1 ? "text-center" : "text-left",
                        isNeg && "text-red-700",
                        (isBold || isSection) && "font-bold",
                        isSection && "text-neutral-900",
                      )}
                      style={cellIdx === 0 && accent ? { borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: accent === "green" ? "#059669" : "#dc2626" } : undefined}
                      title={display}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
