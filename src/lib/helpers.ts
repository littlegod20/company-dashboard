/**
 * Shared presentation helpers used across dashboard views.
 * Keep these pure and formatting-only — domain/pipeline logic lives in src/lib/pipeline.
 */

/** Format a number as whole-dollar currency, e.g. 1234.5 -> "$1,235" */
export function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Format a number as a one-decimal percentage, e.g. 92.34 -> "92.3%" */
export function pct(n: number): string {
  return n.toFixed(1) + "%";
}

/** Recharts tooltip formatter for dollar values labelled "Revenue" */
export const dollarTip = (value: number): [string, string] => [fmt(value), "Revenue"];
