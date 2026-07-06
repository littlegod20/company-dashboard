/** Top progress bar — shown immediately when navigation starts */
export function NavigationBar() {
  return (
    <div
      className="fixed top-0 inset-x-0 z-50 h-1 overflow-hidden bg-slate-200"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="h-full w-2/5 bg-blue-500 animate-loading-bar" />
    </div>
  );
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

/** Error state with optional retry */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="text-5xl">⚠️</div>
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Something went wrong</h2>
        <p className="text-slate-600 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Generic centered spinner for simple pages */
export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

/** Skeleton matching dashboard layout (KPI strip + chart sections) */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <Pulse className="h-8 w-56 mb-2" />
        <Pulse className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-5 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-7 w-28" />
            <Pulse className="h-4 w-24" />
          </div>
        ))}
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <Pulse className="h-6 w-48" />
          <Pulse className="h-4 w-96 max-w-full" />
          <Pulse className="h-52 w-full" />
        </div>
      ))}
    </div>
  );
}
