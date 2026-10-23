/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  bn,
  bnDate,
  bnNum,
  paisaToTaka,
  takaLabel,
  takaToPaisa,
} from "@/lib/format";

type FeeEventClass = { classId: string; classNameBn?: string; amount: number };
type FeeEvent = {
  id: string;
  nameBn: string;
  type: string;
  description?: string;
  dueDate: string;
  lateFee: number;
  isPublished: boolean;
  classes: FeeEventClass[];
  duesCount: number;
  paidCount: number;
  partialCount: number;
};
type Due = {
  id: string;
  studentId: string;
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
type ClassRow = { id: string; nameBn: string };
type SectionRow = { id: string; classId: string; nameBn: string; classNameBn?: string };
type ClassAmountRow = { classId: string; amountTaka: string };
type ReceiptInfo = {
  receiptNumber: string;
  verifyCode: string;
  paidAmount: number;
  remaining: number;
  amountTaka: number;
  method: string;
  paidAt: string;
  studentNameBn?: string;
  registrationNumber?: string;
  eventNameBn?: string;
  classNameBn?: string;
  sectionNameBn?: string;
};

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "monthly", label: "মাসিক বেতন" },
  { value: "exam", label: "পরীক্ষা ফি" },
  { value: "admission", label: "ভর্তি ফি" },
  { value: "other", label: "অন্যান্য" },
];
const TYPE_LABELS: Record<string, string> = {
  monthly: "মাসিক বেতন",
  exam: "পরীক্ষা ফি",
  admission: "ভর্তি ফি",
  annual: "বার্ষিক ফি",
  session: "সেশন চার্জ",
  other: "অন্যান্য",
};
const METHODS = ["ক্যাশ", "ব্যাংক", "বিকাশ"];

function statusChip(status: string) {
  if (status === "PAID")
    return <span className="chip g">পরিশোধিত</span>;
  if (status === "PARTIAL")
    return <span className="chip w">আংশিক</span>;
  return <span className="chip r">বকেয়া</span>;
}

export default function FinancePage() {
  const [view, setView] = useState<"list" | "form" | "collection">("list");
  const [events, setEvents] = useState<FeeEvent[]>([]);
  const [allDues, setAllDues] = useState<Due[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --- event form state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameBn: "",
    type: "monthly",
    description: "",
    dueDate: "",
    lateFeeTaka: "",
    isPublished: false,
  });
  const [classRows, setClassRows] = useState<ClassAmountRow[]>([
    { classId: "", amountTaka: "" },
  ]);

  // --- collection filters ---
  const [filters, setFilters] = useState({ classId: "", sectionId: "", status: "" });

  // --- payment modal ---
  const [payDue, setPayDue] = useState<Due | null>(null);
  const [payForm, setPayForm] = useState({ amountTaka: "", method: "ক্যাশ", paidAt: "" });
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [paying, setPaying] = useState(false);

  async function loadEvents() {
    const payload = (await (
      await fetch("/api/backend/finance/fee-events")
    ).json()) as { data?: FeeEvent[] };
    setEvents(payload.data ?? []);
  }
  async function loadAllDues() {
    const payload = (await (
      await fetch("/api/backend/finance/dues")
    ).json()) as { data?: Due[] };
    setAllDues(payload.data ?? []);
  }
  async function loadDues(active = filters) {
    const query = new URLSearchParams(
      Object.entries(active).filter(([, value]) => value),
    );
    const qs = query.toString();
    const payload = (await (
      await fetch(`/api/backend/finance/dues${qs ? `?${qs}` : ""}`)
    ).json()) as { data?: Due[] };
    setDues(payload.data ?? []);
  }
  async function loadLookups() {
    const [classRes, sectionRes] = await Promise.all([
      fetch("/api/backend/academics/classes"),
      fetch("/api/backend/academics/sections"),
    ]);
    const classPayload = (await classRes.json()) as { data?: ClassRow[] };
    const sectionPayload = (await sectionRes.json()) as { data?: SectionRow[] };
    setClasses(classPayload.data ?? []);
    setSections(sectionPayload.data ?? []);
  }

  useEffect(() => {
    void loadEvents();
    void loadAllDues();
    void loadDues({ classId: "", sectionId: "", status: "" });
    void loadLookups();
    void fetch("/api/school-settings")
      .then((r) => r.json())
      .then((p: { data?: { nameBn?: string } }) => {
        if (p.data?.nameBn) setSchoolName(p.data.nameBn);
      })
      .catch(() => undefined);
  }, []);

  // ---------- event form ----------
  function openCreate() {
    setEditingId(null);
    setForm({
      nameBn: "",
      type: "monthly",
      description: "",
      dueDate: "",
      lateFeeTaka: "",
      isPublished: false,
    });
    setClassRows([{ classId: "", amountTaka: "" }]);
    setError("");
    setView("form");
  }
  function openEdit(event: FeeEvent) {
    setEditingId(event.id);
    setForm({
      nameBn: event.nameBn ?? "",
      type: TYPE_LABELS[event.type] ? event.type : "other",
      description: event.description ?? "",
      dueDate: event.dueDate ?? "",
      lateFeeTaka: event.lateFee ? String(paisaToTaka(event.lateFee)) : "",
      isPublished: Boolean(event.isPublished),
    });
    setClassRows(
      event.classes?.length
        ? event.classes.map((row) => ({
            classId: row.classId,
            amountTaka: String(paisaToTaka(row.amount)),
          }))
        : [{ classId: "", amountTaka: "" }],
    );
    setError("");
    setView("form");
  }
  async function saveEvent() {
    setError("");
    const validRows = classRows.filter(
      (row) => row.classId && Number(row.amountTaka) > 0,
    );
    if (!form.nameBn.trim()) {
      setError("ইভেন্টের নাম দিন।");
      return;
    }
    if (!form.dueDate) {
      setError("পরিশোধের শেষ তারিখ দিন।");
      return;
    }
    if (!validRows.length) {
      setError("অন্তত একটি শ্রেণি ও টাকার পরিমাণ দিন।");
      return;
    }
    const body = {
      nameBn: form.nameBn.trim(),
      type: form.type,
      description: form.description,
      dueDate: form.dueDate,
      lateFee: takaToPaisa(Number(form.lateFeeTaka || 0)),
      isPublished: form.isPublished,
      classes: validRows.map((row) => ({
        classId: row.classId,
        amount: takaToPaisa(Number(row.amountTaka)),
      })),
    };
    const response = editingId
      ? await fetch(`/api/backend/finance/fee-events/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/backend/finance/fee-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    if (!response.ok) {
      setError("ইভেন্ট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      return;
    }
    setMessage(editingId ? "ফি ইভেন্ট হালনাগাদ হয়েছে।" : "ফি ইভেন্ট তৈরি হয়েছে।");
    setView("list");
    await Promise.all([loadEvents(), loadAllDues(), loadDues()]);
  }
  async function publishEvent(id: string) {
    const response = await fetch(`/api/backend/finance/fee-events/${id}/publish`, {
      method: "PATCH",
    });
    setMessage(
      response.ok
        ? "ইভেন্ট প্রকাশিত হয়েছে — শিক্ষার্থীদের বকেয়া তৈরি হয়েছে।"
        : "প্রকাশ করা যায়নি।",
    );
    if (response.ok) await Promise.all([loadEvents(), loadAllDues(), loadDues()]);
  }
  async function copyEvent(id: string) {
    const response = await fetch(`/api/backend/finance/fee-events/${id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setMessage(response.ok ? "ইভেন্ট কপি তৈরি হয়েছে।" : "কপি করা যায়নি।");
    if (response.ok) await loadEvents();
  }

  // ---------- collection / payment ----------
  function openPayment(due: Due) {
    setReceipt(null);
    setPayDue(due);
    setPayForm({
      amountTaka: String(paisaToTaka(due.amount - due.paidAmount)),
      method: "ক্যাশ",
      paidAt: new Date().toISOString().slice(0, 10),
    });
  }
  async function submitPayment() {
    if (!payDue) return;
    const amountTaka = Number(payForm.amountTaka);
    if (!amountTaka || amountTaka <= 0) {
      setError("সঠিক টাকার পরিমাণ দিন।");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const response = await fetch(`/api/backend/finance/dues/${payDue.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: takaToPaisa(amountTaka),
          method: payForm.method,
          paidAt: payForm.paidAt || new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          receipt: { receiptNumber: string; verifyCode: string };
          paidAmount: number;
          remaining: number;
        };
      } | null;
      if (!response.ok || !payload?.data) {
        setError("পেমেন্ট করা যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setReceipt({
        receiptNumber: payload.data.receipt.receiptNumber,
        verifyCode: payload.data.receipt.verifyCode,
        paidAmount: payload.data.paidAmount,
        remaining: payload.data.remaining,
        amountTaka,
        method: payForm.method,
        paidAt: payForm.paidAt,
        studentNameBn: payDue.studentNameBn,
        registrationNumber: payDue.registrationNumber,
        eventNameBn: payDue.eventNameBn,
        classNameBn: payDue.classNameBn,
        sectionNameBn: payDue.sectionNameBn,
      });
      await Promise.all([loadEvents(), loadAllDues(), loadDues()]);
    } finally {
      setPaying(false);
    }
  }

  const dueCount = allDues.filter((row) => row.status === "DUE").length;
  const paidCountAll = allDues.filter((row) => row.status === "PAID").length;
  const partialCountAll = allDues.filter((row) => row.status === "PARTIAL").length;
  const filteredSections = sections.filter(
    (row) => !filters.classId || row.classId === filters.classId,
  );

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">ফি ব্যবস্থাপনা</h2>
          <p className="cs">ফি ইভেন্ট তৈরি, প্রকাশ ও আদায় — সব হিসাব টাকায়।</p>
        </div>
        <span className="sp" />
        <Button className="btn" onClick={openCreate}>
          নতুন ইভেন্ট
        </Button>
      </div>

      <div className="g4">
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(events.length)}</div>
            <div className="l">মোট ইভেন্ট</div>
          </div>
          <div className="ic-wrap" />
        </div>
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(dueCount)}</div>
            <div className="l">মোট বকেয়া</div>
          </div>
          <div className="ic-wrap r" />
        </div>
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(paidCountAll)}</div>
            <div className="l">পরিশোধিত</div>
          </div>
          <div className="ic-wrap g" />
        </div>
        <div className="card stat">
          <div>
            <div className="v num">{bnNum(partialCountAll)}</div>
            <div className="l">আংশিক</div>
          </div>
          <div className="ic-wrap w" />
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={view === "list" ? "on" : ""}
          onClick={() => setView("list")}
        >
          ইভেন্ট তালিকা
        </button>
        <button
          type="button"
          className={view === "form" ? "on" : ""}
          onClick={() => (editingId || form.nameBn ? setView("form") : openCreate())}
        >
          ইভেন্ট তৈরি / সম্পাদনা
        </button>
        <button
          type="button"
          className={view === "collection" ? "on" : ""}
          onClick={() => setView("collection")}
        >
          আদায় (কালেকশন)
        </button>
      </div>

      {message && <p className="alert g">{message}</p>}
      {error && view !== "collection" && <p className="alert r">{error}</p>}

      {view === "list" && (
        <div className="card flush">
          <div className="chead" style={{ padding: "16px 18px 0" }}>
            <h3 className="ct">ফি ইভেন্টসমূহ</h3>
            <span className="sp" />
            <Button className="btn sm" onClick={openCreate}>
              নতুন ইভেন্ট
            </Button>
          </div>
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ইভেন্টের নাম</th>
                  <th>ধরন</th>
                  <th>শ্রেণিসমূহ</th>
                  <th>শেষ তারিখ</th>
                  <th style={{ minWidth: 150 }}>অগ্রগতি</th>
                  <th>অবস্থা</th>
                  <th className="r">কার্যকলাপ</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const total = event.duesCount ?? 0;
                  const paid = event.paidCount ?? 0;
                  const pct = total ? Math.round((paid * 100) / total) : 0;
                  return (
                    <tr key={event.id}>
                      <td>
                        <span className="b">{event.nameBn}</span>
                        {event.lateFee ? (
                          <div className="small muted">
                            বিলম্ব ফি: {takaLabel(event.lateFee)}
                          </div>
                        ) : null}
                      </td>
                      <td>{TYPE_LABELS[event.type] ?? event.type}</td>
                      <td>
                        {event.classes?.length
                          ? event.classes.map((row) => (
                              <div key={row.classId} className="small">
                                {row.classNameBn ?? ""} — {takaLabel(row.amount)}
                              </div>
                            ))
                          : "—"}
                      </td>
                      <td className="num">{bnDate(event.dueDate)}</td>
                      <td>
                        {total ? (
                          <div className="rowflex">
                            <div className="bar" style={{ flex: 1 }}>
                              <i
                                className={pct >= 80 ? "g" : pct >= 40 ? "" : "w"}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="small num">
                              {bn(paid)}/{bn(total)} · {bn(pct)}%
                            </span>
                          </div>
                        ) : (
                          <span className="small muted">প্রকাশের পর হিসাব শুরু হবে</span>
                        )}
                      </td>
                      <td>
                        {event.isPublished ? (
                          <span className="chip g">প্রকাশিত</span>
                        ) : (
                          <span className="chip gr">খসড়া</span>
                        )}
                      </td>
                      <td className="r">
                        <span className="rowflex" style={{ justifyContent: "flex-end" }}>
                          {!event.isPublished && (
                            <Button
                              className="btn grn sm"
                              onClick={() => void publishEvent(event.id)}
                            >
                              প্রকাশ করুন
                            </Button>
                          )}
                          <Button
                            className="btn gho sm"
                            onClick={() => void copyEvent(event.id)}
                          >
                            কপি
                          </Button>
                          <Button
                            className="btn gho sm"
                            onClick={() => openEdit(event)}
                          >
                            সম্পাদনা
                          </Button>
                          <Button
                            className="btn gho sm"
                            onClick={() => setView("collection")}
                          >
                            আদায়
                          </Button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!events.length && <div className="admin-empty">কোনো ফি ইভেন্ট নেই।</div>}
          <div className="alert b" style={{ margin: "0 18px 16px" }}>
            <span>
              <b>ফি ইভেন্ট মডেল:</b> ইভেন্ট প্রকাশ করলেই সংশ্লিষ্ট শ্রেণির প্রতিটি
              শিক্ষার্থীর জন্য বকেয়া তৈরি হয়; আদায় ট্যাব থেকে পেমেন্ট নিলে রসিদ তৈরি হয়।
            </span>
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="card">
          <div className="chead">
            <h3 className="ct">{editingId ? "ফি ইভেন্ট সম্পাদনা" : "নতুন ফি ইভেন্ট"}</h3>
          </div>
          <div className="fgrid">
            <div>
              <label className="lbl">
                ইভেন্টের নাম <span className="req">*</span>
              </label>
              <Input
                className="inp"
                placeholder="যেমন: জানুয়ারি মাসের বেতন"
                value={form.nameBn}
                onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">ফির ধরন</label>
              <Select
                className="sel"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="full">
              <label className="lbl">বিবরণ</label>
              <RichTextEditor
                value={form.description}
                onChange={(description) => setForm({ ...form, description })}
              />
            </div>
            <div>
              <label className="lbl">
                পরিশোধের শেষ তারিখ <span className="req">*</span>
              </label>
              <Input
                className="inp"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">বিলম্ব ফি (টাকা)</label>
              <Input
                className="inp num"
                type="number"
                min="0"
                placeholder="০"
                value={form.lateFeeTaka}
                onChange={(e) => setForm({ ...form, lateFeeTaka: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="lbl">
              শ্রেণিভেদে ফির পরিমাণ (টাকা) <span className="req">*</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {classRows.map((row, index) => (
                <div className="rowflex" key={index}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <Select
                      className="sel"
                      value={row.classId}
                      onChange={(e) => {
                        const next = [...classRows];
                        next[index] = { ...row, classId: e.target.value };
                        setClassRows(next);
                      }}
                    >
                      <option value="">শ্রেণি নির্বাচন করুন</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.nameBn}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ width: 180 }}>
                    <Input
                      className="inp num"
                      type="number"
                      min="0"
                      placeholder="টাকার পরিমাণ"
                      value={row.amountTaka}
                      onChange={(e) => {
                        const next = [...classRows];
                        next[index] = { ...row, amountTaka: e.target.value };
                        setClassRows(next);
                      }}
                    />
                  </div>
                  <Button
                    className="btn gho sm"
                    disabled={classRows.length <= 1}
                    onClick={() =>
                      setClassRows(classRows.filter((_, i) => i !== index))
                    }
                  >
                    সরান
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="btn gho sm"
              style={{ marginTop: 10 }}
              onClick={() =>
                setClassRows([...classRows, { classId: "", amountTaka: "" }])
              }
            >
              আরেকটি শ্রেণি যোগ করুন
            </Button>
          </div>

          <div className="rowflex" style={{ marginTop: 18 }}>
            <label className="sw">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              <span className="tr" />
            </label>
            <span className="small">প্রকাশসহ সংরক্ষণ (প্রকাশ করলেই বকেয়া তৈরি হবে)</span>
          </div>

          {error && <p className="alert r" style={{ marginTop: 14 }}>{error}</p>}

          <div className="rowflex" style={{ marginTop: 20 }}>
            <Button className="btn gho" onClick={() => setView("list")}>
              বাতিল
            </Button>
            <Button className="btn grn" onClick={() => void saveEvent()}>
              {form.isPublished ? "প্রকাশসহ সংরক্ষণ করুন" : "সংরক্ষণ করুন"}
            </Button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            বিস্তারিত রিপোর্টের জন্য <Link href="/dashboard/reports">রিপোর্টসমূহ</Link> দেখুন।
          </p>
        </div>
      )}

      {view === "collection" && (
        <>
          <div className="card filterbar">
            <div className="fld">
              <label className="lbl">শ্রেণি</label>
              <Select
                className="sel"
                value={filters.classId}
                onChange={(e) =>
                  setFilters({ ...filters, classId: e.target.value, sectionId: "" })
                }
              >
                <option value="">সব শ্রেণি</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.nameBn}
                  </option>
                ))}
              </Select>
            </div>
            <div className="fld">
              <label className="lbl">শাখা</label>
              <Select
                className="sel"
                value={filters.sectionId}
                onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
              >
                <option value="">সব শাখা</option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.nameBn}
                    {section.classNameBn ? ` (${section.classNameBn})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="fld">
              <label className="lbl">অবস্থা</label>
              <Select
                className="sel"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">সব</option>
                <option value="DUE">বকেয়া</option>
                <option value="PARTIAL">আংশিক</option>
                <option value="PAID">পরিশোধিত</option>
              </Select>
            </div>
            <Button className="btn" onClick={() => void loadDues()}>
              খুঁজুন
            </Button>
            <Button
              className="btn gho"
              onClick={() => {
                const cleared = { classId: "", sectionId: "", status: "" };
                setFilters(cleared);
                void loadDues(cleared);
              }}
            >
              সব দেখুন
            </Button>
          </div>

          <div className="card flush">
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>শিক্ষার্থী</th>
                    <th>ইভেন্ট</th>
                    <th>শ্রেণি-শাখা</th>
                    <th className="r">মোট</th>
                    <th className="r">পরিশোধিত</th>
                    <th className="r">বাকি</th>
                    <th>অবস্থা</th>
                    <th className="r">কার্যকলাপ</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map((row) => {
                    const remaining = row.amount - row.paidAmount;
                    return (
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
                        <td>{row.eventNameBn ?? "—"}</td>
                        <td>
                          {row.classNameBn ?? "—"}
                          {row.sectionNameBn ? ` · ${row.sectionNameBn}` : ""}
                        </td>
                        <td className="r num">{takaLabel(row.amount)}</td>
                        <td className="r num">{takaLabel(row.paidAmount)}</td>
                        <td className="r num b">{takaLabel(remaining)}</td>
                        <td>{statusChip(row.status)}</td>
                        <td className="r">
                          {row.status === "DUE" || row.status === "PARTIAL" ? (
                            <Button className="btn sm" onClick={() => openPayment(row)}>
                              পেমেন্ট নিন
                            </Button>
                          ) : (
                            <span className="small muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!dues.length && (
              <div className="admin-empty">এই ফিল্টারে কোনো বকেয়া নেই।</div>
            )}
          </div>
        </>
      )}

      {payDue && (
        <div className="modal-wrap" style={{ position: "fixed", zIndex: 60 }}>
          <div className="modal">
            {!receipt ? (
              <>
                <div className="mhead">
                  <h3 className="ct" style={{ margin: 0 }}>
                    পেমেন্ট গ্রহণ করুন
                  </h3>
                  <span style={{ flex: 1 }} />
                  <Button className="btn gho sm" onClick={() => setPayDue(null)}>
                    বন্ধ করুন
                  </Button>
                </div>
                <p className="cs" style={{ margin: "0 0 12px" }}>
                  {payDue.studentNameBn ?? "শিক্ষার্থী"}
                  {payDue.registrationNumber
                    ? ` (${bn(payDue.registrationNumber)})`
                    : ""}{" "}
                  · {payDue.eventNameBn ?? ""} · মোট {takaLabel(payDue.amount)} ·
                  পরিশোধিত {takaLabel(payDue.paidAmount)} · বাকি{" "}
                  {takaLabel(payDue.amount - payDue.paidAmount)}
                </p>
                <div className="fgrid">
                  <div>
                    <label className="lbl">
                      পরিমাণ (টাকা) <span className="req">*</span>
                    </label>
                    <Input
                      className="inp num"
                      type="number"
                      min="0"
                      value={payForm.amountTaka}
                      onChange={(e) =>
                        setPayForm({ ...payForm, amountTaka: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="lbl">মাধ্যম</label>
                    <Select
                      className="sel"
                      value={payForm.method}
                      onChange={(e) =>
                        setPayForm({ ...payForm, method: e.target.value })
                      }
                    >
                      {METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="lbl">তারিখ</label>
                    <Input
                      className="inp"
                      type="date"
                      value={payForm.paidAt}
                      onChange={(e) =>
                        setPayForm({ ...payForm, paidAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                {error && <p className="alert r" style={{ marginTop: 12 }}>{error}</p>}
                <div className="rowflex" style={{ marginTop: 16 }}>
                  <Button
                    className="btn grn"
                    disabled={paying}
                    onClick={() => void submitPayment()}
                  >
                    {paying ? "প্রক্রিয়াকরণ চলছে…" : "পেমেন্ট গ্রহণ করুন"}
                  </Button>
                  <Button className="btn gho" onClick={() => setPayDue(null)}>
                    বাতিল
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mhead">
                  <h3 className="ct" style={{ margin: 0 }}>
                    পেমেন্ট সফল হয়েছে
                  </h3>
                  <span style={{ flex: 1 }} />
                  <Button className="btn gho sm" onClick={() => setPayDue(null)}>
                    বন্ধ করুন
                  </Button>
                </div>
                <div className="receipt" style={{ marginTop: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <b style={{ color: "var(--p800)" }}>
                      {schoolName || "বিদ্যালয়"}
                    </b>
                    <div className="small muted">টাকা গ্রহণের রশিদ</div>
                  </div>
                  <div className="divider" style={{ margin: "9px 0" }} />
                  <div className="rowflex" style={{ justifyContent: "space-between" }}>
                    <span>
                      রশিদ নং: <b className="num">{bn(receipt.receiptNumber)}</b>
                    </span>
                    <span>তারিখ: {bnDate(receipt.paidAt)}</span>
                  </div>
                  <div className="rowflex" style={{ justifyContent: "space-between" }}>
                    <span>
                      শিক্ষার্থী: {receipt.studentNameBn ?? "—"}
                      {receipt.classNameBn ? ` · ${receipt.classNameBn}` : ""}
                      {receipt.sectionNameBn ? ` (${receipt.sectionNameBn})` : ""}
                    </span>
                    <span className="num">
                      রেজি: {bn(receipt.registrationNumber ?? "—")}
                    </span>
                  </div>
                  <div className="rowflex" style={{ justifyContent: "space-between" }}>
                    <span>বিবরণ: {receipt.eventNameBn ?? "—"}</span>
                    <b>{takaLabel(takaToPaisa(receipt.amountTaka))}</b>
                  </div>
                  <div className="rowflex" style={{ justifyContent: "space-between" }}>
                    <span>
                      মোট পরিশোধিত: {takaLabel(receipt.paidAmount)} · বাকি:{" "}
                      {takaLabel(receipt.remaining)}
                    </span>
                    <span>মাধ্যম: {receipt.method}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 8 }}>
                    যাচাই কোড: <span className="num">{bn(receipt.verifyCode)}</span> ·
                    ওয়েবসাইটের &quot;রশিদ যাচাই&quot; পেজে এই কোড দিয়ে রশিদের সত্যতা
                    যাচাই করা যায়।
                  </div>
                </div>
                <div className="rowflex" style={{ marginTop: 16 }}>
                  <Button className="btn" onClick={() => window.print()}>
                    প্রিন্ট
                  </Button>
                  <Button
                    className="btn gho"
                    onClick={() => {
                      setPayDue(null);
                      setReceipt(null);
                    }}
                  >
                    বন্ধ করুন
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
