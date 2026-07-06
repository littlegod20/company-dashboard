"use client";

/**
 * ExportMenu
 *
 * A dropdown button that offers two export formats:
 *   1. Excel (.xlsx)  — multi-sheet workbook, instant client-side download
 *   2. Print / PDF   — injects a print header then calls window.print()
 *                      so the user can "Save as PDF" from the browser dialog
 *
 * Props:
 *   metrics      — current metrics snapshot (reflects active date filter)
 *   filterLabel  — human-readable filter string, e.g. "2026-03 – 2026-05"
 *   view         — "sales" | "finance" (used in filename + print header)
 */

import { useState, useRef, useEffect } from "react";
import type { Metrics } from "@/lib/pipeline/metrics";
import { exportToExcel } from "@/lib/export/toExcel";

interface Props {
  metrics: Metrics;
  filterLabel: string;
  view: "sales" | "finance";
}

export default function ExportMenu({ metrics, filterLabel, view }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleExcel() {
    setOpen(false);
    setExporting(true);
    try {
      exportToExcel({ metrics, filterLabel, view });
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    setOpen(false);

    // Inject a temporary print-only header so the PDF has title + date context
    const header = document.createElement("div");
    header.setAttribute("data-print-header", "true");
    header.style.display = "none"; // shown by @media print CSS
    header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:16pt;">Company Dashboard — ${view === "sales" ? "Sales" : "Finance"} View</strong>
        <span style="font-size:9pt;color:#555;">Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
      </div>
      <div style="font-size:10pt;color:#444;margin-top:2px;">
        Date range: <strong>${filterLabel}</strong>
        &nbsp;·&nbsp; ${metrics.rowCount} transactions
        &nbsp;·&nbsp; Total revenue: <strong>$${metrics.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
      </div>
    `;
    document.body.prepend(header);

    window.print();

    // Remove injected header after the print dialog closes
    header.remove();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={exporting}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200
          bg-white text-sm font-medium text-slate-700 hover:bg-slate-50
          hover:border-slate-300 transition-colors disabled:opacity-50 shadow-sm"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg
          className="w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V3m0 9l-3-3m3 3l3-3"
          />
        </svg>
        {exporting ? "Exporting…" : "Export"}
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-52 rounded-lg border border-slate-200 bg-white shadow-lg z-50 overflow-hidden"
          role="menu"
        >
          {/* Excel option */}
          <button
            role="menuitem"
            onClick={handleExcel}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700
              hover:bg-slate-50 transition-colors text-left"
          >
            <span className="flex-shrink-0 text-green-600">
              {/* spreadsheet icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 18H7v-1.5h1.5V18zm0-3H7v-1.5h1.5V15zm0-3H7v-1.5h1.5V12zm4.5 6h-3v-1.5h3V18zm0-3h-3v-1.5h3V15zm0-3h-3v-1.5h3V12zm3 6h-1.5v-1.5H16V18zm0-3h-1.5v-1.5H16V15zm0-3h-1.5v-1.5H16V12z" />
              </svg>
            </span>
            <div>
              <div className="font-medium">Download Excel</div>
              <div className="text-xs text-slate-500">6-sheet .xlsx workbook</div>
            </div>
          </button>

          <div className="border-t border-slate-100" />

          {/* Print / PDF option */}
          <button
            role="menuitem"
            onClick={handlePrint}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700
              hover:bg-slate-50 transition-colors text-left"
          >
            <span className="flex-shrink-0 text-red-500">
              {/* PDF/print icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 8H5a3 3 0 00-3 3v5h4v3h12v-3h4v-5a3 3 0 00-3-3zm-3 11H8v-5h8v5zm3-7a1 1 0 110-2 1 1 0 010 2zm-1-9H6v4h12V3z" />
              </svg>
            </span>
            <div>
              <div className="font-medium">Print / Save as PDF</div>
              <div className="text-xs text-slate-500">Opens browser print dialog</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
