"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type Row = {
  id: string;
  nameBn: string;
  registrationNumber: string | null;
  status?: string;
};
export default function AttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  async function load() {
    const result = await fetch(
      `/api/backend/attendance/roster?classId=${encodeURIComponent(classId)}${sectionId ? `&sectionId=${encodeURIComponent(sectionId)}` : ""}`,
    );
    const payload = (await result.json()) as { data?: Row[] };
    setRows((payload.data ?? []).map((row) => ({ ...row, status: "PRESENT" })));
  }
  async function save() {
    const result = await fetch("/api/backend/attendance/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        classId,
        sectionId: sectionId || undefined,
        date,
        entries: rows.map((row) => ({
          studentId: row.id,
          status: row.status ?? "PRESENT",
        })),
      }),
    });
    setMessage(
      result.ok
        ? "উপস্থিতি সংরক্ষণ হয়েছে"
        : "সেশন, শ্রেণি বা শিক্ষক বরাদ্দ যাচাই করুন",
    );
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>দৈনিক ক্লাস রেকর্ড</p>
            <h1>উপস্থিতি গ্রহণ</h1>
          </div>
          <Badge variant="success">সবাই উপস্থিত default</Badge>
        </div>
        <Card className="card">
          <CardHeader>
            <CardTitle>ক্লাস নির্বাচন</CardTitle>
          </CardHeader>
          <CardContent className="filterbar">
            <Input className="inp"
              placeholder="সেশন ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
            <Input className="inp"
              placeholder="শ্রেণি ID"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            />
            <Input className="inp"
              placeholder="শাখা ID (ঐচ্ছিক)"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            />
            <Input className="inp"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button type="button" onClick={() => void load()} className="btn">
              শিক্ষার্থী দেখুন
            </Button>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <div className="attendance-list-heading">
              <CardTitle>শিক্ষার্থী তালিকা</CardTitle>
              <span>{rows.length} জন</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="attendance-roster">
              {rows.map((row) => (
                <label className="listrow" key={row.id}>
                  <span className="person">
                    <span className="av">{Array.from(row.nameBn ?? "শি")[0]}</span>
                    <span>
                      <span className="nm" style={{ display: "block" }}>{row.nameBn}</span>
                      <span className="ds">রেজি: {row.registrationNumber}</span>
                    </span>
                  </span>
                  <span style={{ flex: 1 }} />
                  <Select
                    className="sel"
                    style={{ width: 150 }}
                    value={row.status}
                    onChange={(e) =>
                      setRows((items) =>
                        items.map((item) =>
                          item.id === row.id
                            ? { ...item, status: e.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="PRESENT">উপস্থিত</option>
                    <option value="ABSENT">অনুপস্থিত</option>
                    <option value="LEAVE">ছুটি</option>
                  </Select>
                </label>
              ))}
              {rows.length === 0 && (
                <div className="admin-empty">
                  ক্লাস ও তারিখ নির্বাচন করে শিক্ষার্থী তালিকা দেখুন।
                </div>
              )}
            </div>
            {rows.length > 0 && (
              <Button type="button" onClick={() => void save()} className="btn grn mt-5">
                উপস্থিতি সংরক্ষণ করুন
              </Button>
            )}
            {message && <p className="mt-3 text-accent-600">{message}</p>}
          </CardContent>
        </Card>
    </div>
  );
}
