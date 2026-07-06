/** White card section with a title, optional description, content, and footnote */
export default function DashboardSection({
  title,
  description,
  footnote,
  children,
}: {
  title: string;
  description?: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className={`text-lg font-semibold text-slate-800 ${description ? "mb-1" : "mb-4"}`}>
        {title}
      </h2>
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      {children}
      {footnote && <p className="text-xs text-slate-600 mt-2">{footnote}</p>}
    </section>
  );
}
