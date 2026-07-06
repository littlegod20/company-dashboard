"use client";

import { useState } from "react";
import { useMetrics, type DateRange } from "@/hooks/useMetrics";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton, ErrorState } from "@/components/PageLoader";
import DateRangeFilter from "@/components/DateRangeFilter";
import ExportMenu from "@/components/ExportMenu";
import SalesDashboardClient from "./SalesDashboardClient";

function filterLabel(filter: DateRange, dataRange?: { from: string | null; to: string | null }): string {
  if (!filter.from && !filter.to) {
    return dataRange?.from
      ? `All time (${dataRange.from} – ${dataRange.to})`
      : "All time";
  }
  return `${filter.from ?? "…"} – ${filter.to ?? "…"}`;
}

export default function SalesDashboardPage() {
  const [filter, setFilter] = useState<DateRange>({});
  const { data, isPending, isError, error, isFetching, refetch } = useMetrics(filter);

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data.hasData || !data.metrics) return <EmptyState />;

  const label = filterLabel(filter, data.dataRange);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3" data-print-hide>
        <div className="flex-1">
          <DateRangeFilter
            value={filter}
            onChange={setFilter}
            dataRange={data.dataRange}
            isLoading={isFetching}
          />
        </div>
        <div className="pt-0.5">
          <ExportMenu metrics={data.metrics} filterLabel={label} view="sales" />
        </div>
      </div>

      {isFetching ? <DashboardSkeleton /> : <SalesDashboardClient metrics={data.metrics} />}
    </div>
  );
}
