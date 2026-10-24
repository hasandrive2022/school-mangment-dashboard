"use client";

import { useAdminSWR } from "@/lib/swr";
import { bn, bnNum, takaLabel, bnDate } from "@/lib/format";

type SalaryRow = {
  id: string;
  salaryMonth: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
  paidAt: string | null;
  method: string | null;
};

const MONTHS_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

function monthLabel(salaryMonth: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(salaryMonth);
  if (!match) return bn(salaryMonth);
  const monthName = MONTHS_BN[Number(match[2]) - 1];
  return monthName ? `${monthName} ${bn(match[1])}` : bn(salaryMonth);
}

export default function MySalaryPage() {
  const { data, isLoading } = useAdminSWR<{ data?: SalaryRow[] }>(
    "/api/backend/teacher/finance/salary",
  );
  const rows = [...(data?.data ?? [])].sort((a, b) =>
    b.salaryMonth.localeCompare(a.salaryMonth),
  );
  const latest = rows[0] ?? null;
  const totalReceived = rows.reduce((sum, row) => sum + (row.net || 0), 0);

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">আমার বেতন</h2>
          <p className="cs">আপনার বেতনের ইতিহাস — শুধু নিজের রেকর্ডই দেখা যাবে।</p>
        </div>
      </div>

      <div className="g3">
        <div className="card stat">
          <div>
            <div className="v num" style={{ fontSize: 23 }}>
              {latest ? takaLabel(latest.net) : "—"}
            </div>
            <div className="l">
              সর্বশেষ নিট বেতন{latest ? ` (${monthLabel(latest.salaryMonth)})` : ""}
            </div>
          </div>
          <div className="ic-wrap">
            <span className="b">৳</span>
          </div>
        </div>
        <div className="card stat">
          <div>
            <div className="v num" style={{ fontSize: 23 }}>
              {bnNum(rows.length)} মাস
            </div>
            <div className="l">মোট পরিশোধিত মাস</div>
          </div>
          <div className="ic-wrap g">
            <span className="b">✓</span>
          </div>
        </div>
        <div className="card stat">
          <div>
            <div className="v num" style={{ fontSize: 23, color: "var(--green)" }}>
              {takaLabel(totalReceived)}
            </div>
            <div className="l">মোট প্রাপ্ত</div>
          </div>
          <div className="ic-wrap g">
            <span className="b">৳</span>
          </div>
        </div>
      </div>

      <div className="card flush">
        <div className="chead" style={{ padding: "16px 18px 0" }}>
          <h3 className="ct">বেতনের ইতিহাস</h3>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>মাস</th>
                <th className="r">মূল বেতন</th>
                <th className="r">ভাতা</th>
                <th className="r">কর্তন</th>
                <th className="r">নিট</th>
                <th>পদ্ধতি</th>
                <th>তারিখ</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="b">{monthLabel(row.salaryMonth)}</td>
                  <td className="r num">{takaLabel(row.basic)}</td>
                  <td className="r num">{takaLabel(row.allowances)}</td>
                  <td className="r num">{takaLabel(row.deductions)}</td>
                  <td className="r num b">{takaLabel(row.net)}</td>
                  <td>{row.method ?? "—"}</td>
                  <td className="num">{bnDate(row.paidAt)}</td>
                  <td>
                    {row.status === "PAID" ? (
                      <span className="chip g">পরিশোধিত</span>
                    ) : row.status === "UNPAID" ? (
                      <span className="chip w">বাকি</span>
                    ) : (
                      <span className="chip gr">{bn(row.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="admin-empty" style={{ padding: "18px" }}>
            {isLoading ? "লোড হচ্ছে…" : "এখনো কোনো বেতন রেকর্ড নেই।"}
          </p>
        )}
      </div>
    </div>
  );
}
