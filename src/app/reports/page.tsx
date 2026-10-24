"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { bn, bnDate, bnNum, monthRange, takaLabel } from "@/lib/format";

type FeeEvent = {
  id: string;
  nameBn: string;
  type: string;
  dueDate: string;
  isPublished: boolean;
  duesCount: number;
  paidCount: number;
  partialCount: number;
};
type Due = {
  id: string;
  feeEventId: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  studentNameBn?: string;
  registrationNumber?: string;
  classNameBn?: string;
  sectionNameBn?: string;
  eventNameBn?: string;
};
type AttendanceReport = {
  monthlySummary?: { present: number; total: number };
  lowAttendance?: Array<{
    studentId: string;
    studentNameBn?: string | null;
    registrationNumber?: string | null;
    percentage: number;
    present: number;
    total: number;
  }>;
  threshold?: number;
};
type LedgerPayload = {
  totals?: { income: number; expense: number; balance: number };
};

export default function ReportsPage() {
  const [events, setEvents] = useState<FeeEvent[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [ledgerTotals, setLedgerTotals] = useState<{
    income: number;
    expense: number;
    balance: number;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const range = monthRange();
    void (async () => {
      const [eventsRes, duesRes, attendanceRes, ledgerRes] = await Promise.all([
        fetch("/api/backend/finance/fee-events"),
        fetch("/api/backend/finance/dues"),
        fetch(`/api/backend/attendance/report?from=${range.from}&to=${range.to}`),
        fetch(`/api/backend/finance/ledger?from=${range.from}&to=${range.to}`),
      ]);
      const eventsPayload = (await eventsRes.json()) as { data?: FeeEvent[] };
      const duesPayload = (await duesRes.json()) as { data?: Due[] };
      const attendancePayload = (await attendanceRes.json()) as AttendanceReport;
      const ledgerPayload = (await ledgerRes.json()) as LedgerPayload;
      setEvents(eventsPayload.data ?? []);
      setDues(duesPayload.data ?? []);
      setAttendance(attendancePayload);
      setLedgerTotals(ledgerPayload.totals ?? null);
      setLoaded(true);
    })();
  }, []);

  const defaulters = dues
    .filter(
      (row) =>
        (row.status === "DUE" || row.status === "PARTIAL") &&
        row.amount - row.paidAmount > 0,
    )
    .map((row) => ({ ...row, remaining: row.amount - row.paidAmount }))
    .sort((a, b) => b.remaining - a.remaining);

  const monthly = attendance?.monthlySummary;
  const attendancePct =
    monthly && monthly.total
      ? Math.round((monthly.present * 10000) / monthly.total) / 100
      : 0;
  const lowRows = [...(attendance?.lowAttendance ?? [])]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 10);

  const totalDueAmount = defaulters.reduce((sum, row) => sum + row.remaining, 0);

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">রিপোর্টসমূহ</h2>
          <p className="cs">
            ফি সংগ্রহ, বকেয়া, উপস্থিতি ও আয়–ব্যয়ের সারাংশ — সব তথ্য লাইভ হিসাব থেকে।
          </p>
        </div>
        <span className="sp" />
        <Button className="btn gho sm" onClick={() => window.print()}>
          প্রিন্ট করুন
        </Button>
      </div>

      <div className="g2" style={{ alignItems: "start" }}>
        {/* (ক) ফি সংগ্রহ সারাংশ */}
        <div className="card flush">
          <div className="chead" style={{ padding: "16px 18px 0" }}>
            <h3 className="ct">ফি সংগ্রহ সারাংশ</h3>
            <span className="sp" />
            <Link href="/dashboard/finance" className="btn gho sm">
              ফি ব্যবস্থাপনা
            </Link>
          </div>
          <div style={{ padding: "4px 18px 16px" }}>
            {events.map((event) => {
              const total = event.duesCount ?? 0;
              const paid = event.paidCount ?? 0;
              const pct = total ? Math.round((paid * 100) / total) : 0;
              return (
                <div className="listrow" key={event.id}>
                  <div className="grow">
                    <div className="b" style={{ fontSize: 14.5 }}>
                      {event.nameBn}
                    </div>
                    <div className="small muted">
                      {total
                        ? `পরিশোধিত ${bn(paid)} / মোট ${bn(total)} জন`
                        : "এখনো প্রকাশিত হয়নি"}
                    </div>
                    <div className="bar" style={{ marginTop: 6 }}>
                      <i
                        className={pct >= 80 ? "g" : pct >= 40 ? "" : "w"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="num b">{bn(pct)}%</span>
                </div>
              );
            })}
            {loaded && !events.length && (
              <div className="admin-empty">কোনো ফি ইভেন্ট নেই।</div>
            )}
          </div>
        </div>

        {/* (ঘ) আয়–ব্যয় সারাংশ */}
        <div className="card">
          <div className="chead">
            <h3 className="ct">আয়–ব্যয় সারাংশ (এই মাস)</h3>
            <span className="sp" />
            <Link href="/dashboard/ledger" className="btn gho sm">
              খাতা দেখুন
            </Link>
          </div>
          {ledgerTotals ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div className="listrow">
                <div className="grow">মোট আয়</div>
                <b className="num" style={{ color: "var(--green)" }}>
                  {takaLabel(ledgerTotals.income)}
                </b>
              </div>
              <div className="listrow">
                <div className="grow">মোট ব্যয়</div>
                <b className="num" style={{ color: "var(--red)" }}>
                  {takaLabel(ledgerTotals.expense)}
                </b>
              </div>
              <div className="listrow">
                <div className="grow b">ব্যালেন্স</div>
                <b className="num">{takaLabel(ledgerTotals.balance)}</b>
              </div>
            </div>
          ) : (
            <div className="admin-empty">তথ্য লোড হচ্ছে…</div>
          )}
          <div className="chead" style={{ marginTop: 18 }}>
            <h3 className="ct">উপস্থিতি সারাংশ (এই মাস)</h3>
            <span className="sp" />
            <Link href="/dashboard/attendance/reports" className="btn gho sm">
              বিস্তারিত
            </Link>
          </div>
          {monthly ? (
            <>
              <div className="rowflex">
                <span className="chip b">
                  উপস্থিত {bnNum(monthly.present)} / মোট {bnNum(monthly.total)}
                </span>
                <span className="chip g">হার {bn(attendancePct)}%</span>
                {attendance?.threshold != null && (
                  <span className="chip gr">
                    কম উপস্থিতির সীমা {bn(attendance.threshold)}%
                  </span>
                )}
              </div>
              <div className="bar" style={{ marginTop: 10 }}>
                <i className="g" style={{ width: `${attendancePct}%` }} />
              </div>
            </>
          ) : (
            <div className="admin-empty">উপস্থিতির তথ্য পাওয়া যায়নি।</div>
          )}
        </div>
      </div>

      {/* (গ) কম উপস্থিতি */}
      <div className="card flush">
        <div className="chead" style={{ padding: "16px 18px 0" }}>
          <h3 className="ct">কম উপস্থিতির শিক্ষার্থী (এই মাস)</h3>
          <span className="sp" />
          <Link href="/dashboard/attendance/reports" className="btn gho sm">
            উপস্থিতি রিপোর্ট
          </Link>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>শিক্ষার্থী</th>
                <th>রেজি নং</th>
                <th className="c">উপস্থিত / মোট</th>
                <th className="r">উপস্থিতির হার</th>
              </tr>
            </thead>
            <tbody>
              {lowRows.map((row) => (
                <tr key={row.studentId}>
                  <td className="b">{row.studentNameBn ?? "শিক্ষার্থী"}</td>
                  <td className="num">{bn(row.registrationNumber ?? "—")}</td>
                  <td className="c num">
                    {bnNum(row.present)} / {bnNum(row.total)}
                  </td>
                  <td className="r">
                    <span className="chip r">{bn(row.percentage)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loaded && !lowRows.length && (
          <div className="admin-empty">এই মাসে কম উপস্থিতির শিক্ষার্থী নেই।</div>
        )}
      </div>

      {/* (খ) বকেয়া তালিকা */}
      <div className="card flush">
        <div className="chead" style={{ padding: "16px 18px 0" }}>
          <h3 className="ct">বকেয়া তালিকা (ডিফল্টার)</h3>
          <span className="sp" />
          <span className="chip w">
            মোট বকেয়া {takaLabel(totalDueAmount)} · {bnNum(defaulters.length)} জন
          </span>
          <Link href="/dashboard/finance" className="btn sec sm">
            আদায় করুন
          </Link>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>শিক্ষার্থী</th>
                <th>শ্রেণি-শাখা</th>
                <th>ইভেন্ট</th>
                <th className="r">বকেয়া পরিমাণ</th>
                <th>শেষ তারিখ</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="person">
                      <div>
                        <div className="nm">{row.studentNameBn ?? "শিক্ষার্থী"}</div>
                        <div className="ds num">
                          রেজি: {bn(row.registrationNumber ?? "—")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {row.classNameBn ?? "—"}
                    {row.sectionNameBn ? ` · ${row.sectionNameBn}` : ""}
                  </td>
                  <td>{row.eventNameBn ?? "—"}</td>
                  <td className="r num b">{takaLabel(row.remaining)}</td>
                  <td className="num">{bnDate(row.dueDate)}</td>
                  <td>
                    {row.status === "PARTIAL" ? (
                      <span className="chip w">আংশিক</span>
                    ) : (
                      <span className="chip r">বকেয়া</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loaded && !defaulters.length && (
          <div className="admin-empty">কোনো বকেয়া নেই — সবাই পরিশোধ করেছে।</div>
        )}
      </div>
    </div>
  );
}
