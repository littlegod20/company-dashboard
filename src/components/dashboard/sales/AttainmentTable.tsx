import type { Metrics } from "@/lib/pipeline/metrics";
import { fmt, pct } from "@/lib/helpers";

export default function AttainmentTable({ data }: { data: Metrics["targetVsActual"] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-600">
            <th className="pb-2 font-medium">Region</th>
            <th className="pb-2 font-medium text-right">Actual</th>
            <th className="pb-2 font-medium text-right">Target</th>
            <th className="pb-2 font-medium text-right">Attainment</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.region} className="border-b border-slate-50">
              <td className="py-1.5 font-medium">{r.region}</td>
              <td className="py-1.5 text-right">{fmt(r.actual)}</td>
              <td className="py-1.5 text-right text-slate-600">{fmt(r.target)}</td>
              <td
                className={`py-1.5 text-right font-semibold ${
                  r.attainmentPct >= 100 ? "text-green-700" : r.attainmentPct >= 75 ? "text-amber-700" : "text-red-700"
                }`}
              >
                {pct(r.attainmentPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
