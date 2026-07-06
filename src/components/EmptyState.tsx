import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📂</div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">No data uploaded yet</h2>
      <p className="text-slate-600 max-w-sm mb-6">
        Upload your Sales, HR, and Finance Excel files to populate this dashboard.
      </p>
      <Link
        href="/upload"
        className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        Go to Upload
      </Link>
    </div>
  );
}
