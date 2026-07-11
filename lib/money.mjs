// Human money formatting — ONE source of truth (kills the "$0.0005k" / "$0.5k-for-$500" bugs). Takes RAW
// dollars and renders the way a person reads them: $500, $6.5k, $90k, $1.2M. Never sub-$1 "k" values.
export function money(n) {
  if (n == null || n === "" || isNaN(n)) return "";
  n = Number(n);
  const s = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n < 1000) return `${s}$${Math.round(n)}`;                       // $500, $950
  if (n < 1e6) { const k = n / 1000; return `${s}$${Number.isInteger(k) ? k : +k.toFixed(1)}k`; }  // $6.5k, $90k
  const m = n / 1e6; return `${s}$${Number.isInteger(m) ? m : +m.toFixed(1)}M`;                     // $1.2M
}
// A price band from two raw-dollar endpoints: "$500–$950", "$5k–$9k", "$90k–$120k".
export const range = (lo, hi) => (lo == null && hi == null ? "" : `${money(lo)}–${money(hi)}`);
