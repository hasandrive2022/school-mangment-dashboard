"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bn, bnDate, bnNum, monthRange } from "@/lib/format";

type DailyRow = {
  date: string;
  present: number;
  total: number;
  percentage: number;
};

type LowRow = {
  studentId: string;
  studentNameBn?: string;
  registrationNumber?: string | null;
  roll?: number | string | null;
  present: number;
  total: number;
  percentage: number;
};

type Report = {
  threshold?: number;
  dailySummary?: DailyRow[];
  monthlySummary?: { present: number; total: number };
  lowAttendance?: LowRow[];
};

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export default function AttendanceReportsPage() {
  const [initialRange] = useState(() => monthRange());
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/backend/attendance/report?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`,
      );
      if (!res.ok) throw new Error("bad");
      // Contract: report fields (dailySummary, monthlySummary,
      // lowAttendance, threshold) sit at the top level of the payload.
      const payload = (await res.json()) as Report;
      setReport(payload);
    } catch {
      setError("রিপোর্ট লোড করা যায়নি");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(initialRange.from, initialRange.to);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, initialRange]);

  const present = report?.monthlySummary?.present ?? 0;
  const total = report?.monthlySummary?.total ?? 0;
  const rate = report ? pct(present, total) : 0;
  const threshold = report?.threshold ?? 75;
  const daily = report?.dailySummary ?? [];
  const low = report?.lowAttendance ?? [];

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <div className="rowflex" style={{ gap: 9 }}>
            <span className="ic-wrap" style={{ width: 38, height: 38, flexBasis: 38 }}>
              <ClipboardList className="ic" />
            </span>
            <div>
              <h2 className="dpage-title">উপস্থিতি রিপোর্ট</h2>
              <p className="cs">দৈনিক সারসংক্ষেপ, মাসিক হার ও কম উপস্থিতির তালিকা</p>
            </div>
          </div>
        </div>
        <span className="sp" />
        {report && (
          <span className="chip w">কম উপস্থিতির সীমা: {bn(String(threshold))}%</span>
        )}
      </div>

      <div className="card">
        <div className="chead">
          <div>
            <h3 className="ct">সময়সীমা নির্বাচন</h3>
            <p className="cs">শুরু ও শেষ তারিখ দিয়ে রিপোর্ট দেখুন</p>
          </div>
        </div>
        <div className="filterbar">
          <div className="fld">
            <label className="lbl" htmlFor="ar-from">শুরুর তারিখ</label>
            <Input id="ar-from" className="inp" type="date" value={from}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl" htmlFor="ar-to">শেষ তারিখ</label>
            <Input id="ar-to" className="inp" type="date" value={to}
              onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" className="btn" onClick={() => void load(from, to)}>
            রিপোর্ট দেখুন
          </Button>
        </div>
        {error && <p className="alert r" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {loading && !report && <p className="admin-empty">রিপোর্ট লোড হচ্ছে…</p>}

      {report && (
        <>
          <div className="g3">
            <div className="card stat">
              <div>
                <div className="v num">{bnNum(present)}</div>
                <div className="l">মোট উপস্থিত</div>
              </div>
              <div className="ic-wrap g"><ClipboardList className="ic lg" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num">{bnNum(total)}</div>
                <div className="l">মোট রেকর্ড</div>
              </div>
              <div className="ic-wrap"><ClipboardList className="ic lg" /></div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num">{bn(String(rate))}%</div>
                <div className="l">উপস্থিতির হার</div>
              </div>
              <div className="ic-wrap w"><ClipboardList className="ic lg" /></div>
            </div>
          </div>

          <div className="g2" style={{ alignItems: "start" }}>
            <div className="card flush">
              <div className="chead" style={{ padding: "18px 18px 6px" }}>
                <div>
                  <h3 className="ct">দৈনিক সারসংক্ষেপ</h3>
                  <p className="cs">প্রতিদিনের উপস্থিতি ও হার</p>
                </div>
              </div>
              {daily.length === 0 ? (
                <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
                  এই সময়সীমায় কোনো তথ্য নেই।
                </p>
              ) : (
                <div className="tw">
                  <table className="tbl" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>তারিখ</th>
                        <th className="c">উপস্থিত</th>
                        <th className="c">মোট</th>
                        <th className="c">হার</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((row) => (
                        <tr key={row.date}>
                          <td className="num">{bnDate(row.date)}</td>
                          <td className="c num">{bnNum(Number(row.present))}</td>
                          <td className="c num">{bnNum(Number(row.total))}</td>
                          <td className="c">
                            <span className="rowflex" style={{ gap: 8, justifyContent: "center" }}>
                              <span className="bar" style={{ width: 70 }}>
                                <i className={Number(row.percentage) >= threshold ? "g" : "r"}
                                  style={{ width: `${Math.min(100, Number(row.percentage))}%` }} />
                              </span>
                              <b className="num">{bn(String(row.percentage))}%</b>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card flush">
              <div className="chead" style={{ padding: "18px 18px 6px" }}>
                <div>
                  <h3 className="ct">কম উপস্থিতি</h3>
                  <p className="cs">
                    {bn(String(threshold))}%-এর নিচে উপস্থিতি থাকা শিক্ষার্থী — এই তালিকার শিক্ষার্থীদের অভিভাবককে জানানো উচিত।
                  </p>
                </div>
              </div>
              {low.length === 0 ? (
                <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
                  কম উপস্থিতির শিক্ষার্থী নেই।
                </p>
              ) : (
                <div className="tw">
                  <table className="tbl" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>নাম</th>
                        <th>রেজিস্ট্রেশন</th>
                        <th className="c">রোল</th>
                        <th className="c">উপস্থিত / মোট</th>
                        <th className="c">হার</th>
                      </tr>
                    </thead>
                    <tbody>
                      {low.map((row) => (
                        <tr key={row.studentId}>
                          <td>
                            <div className="person">
                              <span className="av r" style={{ background: "#FAE3E3", color: "var(--red)" }}>
                                {Array.from(row.studentNameBn ?? "শি")[0]}
                              </span>
                              <div>
                                <div className="nm">{row.studentNameBn || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="num">{bn(String(row.registrationNumber ?? "—"))}</td>
                          <td className="c num">{row.roll != null ? bn(String(row.roll)) : "—"}</td>
                          <td className="c num">
                            {bnNum(Number(row.present))} / {bnNum(Number(row.total))}
                          </td>
                          <td className="c">
                            <span className="chip r">{bn(String(row.percentage))}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
