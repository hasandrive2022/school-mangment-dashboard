"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  async function load() {
    setReport(
      (await (
        await fetch(`/api/backend/attendance/report?from=${from}&to=${to}`)
      ).json()) as Report,
    );
  }
  return (
    <main className="admin-page">
      <div className="admin-page-inner">
        <div className="admin-page-heading">
          <div>
            <p>উপস্থিতি পর্যবেক্ষণ</p>
            <h1>উপস্থিতি রিপোর্ট</h1>
          </div>
          {report && (
            <Badge variant="success">Threshold {report.threshold ?? 75}%</Badge>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>সময়সীমা নির্বাচন</CardTitle>
          </CardHeader>
          <CardContent className="report-filters">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button onClick={() => void load()}>রিপোর্ট দেখুন</Button>
          </CardContent>
        </Card>
        {report && (
          <div className="attendance-report-grid">
            <Card>
              <CardHeader>
                <CardTitle>দৈনিক সারাংশ</CardTitle>
              </CardHeader>
              <CardContent>
                {(report.dailySummary ?? []).map((row) => (
                  <div className="report-day" key={row.date}>
                    <span>{row.date}</span>
                    <div>
                      <i style={{ width: `${row.percentage}%` }} />
                      <small>
                        {row.percentage}% · {row.present}/{row.total}
                      </small>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>মাসিক সারাংশ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="report-total">
                  <strong>{report.monthlySummary?.present ?? 0}</strong>
                  <span>
                    উপস্থিতি / {report.monthlySummary?.total ?? 0} মোট
                  </span>
                </div>
                <div className="report-threshold">
                  Admin threshold: {report.threshold ?? 75}%
                </div>
                <h3 className="mt-6 font-bold text-primary-800">কম উপস্থিতি</h3>
                {(report.lowAttendance ?? []).map((row) => (
                  <div className="low-attendance-row" key={row.studentId}>
                    <span>{row.studentId}</span>
                    <Badge variant="destructive">{row.percentage}%</Badge>
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
    </main>
  );
}
