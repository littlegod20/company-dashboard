"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Metrics } from "@/lib/pipeline/metrics";
import { metricsKeys } from "./keys";

export interface DateRange {
  from?: string; // "YYYY-MM"
  to?: string;   // "YYYY-MM"
}

export interface MetricsResponse {
  hasData: boolean;
  metrics?: Metrics;
  /** Full available range in the DB (ignores active filter) */
  dataRange?: { from: string | null; to: string | null };
  /** The filter that was applied server-side */
  activeFilter?: { from?: string; to?: string };
}

async function fetchMetrics(filter?: DateRange): Promise<MetricsResponse> {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to)   params.set("to",   filter.to);

  const url = params.size ? `/api/metrics?${params}` : "/api/metrics";
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to load metrics (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch dashboard metrics, optionally filtered to a date range.
 *
 * Each unique {from, to} combination is cached separately so switching
 * presets is instant once fetched. Invalidating metricsKeys.all (e.g. after
 * a new upload) busts every cached variant.
 */
export function useMetrics(filter?: DateRange) {
  return useQuery({
    queryKey: metricsKeys.filtered(filter?.from, filter?.to),
    queryFn:  () => fetchMetrics(filter),
    // Keep the previous range's data on screen while a new range loads, so the
    // filter control stays mounted (isPending only fires on the very first load).
    placeholderData: keepPreviousData,
  });
}
