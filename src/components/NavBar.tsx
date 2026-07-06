"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/upload", label: "Upload Data" },
  { href: "/dashboard/sales", label: "Sales View" },
  { href: "/dashboard/finance", label: "Finance View" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <span className="font-semibold text-sm tracking-wide text-slate-200 uppercase">
          Company Dashboard
        </span>
        <nav className="flex gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
