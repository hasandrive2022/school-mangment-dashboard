/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton, StatSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete } from "@/lib/admin-api";
import { formatTaka } from "@/lib/format";
import {
  printReceiptSheet,
  ReceiptView,
  type ReceiptData,
  type ReceiptSchool,
} from "@/components/finance/receipt";

type Row = Record<string, unknown> & { id: string };
const emptyEvent = {
  nameBn: "",
  type: "মাসিক বেতন",
  dueDate: "",
  lateFee: "",
  classes: "",
  description: "",
};

export default function FinancePage() {
  const toast = useToast();
  const [events, setEvents] = useState<Row[] | null>(null);
  const [dues, setDues] = useState<Row[] | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [filters, setFilters] = useState({
    classId: "",
    sectionId: "",
    status: "",
  });
  const [payment, setPayment] = useState({
    id: "",
    amount: "",
    method: "ক্যাশ",
  });
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [school, setSchool] = useState<ReceiptSchool | null>(null);
  const [meName, setMeName] = useState("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [message, setMessage] = useState("");

  async function loadEvents() {
    const payload = (await (
      await fetch("/api/backend/finance/fee-events")
    ).json()) as { data?: Row[] };
    setEvents(payload.data ?? []);
  }
  async function loadDues() {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    );
    const payload = (await (
      await fetch(`/api/backend/finance/dues?${query}`)
    ).json()) as { data?: Row[] };
    setDues(payload.data ?? []);
  }
  async function publishEvent(id: string) {
    const response = await fetch(
      `/api/backend/finance/fee-events/${id}/publish`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (response.ok) {
      toast.success("ফি ইভেন্ট প্রকাশিত হয়েছে — বকেয়া তৈরি হয়েছে");
      await loadEvents();
      await loadDues();
    } else {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      toast.error(payload?.message ?? payload?.error ?? "প্রকাশ করা যায়নি");
    }
  }
  useEffect(() => {
    void loadEvents();
    void loadDues();
  }, []);
  // School identity + collector name for the receipt (Round 9 wiring).
  useEffect(() => {
    void fetch("/api/school-settings")
      .then((response) => response.json())
      .then((payload: { data?: { school?: ReceiptSchool } }) => {
        if (payload.data?.school) setSchool(payload.data.school);
      })
      .catch(() => undefined);
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user?: { displayNameBn?: string } }) => {
        if (payload.user?.displayNameBn) setMeName(payload.user.displayNameBn);
      })
      .catch(() => undefined);
  }, []);
  async function saveEvent() {
    let classes: Array<{ classId: string; amount: number }>;
    try {
      classes = JSON.parse(form.classes) as Array<{
        classId: string;
        amount: number;
      }>;
    } catch {
      setMessage("classes JSON সঠিক নয়");
      return;
    }
    const response = await fetch("/api/backend/finance/fee-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lateFee: Number(form.lateFee || 0),
        classes,
      }),
    });
    setMessage(
      response.ok ? "ফি ইভেন্ট তৈরি হয়েছে" : "ইভেন্ট তৈরি করা যায়নি",
    );
    if (response.ok) {
      setForm(emptyEvent);
      await loadEvents();
    }
  }
  async function copyEvent(id: string) {
    const response = await fetch(`/api/backend/finance/fee-events/${id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setMessage(
      response.ok ? "পরবর্তী মাসের ইভেন্ট তৈরি হয়েছে" : "কপি করা যায়নি",
    );
    if (response.ok) await loadEvents();
  }
  async function pay() {
    const paidAt = new Date().toISOString().slice(0, 10);
    const response = await fetch(
      `/api/backend/finance/dues/${payment.id}/pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payment.amount),
          method: payment.method,
          paidAt,
        }),
      },
    );
    setMessage(
      response.ok ? "পেমেন্ট ও রসিদ তৈরি হয়েছে" : "পেমেন্ট করা যায়নি",
    );
    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          receipt?: { receiptNumber?: string; verifyCode?: string };
          remaining?: number;
        };
      } | null;
      const receipt = payload?.data?.receipt;
      if (receipt?.receiptNumber) {
        setLastReceipt({
          school,
          receiptNumber: receipt.receiptNumber,
          verifyCode: receipt.verifyCode,
          paidAt,
          studentNameBn: payRow?.studentNameBn
            ? String(payRow.studentNameBn)
            : "শিক্ষার্থী",
          registrationNumber: payRow?.registrationNumber
            ? String(payRow.registrationNumber)
            : undefined,
          classNameBn: payRow?.classNameBn
            ? String(payRow.classNameBn)
            : undefined,
          sectionNameBn: payRow?.sectionNameBn
            ? String(payRow.sectionNameBn)
            : undefined,
          eventNameBn: payRow?.eventNameBn
            ? String(payRow.eventNameBn)
            : "ফি ইভেন্ট",
          amount: Number(payment.amount),
          method: payment.method,
          remaining: payload?.data?.remaining,
          receivedBy: meName || undefined,
        });
      }
      setPayment({ id: "", amount: "", method: "ক্যাশ" });
      setPayRow(null);
      await loadDues();
    }
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>হিসাব ও সংগ্রহ</p>
            <h1>ফি ব্যবস্থাপনা</h1>
          </div>
          <Badge variant="success">লাইভ হিসাব</Badge>
        </div>
        {events === null || dues === null ? (
          <div className="finance-summary">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : (
          <div className="finance-summary">
            <div className="card stat">
              <div>
                <div className="v num">{events.length}</div>
                <div className="l">মোট ইভেন্ট</div>
              </div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num">{dues.length}</div>
                <div className="l">দেখানো বকেয়া</div>
              </div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num">
                  {dues.filter((row) => row.status === "PAID").length}
                </div>
                <div className="l">পরিশোধিত</div>
              </div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num">
                  {dues.filter((row) => row.status === "PARTIAL").length}
                </div>
                <div className="l">আংশিক</div>
              </div>
            </div>
          </div>
        )}
        <div className="finance-layout">
          <section>
            <Card className="card">
              <CardHeader>
                <CardTitle>নতুন ফি ইভেন্ট</CardTitle>
                <p>প্রতি শ্রেণির আলাদা amount JSON-এ দিন।</p>
              </CardHeader>
              <CardContent className="finance-form">
                <Input className="inp"
                  placeholder="ইভেন্টের নাম"
                  value={form.nameBn}
                  onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
                />
                <Select className="sel"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>মাসিক বেতন</option>
                  <option>পরীক্ষা ফি</option>
                  <option>ভর্তি ফি</option>
                  <option>অন্যান্য</option>
                </Select>
                <div className="finance-wide">
                  <label className="finance-label">ইভেন্টের বিবরণ</label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(description) =>
                      setForm({ ...form, description })
                    }
                  />
                </div>
                <Input className="inp"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
                <Input className="inp"
                  type="number"
                  placeholder="দেরি ফি (পয়সা)"
                  value={form.lateFee}
                  onChange={(e) =>
                    setForm({ ...form, lateFee: e.target.value })
                  }
                />
                <Input className="inp finance-wide"
                  placeholder={'[{"classId":"...","amount":5000}]'}
                  value={form.classes}
                  onChange={(e) =>
                    setForm({ ...form, classes: e.target.value })
                  }
                />
                <Button className="btn" onClick={() => void saveEvent()}>
                  ইভেন্ট সংরক্ষণ করুন
                </Button>
              </CardContent>
            </Card>
            <Card className="card">
              <CardHeader>
                <CardTitle>ইভেন্ট তালিকা</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="finance-events">
                  {events === null ? (
                    <ListSkeleton rows={3} />
                  ) : events.length ? (
                    events.map((event) => (
                      <article key={event.id}>
                        <div>
                          <b>{String(event.nameBn)}</b>
                          <small>শেষ তারিখ: {String(event.dueDate)}</small>
                          <small>
                            অবস্থা:{" "}
                            {event.isPublished || event.status === "PUBLISHED"
                              ? "প্রকাশিত"
                              : "খসড়া"}
                          </small>
                        </div>
                        <div className="rowflex">
                          {!event.isPublished && event.status !== "PUBLISHED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn gho sm"
                              onClick={() => void publishEvent(event.id)}
                            >
                              প্রকাশ করুন
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn gho sm"
                            onClick={() => void copyEvent(event.id)}
                          >
                            পরবর্তী মাসে কপি
                          </Button>
                          <DeleteButton
                            itemLabel={String(event.nameBn ?? "ফি ইভেন্ট")}
                            size="sm"
                            onDelete={() =>
                              apiDelete(
                                `/api/backend/finance/fee-events/${event.id}`,
                              ).then(() => undefined)
                            }
                            onDeleted={loadEvents}
                            successMessage="ফি ইভেন্ট মুছে ফেলা হয়েছে"
                          />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="admin-empty">কোনো ইভেন্ট নেই।</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
          <section>
            <Card className="card">
              <CardHeader>
                <CardTitle>বকেয়া ও সংগ্রহ</CardTitle>
                <p>শ্রেণি, শাখা ও status দিয়ে খুঁজুন।</p>
              </CardHeader>
              <CardContent>
                <div className="finance-filters">
                  <Input className="inp"
                    placeholder="শ্রেণি ID"
                    value={filters.classId}
                    onChange={(e) =>
                      setFilters({ ...filters, classId: e.target.value })
                    }
                  />
                  <Input className="inp"
                    placeholder="শাখা ID"
                    value={filters.sectionId}
                    onChange={(e) =>
                      setFilters({ ...filters, sectionId: e.target.value })
                    }
                  />
                  <Select className="sel"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <option value="">সব স্ট্যাটাস</option>
                    <option value="DUE">বকেয়া</option>
                    <option value="PARTIAL">আংশিক</option>
                    <option value="PAID">পরিশোধিত</option>
                  </Select>
                  <Button className="btn gho" onClick={() => void loadDues()}>ফিল্টার</Button>
                </div>
                <div className="tw">
                  <table className="tbl finance-table">
                    <thead>
                      <tr>
                        <th>শিক্ষার্থী</th>
                        <th>মোট</th>
                        <th>বাকি</th>
                        <th>অবস্থা</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {(dues ?? []).map((row) => (
                        <tr key={row.id}>
                          <td>{String(row.studentId)}</td>
                          <td>{formatTaka(Number(row.amount))}</td>
                          <td>
                            {formatTaka(
                              Number(row.amount) - Number(row.paidAmount),
                            )}
                          </td>
                          <td>
                            <Badge
                              variant={
                                row.status === "PAID"
                                  ? "success"
                                  : row.status === "PARTIAL"
                                    ? "warning"
                                    : "destructive"
                              }
                            >
                              {String(row.status)}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn sec sm"
                              onClick={() => {
                                setPayRow(row);
                                setLastReceipt(null);
                                setPayment({
                                  id: row.id,
                                  amount: String(
                                    Number(row.amount) - Number(row.paidAmount),
                                  ),
                                  method: "ক্যাশ",
                                });
                              }}
                            >
                              সংগ্রহ
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dues === null ? (
                    <ListSkeleton rows={3} />
                  ) : !dues.length ? (
                    <div className="admin-empty">
                      এই ফিল্টারে কোনো বকেয়া নেই।
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            {payment.id && (
              <Card className="card collection-card">
                <CardHeader>
                  <CardTitle>পেমেন্ট গ্রহণ ও রসিদ</CardTitle>
                </CardHeader>
                <CardContent className="finance-form">
                  <Input className="inp"
                    type="number"
                    value={payment.amount}
                    onChange={(e) =>
                      setPayment({ ...payment, amount: e.target.value })
                    }
                    placeholder="পরিমাণ (পয়সা)"
                  />
                  <Select className="sel"
                    value={payment.method}
                    onChange={(e) =>
                      setPayment({ ...payment, method: e.target.value })
                    }
                  >
                    <option>ক্যাশ</option>
                    <option>বিকাশ</option>
                    <option>ব্যাংক</option>
                  </Select>
                  <Button className="btn grn" onClick={() => void pay()}>
                    সংরক্ষণ ও রসিদ তৈরি
                  </Button>
                </CardContent>
              </Card>
            )}
            {lastReceipt && (
              <Card className="card">
                <CardHeader>
                  <CardTitle>সর্বশেষ রশিদ</CardTitle>
                  <p>পেমেন্ট সফল হয়েছে — রশিদটি প্রিন্ট করে শিক্ষার্থীকে দিন।</p>
                </CardHeader>
                <CardContent>
                  <ReceiptView data={lastReceipt} />
                  <div className="rowflex" style={{ marginTop: 14 }}>
                    <Button className="btn" onClick={() => printReceiptSheet()}>
                      রশিদ প্রিন্ট করুন
                    </Button>
                    <Button
                      className="btn gho"
                      variant="outline"
                      onClick={() => setLastReceipt(null)}
                    >
                      বন্ধ করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
        {message && <p className="alert g">{message}</p>}
    </div>
  );
}
