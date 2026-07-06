import { pct } from "@/lib/helpers";
import type { BudgetRow } from "./BudgetChart";

export default function BudgetTable({ data }: { data: BudgetRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-600">
            <th className="pb-2 font-medium">Region</th>
            <th className="pb-2 font-medium text-right">Attainment</th>
            <th className="pb-2 font-medium text-right">Cost Ratio</th>
            <th className="pb-2 font-medium text-right">Assessment</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const costRatio = r.actual > 0 ? (r.cost / r.actual) * 100 : 0;
            const onTarget = r.attainmentPct >= 100;
            const efficient = costRatio < 60;
            const tag = onTarget && efficient ? "✓ On track"
              : onTarget && !efficient ? "⚠ High cost"
              : !onTarget && efficient ? "↓ Below target"
              : "✕ Needs attention";
            const tagColor = onTarget && efficient ? "text-green-700"
              : onTarget ? "text-amber-700"
              : efficient ? "text-amber-700"
              : "text-red-700";
            return (
              <tr key={r.region} className="border-b border-slate-50">
                <td className="py-1.5 font-medium">{r.region}</td>
                <td className={`py-1.5 text-right font-semibold ${onTarget ? "text-green-700" : "text-amber-700"}`}>
                  {pct(r.attainmentPct)}
                </td>
                <td className="py-1.5 text-right text-slate-600">{pct(costRatio)}</td>
                <td className={`py-1.5 text-right font-medium ${tagColor}`}>{tag}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
