// Shared Bengali formatting helpers for the admin app — the ONE canonical
// money-display path (Round 7, Fix 2).
//
// Backend money values are integer PAISA (100 paisa = ৳1). Users must only
// ever see taka: every money value rendered in the UI goes through
// `formatTaka` below, and any user-entered taka amount is converted back to
// paisa with `takaToPaisa` at submit time. No component may render a raw
// paisa number next to ৳, divide by 100 inline, or call toLocaleString for
// money on its own.
//
// Format contract (identical to the Round-3 `takaLabel` output that the
// live, correct-looking screens produced — do not change casually):
//   formatTaka(0)       === "৳ ০"
//   formatTaka(100)     === "৳ ১"        (100 paisa = ৳1)
//   formatTaka(109000)  === "৳ ১,০৯০"
//   formatTaka(2500000) === "৳ ২৫,০০০"
//   formatTaka(150)     === "৳ ১.৫"      (poisha shown as a taka fraction)
// Rules: "৳ " prefix (sign + one space); Bengali digits; en-IN grouping
// (thousand/lakh style commas); poisha appears only when non-zero, as the
// decimal fraction of the taka value with no trailing-zero padding
// (150 paisa → "১.৫", 105 paisa → "১.০৫", whole taka → no fraction).

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Any number/string → Bengali digits (no grouping). */
export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Number with en-IN thousands separators, in Bengali digits. */
export function bnNum(value: number): string {
  return bn(value.toLocaleString("en-IN"));
}

/** Paisa (backend) → taka number for display math / input prefills. */
export function paisaToTaka(paisa: number): number {
  return Math.round((paisa / 100) * 100) / 100;
}

/** Taka (user input) → paisa integer for the backend. */
export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
}

/**
 * THE canonical money display: paisa (backend) → "৳ ১,০৯০" style label.
 * Every ৳ amount rendered anywhere in the admin app uses this function.
 */
export function formatTaka(paisa: number): string {
  const taka = paisaToTaka(paisa);
  return `৳ ${bnNum(taka)}`;
}

export const takaLabel = formatTaka;

export function bnDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? bn(`${match[3]}/${match[2]}/${match[1]}`) : bn(value);
  }
  return bn(
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
  );
}

export function monthRange(now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(new Date(y, m, 1)), to: format(new Date(y, m + 1, 0)) };
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
