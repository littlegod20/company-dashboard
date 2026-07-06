"use client";

import { useQuery } from "@tanstack/react-query";
import type { Metrics } from "@/lib/pipeline/metrics";
import { metricsKeys } from "./keys";

export interface MetricsResponse {
  hasData: boolean;
  metrics?: Metrics;
}

async function fetchMetrics(): Promise<MetricsResponse> {
  const res = await fetch("/api/metrics");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to load metrics (${res.status})`);
  }
  return res.json();
}

export function useMetrics() {
  return useQuery({
    queryKey: metricsKeys.all,
    queryFn: fetchMetrics,
  });
}
