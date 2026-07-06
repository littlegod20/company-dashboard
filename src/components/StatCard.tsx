/** Simple metric summary card — shows a label + formatted value */
export default function StatCard({
  label,
  value,
  sub,
  accent = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "slate" | "green" | "blue" | "amber" | "red";
}) {
  const accents: Record<string, string> = {
    slate: "border-slate-300 bg-white",
    green: "border-green-400 bg-green-50",
    blue:  "border-blue-400 bg-blue-50",
    amber: "border-amber-400 bg-amber-50",
    red:   "border-red-400 bg-red-50",
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-sm text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}
