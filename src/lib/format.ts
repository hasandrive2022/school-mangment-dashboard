// Shared Bengali formatting helpers for the admin app.
// Backend money values are integer PAISA (100 paisa = ৳1). Users must only
// ever see taka — convert at display/input time with these helpers.

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Any number/string → Bengali digits (no grouping). */
export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Number with thousands separators, in Bengali digits. */
export function bnNum(value: number): string {
  return bn(value.toLocaleString("en-IN"));
}

/** Paisa (backend) → taka number for display math. */
export function paisaToTaka(paisa: number): number {
  return Math.round((paisa / 100) * 100) / 100;
}

/** Taka (user input) → paisa integer for the backend. */
export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
}

/** "৳ ১,২০০" style label from a paisa amount. */
export function takaLabel(paisa: number): string {
  const taka = paisaToTaka(paisa);
  return `৳ ${bnNum(taka)}`;
}

/** ISO/date string → dd/mm/yyyy with Bengali digits. */
export function bnDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Plain YYYY-MM-DD strings: format without timezone shifting.
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return bn(`${match[3]}/${match[2]}/${match[1]}`);
    return bn(value);
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return bn(`${dd}/${mm}/${date.getFullYear()}`);
}

/** YYYY-MM-DD for <input type="date"> defaults (current month bounds). */
export function monthRange(now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(from), to: fmt(to) };
}

export const WEEKDAYS_BN = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];
