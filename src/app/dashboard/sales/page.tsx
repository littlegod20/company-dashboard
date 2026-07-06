"use client";

import { useMetrics } from "@/hooks/useMetrics";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton, ErrorState } from "@/components/PageLoader";
import SalesDashboardClient from "./SalesDashboardClient";

export default function SalesDashboardPage() {
  const { data, isPending, isError, error, refetch } = useMetrics();

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data.hasData || !data.metrics) return <EmptyState />;

  return <SalesDashboardClient metrics={data.metrics} />;
}
