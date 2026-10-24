"use client";

import { bn, formatTaka } from "@/lib/format";

/**
 * The ONE reusable money receipt (Round 9). Used by the student-profile
 * fee tab (payment history print + "পেমেন্ট নিন" success state) and the
 * collection screen, following the design's receipt layout (screen 20):
 * school header, receipt number/date, student + class + registration,
 * description + amount, amount in words, verify-code note. Printing goes
 * through `printReceiptSheet()`, which marks the body so the print
 * stylesheet in globals.css shows only the `.receipt-sheet` element.
 */

export type ReceiptSchool = {
  nameBn?: string;
  nameEn?: string;
  eiin?: string;
  address?: string;
};

export type ReceiptData = {
  school?: ReceiptSchool | null;
  receiptNumber: string;
  verifyCode?: string | null;
  paidAt?: string | null;
  studentNameBn: string;
  registrationNumber?: string | null;
  classNameBn?: string | null;
  sectionNameBn?: string | null;
  eventNameBn: string;
  /** This payment's amount, integer paisa. */
  amount: number;
  method?: string | null;
  /** Paisa still due on the assignment after this payment, when known. */
  remaining?: number | null;
  receivedBy?: string | null;
};

const BN_BELOW_100 = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
  "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
  "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "ঊনত্রিশ", "ত্রিশ",
  "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ", "চল্লিশ",
  "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ", "পঞ্চাশ",
  "একান্ন", "বাহান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট", "ষাট",
  "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর", "সত্তর",
  "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি", "আশি",
  "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "ঊননব্বই", "নব্বই",
  "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই",
];

function integerWords(n: number): string {
  if (n < 100) return BN_BELOW_100[n] ?? String(n);
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  let rest = n % 10000000;
  if (crore) parts.push(`${integerWords(crore)} কোটি`);
  const lakh = Math.floor(rest / 100000);
  rest %= 100000;
  if (lakh) parts.push(`${BN_BELOW_100[lakh]} লাখ`);
  const thousand = Math.floor(rest / 1000);
  rest %= 1000;
  if (thousand) parts.push(`${BN_BELOW_100[thousand]} হাজার`);
  const hundred = Math.floor(rest / 100);
  const tail = rest % 100;
  if (hundred) parts.push(`${BN_BELOW_100[hundred]} শত`);
  if (tail) parts.push(BN_BELOW_100[tail]);
  return parts.filter(Boolean).join(" ");
}

/** Paisa → Bengali words for the receipt's "কথায়" line, e.g. ৳৮০০ → "আট শত টাকা মাত্র". */
export function takaInWords(paisa: number): string {
  const total = Math.max(0, Math.round(paisa));
  const taka = Math.floor(total / 100);
  const poisha = total % 100;
  let text = `${integerWords(taka)} টাকা`;
  if (poisha) text += ` ও ${integerWords(poisha)} পয়সা`;
  return `${text} মাত্র`;
}

/**
 * Print only the receipt currently on screen: the body gets a marker
 * class, the print stylesheet isolates `.receipt-sheet`, and the marker
 * is removed once the print dialog closes.
 */
export function printReceiptSheet() {
  document.body.classList.add("printing-receipt");
  const clear = () => document.body.classList.remove("printing-receipt");
  window.addEventListener("afterprint", clear, { once: true });
  window.setTimeout(clear, 1500);
  window.print();
}

export function ReceiptView({ data }: { data: ReceiptData }) {
  const school = data.school ?? {};
  const classLine = [data.classNameBn, data.sectionNameBn]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="receipt receipt-sheet">
      <div style={{ textAlign: "center" }}>
        <b style={{ color: "var(--p800)", fontSize: 16 }}>
          {school.nameBn || "বিদ্যালয়"}
        </b>
        {school.nameEn && <div className="small muted">{school.nameEn}</div>}
        {(school.address || school.eiin) && (
          <div className="small muted">
            {school.address ?? ""}
            {school.address && school.eiin ? " · " : ""}
            {school.eiin ? `EIIN: ${bn(school.eiin)}` : ""}
          </div>
        )}
        <div className="small muted" style={{ marginTop: 2 }}>
          টাকা গ্রহণের রশিদ
        </div>
      </div>
      <div className="divider" style={{ margin: "9px 0" }} />
      <div className="rowflex" style={{ justifyContent: "space-between" }}>
        <span>
          রশিদ নং: <b className="num">{bn(data.receiptNumber)}</b>
        </span>
        <span>
          তারিখ:{" "}
          <span className="num">
            {data.paidAt ? bn(String(data.paidAt).slice(0, 10)) : "—"}
          </span>
        </span>
      </div>
      <div className="rowflex" style={{ justifyContent: "space-between" }}>
        <span>
          শিক্ষার্থী: {data.studentNameBn}
          {classLine ? ` · ${classLine}` : ""}
        </span>
        <span className="num">
          রেজি: {bn(data.registrationNumber ?? "—")}
        </span>
      </div>
      <div className="rowflex" style={{ justifyContent: "space-between" }}>
        <span>বিবরণ: {data.eventNameBn}</span>
        <b>{formatTaka(data.amount)}</b>
      </div>
      <div className="rowflex" style={{ justifyContent: "space-between" }}>
        <span>কথায়: {takaInWords(data.amount)}</span>
        <span>মাধ্যম: {data.method ?? "—"}</span>
      </div>
      {data.remaining !== undefined && data.remaining !== null && (
        <div className="rowflex" style={{ justifyContent: "space-between" }}>
          <span>এই পেমেন্টের পর বাকি:</span>
          <b>{formatTaka(data.remaining)}</b>
        </div>
      )}
      {data.verifyCode && (
        <div className="small muted" style={{ marginTop: 8 }}>
          যাচাই কোড: <span className="num">{bn(data.verifyCode)}</span> ·
          ওয়েবসাইটের &quot;রশিদ যাচাই&quot; পেজে এই কোড দিয়ে রশিদের সত্যতা
          যাচাই করা যায়।
        </div>
      )}
      {data.receivedBy && (
        <div className="small" style={{ marginTop: 10, textAlign: "right" }}>
          গ্রহণকারী: {data.receivedBy}
        </div>
      )}
    </div>
  );
}
