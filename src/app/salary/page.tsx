/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { apiDelete } from "@/lib/admin-api";
import { formatTaka, takaToPaisa } from "@/lib/format";
import { printReceiptSheet, ReceiptView, type ReceiptData, type ReceiptSchool } from "@/components/finance/receipt";
type Salary = {
  id: string;
  teacherId: string;
  teacherNameBn?: string;
  teacherCode?: string;
  salaryMonth: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
};
type TeacherOption = { id: string; displayNameBn?: string; nameBn?: string; teacherCode?: string };
export default function SalaryPage() {
  const [rows, setRows] = useState<Salary[] | null>(null);
  const [school, setSchool] = useState<ReceiptSchool | null>(null);
  const [receiptRow, setReceiptRow] = useState<Salary | null>(null);
  const [form, setForm] = useState({
    teacherId: "",
    salaryMonth: "",
    basic: "",
    allowances: "0",
    deductions: "0",
    method: "ক্যাশ",
  });
  const [message, setMessage] = useState("");
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  async function load() {
    const p = (await (await fetch("/api/backend/finance/salary")).json()) as {
      data?: Salary[];
    };
    setRows(p.data ?? []);
  }
  useEffect(() => {
    void load();
    void fetch("/api/backend/people/teachers")
      .then((response) => response.json() as Promise<{ data?: TeacherOption[] }>)
      .then((payload) => setTeachers(payload.data ?? []))
      .catch(() => setTeachers([]));
    void fetch("/api/school-settings", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ data?: { school?: ReceiptSchool } }>)
      .then((payload) => setSchool(payload.data?.school ?? null))
      .catch(() => undefined);
  }, []);
  async function pay() {
    const response = await fetch("/api/backend/finance/salary/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        basic: takaToPaisa(Number(form.basic)),
        allowances: takaToPaisa(Number(form.allowances)),
        deductions: takaToPaisa(Number(form.deductions)),
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
            <Select className="sel"
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            >
              <option value="">শিক্ষক নির্বাচন করুন</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayNameBn ?? teacher.nameBn ?? "শিক্ষক"}{teacher.teacherCode ? ` · ${teacher.teacherCode}` : ""}</option>)}
            </Select>
            <Input className="inp"
              type="month"
              value={form.salaryMonth}
              onChange={(e) =>
                setForm({ ...form, salaryMonth: e.target.value })
              }
            />
            <Input className="inp"
              type="number"
              placeholder="মূল বেতন (টাকা)"
              value={form.basic}
              onChange={(e) => setForm({ ...form, basic: e.target.value })}
            />
            <Input className="inp"
              type="number"
              placeholder="ভাতা (টাকা)"
              value={form.allowances}
              onChange={(e) => setForm({ ...form, allowances: e.target.value })}
            />
            <Input className="inp"
              type="number"
              placeholder="কর্তন (টাকা)"
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
            {rows === null ? (
              <ListSkeleton rows={4} />
            ) : rows.length === 0 ? (
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
                      <th className="r">নেট</th>
                      <th>অবস্থা</th>
                      <th className="r">কার্যকলাপ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.teacherNameBn ?? row.teacherId}</td>
                        <td>{row.salaryMonth}</td>
                        <td className="r num">{formatTaka(row.basic)}</td>
                        <td className="r num">{formatTaka(row.allowances)}</td>
                        <td className="r num">{formatTaka(row.deductions)}</td>
                        <td className="r num">
                          <b>{formatTaka(row.net)}</b>
                        </td>
                        <td>
                          <span className="chip g">{row.status}</span>
                        </td>
                        <td className="r">
                          <div className="rowflex" style={{ justifyContent: "flex-end" }}>
                            <Button
                              variant="outline"
                              className="btn gho sm"
                              onClick={() => {
                                setReceiptRow(row);
                                window.setTimeout(() => printReceiptSheet(), 0);
                              }}
                            >
                              রসিদ প্রিন্ট
                            </Button>
                            <DeleteButton
                              itemLabel={`বেতন রেকর্ড (${row.salaryMonth})`}
                              onDelete={() =>
                                apiDelete(
                                  `/api/backend/finance/salary/${row.id}`,
                                ).then(() => undefined)
                              }
                              onDeleted={load}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {receiptRow && (
          <ReceiptView
            data={{
              school,
              receiptNumber: receiptRow.id,
              paidAt: receiptRow.salaryMonth,
              studentNameBn: receiptRow.teacherNameBn ?? receiptRow.teacherId,
              eventNameBn: "মাসিক বেতন",
              amount: receiptRow.net,
              method: form.method,
              receivedBy: "প্রশাসন",
              receiptType: "salary",
              employeeId: receiptRow.teacherId,
              salaryMonth: receiptRow.salaryMonth,
              basic: receiptRow.basic,
              allowances: receiptRow.allowances,
              deductions: receiptRow.deductions,
              net: receiptRow.net,
              status: receiptRow.status,
            } satisfies ReceiptData}
          />
        )}
    </div>
  );
}
