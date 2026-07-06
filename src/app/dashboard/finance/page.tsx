"use client";

import { useState } from "react";
import { useMetrics, type DateRange } from "@/hooks/useMetrics";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton, ErrorState } from "@/components/PageLoader";
import DateRangeFilter from "@/components/DateRangeFilter";
import FinanceDashboardClient from "./FinanceDashboardClient";

export default function FinanceDashboardPage() {
  const [filter, setFilter] = useState<DateRange>({});
  const { data, isPending, isError, error, isFetching, refetch } = useMetrics(filter);

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data.hasData || !data.metrics) return <EmptyState />;

  return (
    <div className="space-y-6">
      <DateRangeFilter
        value={filter}
        onChange={setFilter}
        dataRange={data.dataRange}
        isLoading={isFetching && !isPending}
      />
      <FinanceDashboardClient metrics={data.metrics} />
    </div>
  );
}
