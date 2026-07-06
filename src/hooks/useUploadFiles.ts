"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { metricsKeys } from "./keys";

export interface UploadSummary {
  salesRowsRaw: number;
  salesRowsCleaned: number;
  hrRowsRaw: number;
  hrRowsCleaned: number;
  financeRowsRaw: number;
  financeRowsCleaned: number;
  enrichedRows: number;
}

export interface UploadResponse {
  success: boolean;
  summary: UploadSummary;
}

async function uploadFiles(formData: FormData): Promise<UploadResponse> {
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Server error ${res.status}`);
  }
  return data as UploadResponse;
}

export function useUploadFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFiles,
    onSuccess: () => {
      // New data was persisted — refetch dashboards on next visit
      queryClient.invalidateQueries({ queryKey: metricsKeys.all });
    },
  });
}
