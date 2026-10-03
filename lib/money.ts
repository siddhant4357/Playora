/** All amounts are stored as integer paise. */

export function formatPaise(paise: number, opts: { free?: string } = {}): string {
  if (paise === 0 && opts.free) return opts.free;
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: whole ? 0 : 2,
    minimumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
}

export function rupees(n: number): number {
  return Math.round(n * 100);
}
