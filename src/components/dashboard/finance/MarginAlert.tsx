import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt } from "@/lib/helpers";

export default function MarginAlert({
  worst,
}: {
  worst: Metrics["marginByRegion"][number];
}) {
  return (
    <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      ⚠ <strong>{worst.region}</strong> is operating at a loss ({fmt(worst.margin)}).
      Department costs exceed revenue for this region.
    </div>
  );
}
