// "NGN5,500" — matches the design exactly (no space, no decimals for whole
// naira amounts). Intl.NumberFormat handles the thousands separator without
// hand-rolling one.
export function formatNaira(amount: number): string {
  return `NGN${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 }).format(amount)}`;
}
