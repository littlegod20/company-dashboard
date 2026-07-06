"use client";

import { useState } from "react";
import { useMetrics, type DateRange } from "@/hooks/useMetrics";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton, ErrorState } from "@/components/PageLoader";
import DateRangeFilter from "@/components/DateRangeFilter";
import SalesDashboardClient from "./SalesDashboardClient";

export default function SalesDashboardPage() {
  const [filter, setFilter] = useState<DateRange>({});
  const { data, isPending, isError, error, isFetching, refetch } = useMetrics(filter);

  // Full-page skeleton only on the very first load (no data or range yet)
  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data.hasData || !data.metrics) return <EmptyState />;

  return (
    <div className="space-y-6">
      <DateRangeFilter
        value={filter}
        onChange={setFilter}
        dataRange={data.dataRange}
        isLoading={isFetching}
      />
      {/* Filter stays mounted; only the dashboard body reloads on range changes */}
      {isFetching ? <DashboardSkeleton /> : <SalesDashboardClient metrics={data.metrics} />}
    </div>
  );
}
