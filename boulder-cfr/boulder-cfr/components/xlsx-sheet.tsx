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
  /** Column indexes that should be center-aligned (overrides numeric right-align) */
  centerCols?: number[];
  /** Explicit column widths (px or %) — length must match column count */
  colWidths?: string[];
  /** Top offset (px) for sticky header row, accounting for fixed navbars above the table */
  stickyOffset?: number;
};

function XlsxSheetImpl({ data, title, percentCols = [], rawNumberCols = [], boldRows = [], sectionRows = [], mergeRows = [], rowAccentFn, autoLayout, dateCols = [], centerCols = [], colWidths, stickyOffset = 36 }: Props) {
  if (!data || data.length === 0) return null;
  const colCount = Math.max(...data.map((r) => r.length));

  // Local widths override from drag-resize
  const [widthOverrides, setWidthOverrides] = React.useState<Record<number, number>>({});
  const tableRef = React.useRef<HTMLTableElement>(null);
  const dragRef = React.useRef<{ colIdx: number; startX: number; startWidth: number } | null>(null);

  React.useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { colIdx, startX, startWidth } = dragRef.current;
      const newWidth = Math.max(30, startWidth + (e.clientX - startX));
      setWidthOverrides((prev) => ({ ...prev, [colIdx]: newWidth }));
    }
    function onUp() { dragRef.current = null; document.body.style.cursor = ""; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  function startResize(colIdx: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cols = tableRef.current?.querySelectorAll("colgroup col");
    const col = cols?.[colIdx] as HTMLTableColElement | undefined;
    const startWidth = col ? col.getBoundingClientRect().width : 100;
    dragRef.current = { colIdx, startX: e.clientX, startWidth };
    document.body.style.cursor = "col-resize";
  }

  // Find the single header row to stick: the last boldRow among the initial bold/section streak
  let stickyRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (boldRows.includes(i)) stickyRow = i;
    else if (sectionRows.includes(i)) continue;
    else break;
  }

  // Detect which columns are numeric based on data rows, so header cells can right-align over number columns
  const numericCols = new Set<number>();
  for (let c = 0; c < colCount; c++) {
    if (rawNumberCols.includes(c)) continue;
    for (let r = 0; r < data.length; r++) {
      if (boldRows.includes(r) || sectionRows.includes(r) || mergeRows.includes(r)) continue;
      const v = data[r]?.[c];
      if (typeof v === "number" && !(dateCols.includes(c) && isExcelDate(v))) {
        numericCols.add(c);
        break;
      }
    }
  }

  // Separate header rows (only contiguous bold/group-header rows at top) from body rows
  // Section rows (like "1. GENERAL CONDITIONS") belong in body, not sticky header
  let firstBodyIdx = 0;
  for (let i = 0; i < data.length; i++) {
    const isB = boldRows.includes(i);
    const isS = sectionRows.includes(i);
    const isGroupHdr = isS && mergeRows.includes(i) && i === 0;
    // Only pure header rows (bold non-section, or first group header) count
    if (isB || isGroupHdr) {
      firstBodyIdx = i + 1;
    } else {
      break;
    }
  }

  const renderRow = (row: typeof data[number], rIdx: number) => {
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
            return renderRowCells(rIdx, row, cells, accent, isBold, isSection, shouldMerge, isHeader, isGroupHeader, isSticky);
  };

  // Extracted row renderer to keep JSX shared between header+body tables
  function renderRowCells(
    rIdx: number,
    row: typeof data[number],
    cells: { cIdx: number; span: number; v: Cell }[],
    accent: "green" | "red" | "yellow" | null,
    isBold: boolean,
    isSection: boolean,
    shouldMerge: boolean,
    isHeader: boolean,
    isGroupHeader: boolean,
    isSticky: boolean,
  ) {
    return (
              <tr
                key={rIdx}
                className={cn(
                  "transition-colors",
                  isGroupHeader && "bg-neutral-50",
                  isHeader && !isGroupHeader && "bg-neutral-100 border-b-2 border-neutral-300",
                  isSection && !isHeader && !isGroupHeader && "bg-boulder-600",
                  isBold && !isSection && !isHeader && "bg-neutral-50/70",
                  !isBold && !isSection && "hover:bg-boulder-50/40",
                )}
              >
                {cells.map(({ cIdx, span, v }, cellIdx) => renderCell(rIdx, row, cIdx, span, v, cellIdx, accent, isBold, isSection, shouldMerge, isHeader, isGroupHeader, isSticky))}
              </tr>
    );
  }

  function renderCell(
    _rIdx: number,
    _row: typeof data[number],
    cIdx: number,
    span: number,
    v: Cell,
    cellIdx: number,
    accent: "green" | "red" | "yellow" | null,
    isBold: boolean,
    isSection: boolean,
    shouldMerge: boolean,
    isHeader: boolean,
    isGroupHeader: boolean,
    isSticky: boolean,
  ) {
                  const isDate = dateCols.includes(cIdx) && isNumber(v) && isExcelDate(v as number);
                  const numeric = isNumber(v) && !rawNumberCols.includes(cIdx) && !isDate;
                  const pct = percentCols.includes(cIdx);
                  const rawDisplay = isEmpty(v)
                    ? ""
                    : isDate
                    ? excelDateToString(v as number)
                    : numeric
                    ? formatCellNumber(v as number, pct)
                    : String(v);
                  const hasLineBreak = typeof rawDisplay === "string" && rawDisplay.includes("\n");
                  const display = hasLineBreak
                    ? rawDisplay.split("\n").map((line, i, arr) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </React.Fragment>
                      ))
                    : rawDisplay;
                  const isNeg = numeric && (v as number) < 0;
                  const statusTag = typeof v === "string" && /^(\[(To Be Paid|To Be Confirmed|Confirm|TBD)\]|No)$/i.test(v.trim()) ? v.toLowerCase().trim() : null;
                  const statusColor = statusTag
                    ? statusTag === "no" ? "text-red-500 font-bold"
                    : statusTag.includes("tbd") ? "text-yellow-500 font-bold"
                    : statusTag.includes("to be confirmed") ? "text-red-500 font-bold"
                    : statusTag.includes("confirm") ? "text-emerald-600 font-semibold"
                    : "text-red-600 font-semibold"
                    : null;
                  const titleAttr = !isHeader && !isGroupHeader && !isEmpty(v) && !numeric ? String(v) : undefined;
                  return (
                    <td
                      key={cIdx}
                      colSpan={span > 1 ? span : undefined}
                      title={titleAttr}
                      className={cn(
                        "border-b border-neutral-100 px-2 py-0.5 align-middle text-[9px] leading-tight overflow-hidden",
                        hasLineBreak ? "whitespace-normal" : "whitespace-nowrap",
                        isSection && !isGroupHeader && shouldMerge ? "!text-left pl-5" : centerCols.includes(cIdx) ? "text-center tabular-nums" : numeric ? "text-center tabular-nums" : shouldMerge && span > 1 ? "text-center" : !isHeader && !isGroupHeader && numericCols.has(cIdx) && (v === "—" || v === "-") ? "text-center" : "text-left",
                        isHeader && "font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-600 px-2 py-2 h-12 align-middle bg-neutral-100 border-b-2 border-neutral-300 shadow-[0_1px_0_0_#d1d5db] leading-[1.2] !text-center !whitespace-nowrap",
                        isGroupHeader && "font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500 px-2 py-1 text-center border-r border-neutral-200 last:border-r-0 bg-neutral-50 whitespace-nowrap",
                        isNeg && "text-red-600 font-medium",
                        isBold && !isHeader && "font-semibold text-neutral-900",
                        isSection && !isGroupHeader && "font-bold text-white bg-boulder-600 uppercase tracking-wider",
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
                      {isHeader && (
                        <span
                          onMouseDown={(e) => startResize(cIdx, e)}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-boulder-400/40"
                          style={{ userSelect: "none" }}
                        />
                      )}
                    </td>
                  );
  }

  const colGroupEl = colWidths && (
    <colgroup>
      {colWidths.map((w, i) => (
        <col key={i} style={{ width: widthOverrides[i] ? `${widthOverrides[i]}px` : w }} />
      ))}
    </colgroup>
  );

  const headerRows = data.slice(0, firstBodyIdx);
  const bodyRows = data.slice(firstBodyIdx);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      {title && (
        <div className="px-4 py-2.5 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white rounded-t-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-700">{title}</div>
        </div>
      )}
      {/* Header table — sticky at top */}
      {headerRows.length > 0 && (
        <div className="sticky z-30 bg-white" style={{ top: stickyOffset }}>
          <table
            style={{ fontFamily: '"Trebuchet MS", "Lucida Sans", Tahoma, sans-serif' }}
            className={cn("w-full border-collapse text-[9px] tabular", autoLayout && !colWidths ? "table-auto" : "table-fixed")}
          >
            {colGroupEl}
            <thead>
              {headerRows.map((row, rIdx) => renderRow(row, rIdx))}
            </thead>
          </table>
        </div>
      )}
      {/* Body table */}
      <table
        ref={tableRef}
        style={{ fontFamily: '"Trebuchet MS", "Lucida Sans", Tahoma, sans-serif' }}
        className={cn("w-full border-collapse text-[9px] tabular", autoLayout && !colWidths ? "table-auto" : "table-fixed")}
      >
        {colGroupEl}
        <tbody>
          {bodyRows.map((row, i) => renderRow(row, i + firstBodyIdx))}
        </tbody>
      </table>
    </div>
  );
}

export const XlsxSheet = React.memo(XlsxSheetImpl) as typeof XlsxSheetImpl;
