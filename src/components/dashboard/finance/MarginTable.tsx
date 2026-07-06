import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt, pct } from "@/lib/helpers";

/** Per-region revenue, cost, margin, and margin % */
export default function MarginTable({ data }: { data: Metrics["marginByRegion"] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-600">
            <th className="pb-2 font-medium">Region</th>
            <th className="pb-2 font-medium text-right">Revenue</th>
            <th className="pb-2 font-medium text-right">Dept Cost</th>
            <th className="pb-2 font-medium text-right">Margin</th>
            <th className="pb-2 font-medium text-right">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const mp = r.revenue > 0 ? (r.margin / r.revenue) * 100 : 0;
            return (
              <tr key={r.region} className="border-b border-slate-50">
                <td className="py-1.5 font-medium">{r.region}</td>
                <td className="py-1.5 text-right">{fmt(r.revenue)}</td>
                <td className="py-1.5 text-right text-slate-600">{fmt(r.cost)}</td>
                <td className={`py-1.5 text-right font-semibold ${r.margin >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {fmt(r.margin)}
                </td>
                <td className={`py-1.5 text-right ${mp >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {pct(mp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
