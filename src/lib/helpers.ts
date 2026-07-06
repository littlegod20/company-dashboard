export function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function pct(n: number): string {
  return n.toFixed(1) + "%";
}

// Recharts tooltip formatter for revenue values.
export const dollarTip = (value: number): [string, string] => [fmt(value), "Revenue"];
