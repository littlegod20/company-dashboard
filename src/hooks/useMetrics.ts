"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Metrics } from "@/lib/pipeline/metrics";
import { metricsKeys } from "./keys";

export interface DateRange {
  from?: string;
  to?: string;
}

export interface MetricsResponse {
  hasData: boolean;
  metrics?: Metrics;
  // Full available range in the DB, independent of the active filter.
  dataRange?: { from: string | null; to: string | null };
  activeFilter?: { from?: string; to?: string };
}

async function fetchMetrics(filter?: DateRange): Promise<MetricsResponse> {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);

  const url = params.size ? `/api/metrics?${params}` : "/api/metrics";
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to load metrics (${res.status})`);
  }
  return res.json();
}

// Each {from, to} combination is cached separately, so switching presets is
// instant once fetched.
export function useMetrics(filter?: DateRange) {
  return useQuery({
    queryKey: metricsKeys.filtered(filter?.from, filter?.to),
    queryFn: () => fetchMetrics(filter),
    // Keep the previous range on screen while a new one loads, so the filter
    // stays mounted (isPending only fires on the very first load).
    placeholderData: keepPreviousData,
  });
}
