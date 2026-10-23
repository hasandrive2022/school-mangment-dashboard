/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bn, bnDate, bnNum, paisaToTaka, takaLabel, takaToPaisa } from "@/lib/format";

type Teacher = {
  id: string;
  nameBn?: string;
  displayNameBn?: string;
  teacherCode?: string;
  monthlySalary?: number;
};
type Salary = {
  id: string;
  teacherId: string;
  salaryMonth: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
  paidAt?: string | null;
  method?: string | null;
  teacherNameBn?: string;
  teacherCode?: string;
};

const METHODS = ["ক্যাশ", "ব্যাংক", "বিকাশ"];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalaryPage() {
  const [rows, setRows] = useState<Salary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({
    teacherId: "",
    salaryMonth: currentMonth(),
    basic: "",
    allowances: "0",
    deductions: "0",
    method: "ক্যাশ",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const p = (await (await fetch("/api/backend/finance/salary")).json()) as {
      data?: Salary[];
    };
    setRows(p.data ?? []);
  }
  async function loadTeachers() {
    const p = (await (await fetch("/api/backend/people/teachers")).json()) as {
      data?: Teacher[];
    };
    setTeachers(p.data ?? []);
  }
  useEffect(() => {
    void load();
    void loadTeachers();
  }, []);

  function pickTeacher(teacherId: string) {
    const teacher = teachers.find((row) => row.id === teacherId);
    setForm((current) => ({
      ...current,
      teacherId,
      basic:
        teacher?.monthlySalary != null
          ? String(paisaToTaka(teacher.monthlySalary))
          : current.basic,
    }));
  }

  async function pay() {
    setError("");
    setMessage("");
    if (!form.teacherId) {
      setError("একজন শিক্ষক নির্বাচন করুন।");
      return;
    }
    if (!form.salaryMonth) {
      setError("বেতনের মাস নির্বাচন করুন।");
      return;
    }
    const basicTaka = Number(form.basic);
    if (!basicTaka || basicTaka <= 0) {
      setError("মূল বেতনের সঠিক পরিমাণ দিন।");
      return;
    }
    const response = await fetch("/api/backend/finance/salary/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: form.teacherId,
        salaryMonth: form.salaryMonth,
        basic: takaToPaisa(basicTaka),
        allowances: takaToPaisa(Number(form.allowances || 0)),
        deductions: takaToPaisa(Number(form.deductions || 0)),
        method: form.method,
      }),
    });
    if (!response.ok) {
      setError("বেতন সংরক্ষণ করা যায়নি। একই মাসে আগেই পরিশোধ হয়ে থাকতে পারে।");
      return;
    }
    setMessage("বেতন পরিশোধ হয়েছে এবং আয়–ব্যয় খাতায় ব্যয় হিসেবে পোস্ট হয়েছে।");
    await load();
  }

  const totalNet = rows.reduce((sum, row) => sum + (row.net ?? 0), 0);
  const netPreview =
    takaToPaisa(Number(form.basic || 0)) +
    takaToPaisa(Number(form.allowances || 0)) -
    takaToPaisa(Number(form.deductions || 0));

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">শিক্ষক বেতন</h2>
          <p className="cs">
            বেতন পরিশোধ করলে আয়–ব্যয় খাতায় স্বয়ংক্রিয়ভাবে ব্যয় হিসেবে পোস্ট হয়।
          </p>
        </div>
      </div>

      <div className="g3">
        <div className="card stat">
          <div>
            <div className="v num">{takaLabel(totalNet)}</div>
            <div className="l">এই তালিকায় মোট পরিশোধ</div>
          </div>
          <div className="ic-wrap g" />
        </div>
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(rows.length)}</div>
            <div className="l">মোট বেতন রেকর্ড</div>
          </div>
          <div className="ic-wrap" />
        </div>
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(teachers.length)}</div>
            <div className="l">মোট শিক্ষক</div>
          </div>
          <div className="ic-wrap w" />
        </div>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle>বেতন পরিশোধ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="fgrid">
            <div>
              <label className="lbl">
                শিক্ষক <span className="req">*</span>
              </label>
              <Select
                className="sel"
                value={form.teacherId}
                onChange={(e) => pickTeacher(e.target.value)}
              >
                <option value="">শিক্ষক নির্বাচন করুন</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {(teacher.nameBn ?? teacher.displayNameBn ?? "শিক্ষক") +
                      (teacher.teacherCode ? ` (${teacher.teacherCode})` : "")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl">
                মাস <span className="req">*</span>
              </label>
              <Input
                className="inp"
                type="month"
                value={form.salaryMonth}
                onChange={(e) => setForm({ ...form, salaryMonth: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">মূল বেতন (টাকা)</label>
              <Input
                className="inp num"
                type="number"
                min="0"
                value={form.basic}
                onChange={(e) => setForm({ ...form, basic: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">ভাতা (টাকা)</label>
              <Input
                className="inp num"
                type="number"
                min="0"
                value={form.allowances}
                onChange={(e) => setForm({ ...form, allowances: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">কর্তন (টাকা)</label>
              <Input
                className="inp num"
                type="number"
                min="0"
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">পরিশোধের মাধ্যম</label>
              <Select
                className="sel"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="rowflex" style={{ marginTop: 16 }}>
            <span className="chip b">নিট পরিশোধযোগ্য: {takaLabel(Math.max(netPreview, 0))}</span>
            <span className="sp" style={{ flex: 1 }} />
            <Button className="btn grn" onClick={() => void pay()}>
              পরিশোধ করুন
            </Button>
          </div>
          {error && <p className="alert r" style={{ marginTop: 12 }}>{error}</p>}
          {message && <p className="alert g" style={{ marginTop: 12 }}>{message}</p>}
        </CardContent>
      </Card>

      <div className="alert b">
        <span>
          বেতন পরিশোধ করলেই খরচটি আয়–ব্যয় খাতায় &quot;শিক্ষক বেতন&quot; খাতে
          স্বয়ংক্রিয়ভাবে যোগ হয় এবং শিক্ষক নিজের প্যানেলে পে-স্লিপ দেখতে পান।
        </span>
      </div>

      <Card className="card flush">
        <CardHeader style={{ padding: "16px 18px 0" }}>
          <CardTitle>বেতন ইতিহাস</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <p className="admin-empty">কোনো বেতন রেকর্ড নেই।</p>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>শিক্ষক</th>
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
                      <td>
                        <div className="person">
                          <div>
                            <div className="nm">{row.teacherNameBn ?? "শিক্ষক"}</div>
                            <div className="ds num">{bn(row.teacherCode ?? "")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{bn(row.salaryMonth)}</td>
                      <td className="r num">{takaLabel(row.basic)}</td>
                      <td className="r num">{takaLabel(row.allowances)}</td>
                      <td className="r num">{takaLabel(row.deductions)}</td>
                      <td className="r num b">{takaLabel(row.net)}</td>
                      <td>{row.method ?? "—"}</td>
                      <td className="num">{bnDate(row.paidAt)}</td>
                      <td>
                        {row.status === "PAID" ? (
                          <span className="chip g">পরিশোধিত</span>
                        ) : (
                          <span className="chip w">{row.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
