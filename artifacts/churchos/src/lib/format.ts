export function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export const CHURCH = "Demo Church Lagos";
