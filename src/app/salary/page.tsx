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
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-2xl font-bold text-primary-800">শিক্ষক বেতন</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>বেতন পরিশোধ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Teacher ID"
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            />
            <Input
              type="month"
              value={form.salaryMonth}
              onChange={(e) =>
                setForm({ ...form, salaryMonth: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="মূল বেতন (পয়সা)"
              value={form.basic}
              onChange={(e) => setForm({ ...form, basic: e.target.value })}
            />
            <Input
              type="number"
              placeholder="ভাতা"
              value={form.allowances}
              onChange={(e) => setForm({ ...form, allowances: e.target.value })}
            />
            <Input
              type="number"
              placeholder="কর্তন"
              value={form.deductions}
              onChange={(e) => setForm({ ...form, deductions: e.target.value })}
            />
            <Select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option>ক্যাশ</option>
              <option>ব্যাংক</option>
              <option>বিকাশ</option>
            </Select>
            <Button onClick={() => void pay()}>পরিশোধ করুন</Button>
            {message && <p>{message}</p>}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>বেতন রেকর্ড</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.map((row) => (
              <div
                className="flex items-center justify-between border-b py-3"
                key={row.id}
              >
                <span>
                  {row.teacherId} · {row.salaryMonth} · ৳ {row.net}
                </span>
                <Button variant="outline" onClick={() => window.print()}>
                  রসিদ প্রিন্ট
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
