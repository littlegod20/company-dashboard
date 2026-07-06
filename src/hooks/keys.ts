/** Centralized TanStack Query keys */
export const metricsKeys = {
  /** Base key — invalidating this busts all metrics queries (e.g. after upload) */
  all: ["metrics"] as const,
  /** Filter-specific key — each unique from/to combo gets its own cache entry */
  filtered: (from?: string, to?: string) =>
    ["metrics", { from: from ?? null, to: to ?? null }] as const,
};
