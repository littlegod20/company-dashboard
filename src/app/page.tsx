import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Company Dashboard</h1>
        <p className="text-gray-500">Sales &amp; Operations Analytics</p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard/sales"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Sales View
        </Link>
        <Link
          href="/dashboard/finance"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          Finance View
        </Link>
      </div>

      <p className="text-sm text-gray-400">
        Upload Excel files to populate the dashboards.
      </p>
    </main>
  );
}
