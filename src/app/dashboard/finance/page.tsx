"use client";

import { useMetrics } from "@/hooks/useMetrics";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton, ErrorState } from "@/components/PageLoader";
import FinanceDashboardClient from "./FinanceDashboardClient";

export default function FinanceDashboardPage() {
  const { data, isPending, isError, error, refetch } = useMetrics();

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data.hasData || !data.metrics) return <EmptyState />;

  return <FinanceDashboardClient metrics={data.metrics} />;
}
