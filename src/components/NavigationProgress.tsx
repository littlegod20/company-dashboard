"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationBar } from "./PageLoader";

/** Shows a top progress bar as soon as an internal link is clicked */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Clear the bar once the new route is active
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  // Start the bar on in-app link clicks (before React Suspense kicks in)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
        return;
      }

      const target = anchor.getAttribute("target");
      if (target === "_blank") return;

      const nextPath = href.split("?")[0].split("#")[0];
      if (nextPath === pathname) return;

      setLoading(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!loading) return null;
  return <NavigationBar />;
}
