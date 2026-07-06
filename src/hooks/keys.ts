export const metricsKeys = {
  // Invalidating this busts every metrics query (e.g. after a new upload).
  all: ["metrics"] as const,
  filtered: (from?: string, to?: string) =>
    ["metrics", { from: from ?? null, to: to ?? null }] as const,
};
