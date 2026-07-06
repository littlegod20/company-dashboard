"use client";

import { type DateRange } from "@/hooks/useMetrics";

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  dataRange?: { from: string | null; to: string | null };
  isLoading?: boolean;
}

type PresetKey = "all" | "3m" | "6m" | "custom";

function subtractMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) - n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function detectPreset(value: DateRange, dataRange?: { from: string | null; to: string | null }): PresetKey {
  if (!value.from && !value.to) return "all";
  if (!dataRange?.to) return "custom";
  const max = dataRange.to;
  if (value.from === subtractMonths(max, 2) && value.to === max) return "3m";
  if (value.from === subtractMonths(max, 5) && value.to === max) return "6m";
  return "custom";
}

export default function DateRangeFilter({ value, onChange, dataRange, isLoading }: Props) {
  const minMonth = dataRange?.from ?? undefined;
  const maxMonth = dataRange?.to ?? undefined;

  const activePreset = detectPreset(value, dataRange);

  function applyPreset(key: PresetKey) {
    if (!maxMonth) return;
    if (key === "all") {
      onChange({});
    } else if (key === "3m") {
      onChange({ from: subtractMonths(maxMonth, 2), to: maxMonth });
    } else if (key === "6m") {
      onChange({ from: subtractMonths(maxMonth, 5), to: maxMonth });
    }
    // "custom" isn't a button — it's inferred when the user edits the inputs.
  }

  function handleFrom(e: React.ChangeEvent<HTMLInputElement>) {
    const from = e.target.value || undefined;
    // Keep from ≤ to.
    const to = value.to && from && from > value.to ? from : value.to;
    onChange({ from, to });
  }

  function handleTo(e: React.ChangeEvent<HTMLInputElement>) {
    const to = e.target.value || undefined;
    const from = value.from && to && to < value.from ? to : value.from;
    onChange({ from, to });
  }

  const presets: { key: PresetKey; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "3m", label: "Last 3M" },
    { key: "6m", label: "Last 6M" },
  ];

  const activeLabel =
    !value.from && !value.to
      ? `All time${dataRange?.from ? ` (${dataRange.from} – ${dataRange.to})` : ""}`
      : `${value.from ?? minMonth ?? "…"} – ${value.to ?? maxMonth ?? "…"}`;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 transition-opacity ${
        isLoading ? "opacity-60 pointer-events-none" : ""
      }`}
      aria-label="Date range filter"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
          Date range
        </p>
        <p className="text-sm font-medium text-slate-800 truncate">{activeLabel}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            disabled={!maxMonth && key !== "all"}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activePreset === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hidden sm:block w-px h-8 bg-slate-200" />

      <div className="flex items-center gap-2 text-sm">
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            From
          </label>
          <input
            type="month"
            value={value.from ?? ""}
            min={minMonth}
            max={value.to ?? maxMonth}
            onChange={handleFrom}
            className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-40"
            disabled={!minMonth}
          />
        </div>
        <span className="text-slate-400 mt-4">→</span>
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            To
          </label>
          <input
            type="month"
            value={value.to ?? ""}
            min={value.from ?? minMonth}
            max={maxMonth}
            onChange={handleTo}
            className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-40"
            disabled={!maxMonth}
          />
        </div>

        {(value.from || value.to) && (
          <button
            onClick={() => onChange({})}
            className="mt-4 text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none"
            aria-label="Clear date filter"
            title="Clear filter"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
