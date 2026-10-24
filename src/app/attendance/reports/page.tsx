"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/list-skeleton";
type Report = {
  threshold?: number;
  dailySummary?: Array<{
    date: string;
    percentage: number;
    present: number;
    total: number;
  }>;
  monthlySummary?: { present: number; total: number };
  lowAttendance?: Array<{ studentId: string; percentage: number }>;
};
export default function AttendanceReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  async function load() {
    setLoading(true);
    try {
      setReport(
        (await (
          await fetch(`/api/backend/attendance/report?from=${from}&to=${to}`)
        ).json()) as Report,
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>উপস্থিতি পর্যবেক্ষণ</p>
            <h1>উপস্থিতি রিপোর্ট</h1>
          </div>
          {report && (
            <Badge variant="success">Threshold {report.threshold ?? 75}%</Badge>
          )}
        </div>
        <Card className="card">
          <CardHeader>
            <CardTitle>সময়সীমা নির্বাচন</CardTitle>
          </CardHeader>
          <CardContent className="filterbar">
            <Input className="inp"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input className="inp"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button className="btn" onClick={() => void load()} disabled={loading}>
              {loading ? "লোড হচ্ছে…" : "রিপোর্ট দেখুন"}
            </Button>
          </CardContent>
        </Card>
        {loading && (
          <div className="card" aria-busy="true">
            <ListSkeleton rows={4} />
          </div>
        )}
        {!loading && report && (
          <div className="g2" style={{ alignItems: "start" }}>
            <Card className="card">
              <CardHeader>
                <CardTitle>দৈনিক সারাংশ</CardTitle>
              </CardHeader>
              <CardContent>
                {(report.dailySummary ?? []).map((row) => (
                  <div className="listrow" key={row.date}>
                    <span className="num" style={{ minWidth: 96 }}>{row.date}</span>
                    <div className="grow">
                      <div className="bar">
                        <i className="g" style={{ width: `${row.percentage}%` }} />
                      </div>
                    </div>
                    <b className="num">
                      {row.percentage}% · {row.present}/{row.total}
                    </b>
                  </div>
                ))}
                {(report.dailySummary ?? []).length === 0 && (
                  <p className="admin-empty">এই সময়সীমায় কোনো তথ্য নেই।</p>
                )}
              </CardContent>
            </Card>
            <Card className="card">
              <CardHeader>
                <CardTitle>মাসিক সারাংশ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="stat">
                  <div>
                    <div className="v num">{report.monthlySummary?.present ?? 0}</div>
                    <div className="l">
                      উপস্থিতি / {report.monthlySummary?.total ?? 0} মোট
                    </div>
                  </div>
                </div>
                <p className="alert b" style={{ marginTop: 12 }}>
                  কম উপস্থিতির সীমা (threshold): {report.threshold ?? 75}%
                </p>
                <h3 className="ct" style={{ marginTop: 16 }}>কম উপস্থিতি</h3>
                {(report.lowAttendance ?? []).map((row) => (
                  <div className="listrow" key={row.studentId}>
                    <span className="grow num">{row.studentId}</span>
                    <span className="chip r">{row.percentage}%</span>
                  </div>
                ))}
                {!(report.lowAttendance ?? []).length && (
                  <p className="admin-empty mt-3">
                    কম উপস্থিতির শিক্ষার্থী নেই।
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
