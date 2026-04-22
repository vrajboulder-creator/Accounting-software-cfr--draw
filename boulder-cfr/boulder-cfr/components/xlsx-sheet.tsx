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

function isExcelDate(n: number): boolean {
  // Excel serial dates for years 2000–2100 fall in range ~36526–73050
  return Number.isInteger(n) && n >= 36526 && n <= 73050;
}

function excelDateToString(serial: number): string {
  // Excel epoch is Jan 1 1900, but has a leap year bug so subtract 1
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  /** Returns "green" | "red" | "yellow" | null for a left-edge accent bar per row */
  rowAccentFn?: (rIdx: number, row: Row) => "green" | "red" | "yellow" | null;
  /** Use auto table layout instead of fixed (for wide sheets with many cols) */
  autoLayout?: boolean;
  /** Column indexes that contain Excel serial dates and should be formatted as dates */
  dateCols?: number[];
  /** Explicit column widths (px or %) — length must match column count */
  colWidths?: string[];
  /** Top offset (px) for sticky header row, accounting for fixed navbars above the table */
  stickyOffset?: number;
};

function XlsxSheetImpl({ data, title, percentCols = [], rawNumberCols = [], boldRows = [], sectionRows = [], mergeRows = [], rowAccentFn, autoLayout, dateCols = [], colWidths, stickyOffset = 40 }: Props) {
  if (!data || data.length === 0) return null;
  const colCount = Math.max(...data.map((r) => r.length));

  // Find the single header row to stick: the last boldRow among the initial bold/section streak
  let stickyRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (boldRows.includes(i)) stickyRow = i;
    else if (sectionRows.includes(i)) continue;
    else break;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      {title && (
        <div className="px-4 py-2.5 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white rounded-t-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-700">{title}</div>
        </div>
      )}
      <table className={cn("w-full border-collapse text-[10.5px] tabular font-sans", autoLayout && !colWidths ? "table-auto" : "table-fixed")}>
        {colWidths && (
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
        )}
        <tbody>
          {data.map((row, rIdx) => {
            const isBold = boldRows.includes(rIdx);
            const isSection = sectionRows.includes(rIdx);
            const shouldMerge = mergeRows.includes(rIdx);
            const isHeader = isBold && !isSection;
            const isGroupHeader = isSection && shouldMerge && rIdx === 0;
            const isSticky = rIdx === stickyRow;

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
              <tr
                key={rIdx}
                className={cn(
                  "transition-colors",
                  isGroupHeader && "bg-neutral-50",
                  isHeader && !isGroupHeader && "bg-neutral-100 border-b-2 border-neutral-300",
                  isSection && !isHeader && !isGroupHeader && "bg-gradient-to-r from-boulder-50/60 to-transparent",
                  isBold && !isSection && !isHeader && "bg-neutral-50/70",
                  !isBold && !isSection && "hover:bg-boulder-50/40",
                )}
              >
                {cells.map(({ cIdx, span, v }, cellIdx) => {
                  const isDate = dateCols.includes(cIdx) && isNumber(v) && isExcelDate(v as number);
                  const numeric = isNumber(v) && !rawNumberCols.includes(cIdx) && !isDate;
                  const pct = percentCols.includes(cIdx);
                  const display = isEmpty(v)
                    ? ""
                    : isDate
                    ? excelDateToString(v as number)
                    : numeric
                    ? formatCellNumber(v as number, pct)
                    : String(v);
                  const isNeg = numeric && (v as number) < 0;
                  const statusTag = typeof v === "string" && /^\[(To Be Paid|To Be Confirmed|Confirm)\]$/i.test(v) ? v.toLowerCase() : null;
                  const statusColor = statusTag
                    ? statusTag.includes("to be confirmed") ? "text-amber-600 font-semibold"
                    : statusTag.includes("confirm") ? "text-emerald-600 font-semibold"
                    : "text-red-600 font-semibold"
                    : null;
                  return (
                    <td
                      key={cIdx}
                      colSpan={span > 1 ? span : undefined}
                      className={cn(
                        "border-b border-neutral-100 px-2 py-1.5 align-middle text-[10.5px] leading-tight overflow-hidden",
                        numeric ? "text-right tabular-nums" : shouldMerge && span > 1 ? "text-center" : "text-left",
                        isHeader && "text-[9.5px] font-bold uppercase tracking-wider text-neutral-600 py-2 bg-neutral-100 border-b-2 border-neutral-300 shadow-[0_1px_0_0_#d1d5db]",
                        isGroupHeader && "text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500 py-1.5 border-r border-neutral-200 last:border-r-0 bg-neutral-50",
                        isNeg && "text-red-600 font-medium",
                        isBold && !isHeader && "font-semibold text-neutral-900",
                        isSection && !isGroupHeader && "font-bold text-neutral-900",
                        numeric && !isBold && !isSection && !isNeg && "text-neutral-800",
                        isSticky && "z-20",
                        statusColor,
                      )}
                      style={{
                        ...(cellIdx === 0 && accent ? { boxShadow: `inset 3px 0 0 0 ${accent === "green" ? "#059669" : accent === "yellow" ? "#d97706" : "#dc2626"}` } : {}),
                        ...(isSticky ? { top: stickyOffset, position: "sticky" as const, zIndex: 20, backgroundColor: "#f3f4f6" } : {}),
                      }}
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

export const XlsxSheet = React.memo(XlsxSheetImpl) as typeof XlsxSheetImpl;
