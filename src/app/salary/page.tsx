/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
type Salary = {
  id: string;
  teacherId: string;
  salaryMonth: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
};
export default function SalaryPage() {
  const [rows, setRows] = useState<Salary[]>([]);
  const [form, setForm] = useState({
    teacherId: "",
    salaryMonth: "",
    basic: "",
    allowances: "0",
    deductions: "0",
    method: "ক্যাশ",
  });
  const [message, setMessage] = useState("");
  async function load() {
    const p = (await (await fetch("/api/backend/finance/salary")).json()) as {
      data?: Salary[];
    };
    setRows(p.data ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function pay() {
    const response = await fetch("/api/backend/finance/salary/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        basic: Number(form.basic),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
      }),
    });
    setMessage(
      response.ok
        ? "বেতন পরিশোধ ও ledger-এ পোস্ট হয়েছে"
        : "বেতন সংরক্ষণ করা যায়নি",
    );
    if (response.ok) await load();
  }
  return (
    <div className="dstack">
        <div className="chead">
          <div>
            <h2 className="dpage-title">শিক্ষক বেতন</h2>
            <p className="cs">বেতন পরিশোধ করলে ledger-এ স্বয়ংক্রিয়ভাবে ব্যয় হিসেবে পোস্ট হয়।</p>
          </div>
        </div>
        <Card className="card">
          <CardHeader>
            <CardTitle>বেতন পরিশোধ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input className="inp"
              placeholder="Teacher ID"
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            />
            <Input className="inp"
              type="month"
              value={form.salaryMonth}
              onChange={(e) =>
                setForm({ ...form, salaryMonth: e.target.value })
              }
            />
            <Input className="inp"
              type="number"
              placeholder="মূল বেতন (পয়সা)"
              value={form.basic}
              onChange={(e) => setForm({ ...form, basic: e.target.value })}
            />
            <Input className="inp"
              type="number"
              placeholder="ভাতা"
              value={form.allowances}
              onChange={(e) => setForm({ ...form, allowances: e.target.value })}
            />
            <Input className="inp"
              type="number"
              placeholder="কর্তন"
              value={form.deductions}
              onChange={(e) => setForm({ ...form, deductions: e.target.value })}
            />
            <Select className="sel"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option>ক্যাশ</option>
              <option>ব্যাংক</option>
              <option>বিকাশ</option>
            </Select>
            <Button className="btn grn" onClick={() => void pay()}>পরিশোধ করুন</Button>
            {message && <p>{message}</p>}
          </CardContent>
        </Card>
        <Card className="card flush">
          <CardHeader>
            <CardTitle>বেতন রেকর্ড</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="admin-empty">কোনো বেতন রেকর্ড নেই।</p>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>শিক্ষক ID</th>
                      <th>মাস</th>
                      <th className="r">মূল বেতন</th>
                      <th className="r">ভাতা</th>
                      <th className="r">কর্তন</th>
                      <th className="r">নেট</th>
                      <th>অবস্থা</th>
                      <th className="r">কার্যকলাপ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="num">{row.teacherId}</td>
                        <td>{row.salaryMonth}</td>
                        <td className="r num">৳ {row.basic}</td>
                        <td className="r num">৳ {row.allowances}</td>
                        <td className="r num">৳ {row.deductions}</td>
                        <td className="r num">
                          <b>৳ {row.net}</b>
                        </td>
                        <td>
                          <span className="chip g">{row.status}</span>
                        </td>
                        <td className="r">
                          <Button
                            variant="outline"
                            className="btn gho sm"
                            onClick={() => window.print()}
                          >
                            রসিদ প্রিন্ট
                          </Button>
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
