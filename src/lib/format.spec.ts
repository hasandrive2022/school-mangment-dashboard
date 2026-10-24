import { describe, expect, it } from "vitest";
import { bnNum, formatTaka, paisaToTaka, takaToPaisa } from "./format";

// Round 7, Fix 2 — the canonical money helper. Expected strings reproduce
// EXACTLY the format the previously-correct screens produced (Round-3
// takaLabel): "৳ " prefix, Bengali digits, en-IN grouping, poisha only as
// a non-zero taka fraction without trailing-zero padding.
describe("formatTaka (paisa → taka label)", () => {
  it("zero paisa renders as ৳ ০", () => {
    expect(formatTaka(0)).toBe("৳ ০");
  });

  it("100 paisa renders as ৳ ১", () => {
    expect(formatTaka(100)).toBe("৳ ১");
  });

  it("109000 paisa renders as ৳ ১,০৯০ (the live ledger balance case)", () => {
    expect(formatTaka(109000)).toBe("৳ ১,০৯০");
  });

  it("2500000 paisa renders as ৳ ২৫,০০০ (the seeded teacher salary case)", () => {
    expect(formatTaka(2500000)).toBe("৳ ২৫,০০০");
  });

  it("groups lakh-style for large amounts (en-IN grouping)", () => {
    expect(formatTaka(12345600)).toBe("৳ ১,২৩,৪৫৬");
  });

  it("poisha case: 150 paisa renders as ৳ ১.৫ (fraction, no trailing zero)", () => {
    expect(formatTaka(150)).toBe("৳ ১.৫");
  });

  it("poisha case: 105 paisa keeps the zero inside the fraction (৳ ১.০৫)", () => {
    expect(formatTaka(105)).toBe("৳ ১.০৫");
  });

  it("poisha case: 109050 paisa renders as ৳ ১,০৯০.৫", () => {
    expect(formatTaka(109050)).toBe("৳ ১,০৯০.৫");
  });

  it("negative paisa (overdrawn ledger balance) keeps its sign", () => {
    expect(formatTaka(-109000)).toBe("৳ -১,০৯০");
  });
});

describe("conversion helpers", () => {
  it("paisaToTaka divides by 100 keeping poisha precision", () => {
    expect(paisaToTaka(109000)).toBe(1090);
    expect(paisaToTaka(150)).toBe(1.5);
    expect(paisaToTaka(0)).toBe(0);
  });

  it("takaToPaisa is the exact inverse for whole taka", () => {
    expect(takaToPaisa(25000)).toBe(2500000);
    expect(takaToPaisa(0)).toBe(0);
  });

  it("bnNum groups and converts digits without a currency sign", () => {
    expect(bnNum(1090)).toBe("১,০৯০");
  });
});
