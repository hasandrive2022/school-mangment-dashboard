"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WEEKDAYS_BN, bn, bnNum } from "@/lib/format";

type Row = Record<string, unknown> & { id: string };

function rowsOf(p: unknown): Row[] {
  if (Array.isArray(p)) return p as Row[];
  if (p && typeof p === "object") {
    const d = (p as { data?: unknown }).data;
    if (Array.isArray(d)) return d as Row[];
  }
  return [];
}

async function errMsg(res: Response, fallback: string): Promise<string> {
  try {
    const p = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(p.message)) return p.message.join(" ");
    if (typeof p.message === "string" && p.message) return p.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

const schoolDays = [0, 1, 2, 3, 4];

export default function RoutinePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [sections, setSections] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Row[]>([]);
  const [form, setForm] = useState({
    classId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "0",
    period: "1",
    room: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRoutine() {
    const res = await fetch("/api/backend/routine");
    setRows(rowsOf(await res.json()));
  }

  useEffect(() => {
    void (async () => {
      const [c, s, sub, t] = await Promise.all([
        fetch("/api/backend/academics/classes").then((r) => r.json()).catch(() => null),
        fetch("/api/backend/academics/sections").then((r) => r.json()).catch(() => null),
        fetch("/api/backend/academics/subjects").then((r) => r.json()).catch(() => null),
        fetch("/api/backend/people/teachers").then((r) => r.json()).catch(() => null),
      ]);
      setClasses(rowsOf(c));
      setSections(rowsOf(s));
      setSubjects(rowsOf(sub));
      setTeachers(rowsOf(t));
      await loadRoutine();
    })();
  }, []);

  const filteredSections = useMemo(
    () => sections.filter((s) => !form.classId || str(s.classId) === form.classId),
    [sections, form.classId],
  );

  function resetForm() {
    setForm({
      classId: "",
      sectionId: "",
      subjectId: "",
      teacherId: "",
      dayOfWeek: "0",
      period: "1",
      room: "",
    });
    setEditingId(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const value: Record<string, unknown> = {
      classId: form.classId,
      dayOfWeek: Number(form.dayOfWeek),
      period: Number(form.period),
    };
    if (form.sectionId) value.sectionId = form.sectionId;
    if (form.subjectId) value.subjectId = form.subjectId;
    if (form.teacherId) value.teacherId = form.teacherId;
    if (form.room.trim()) value.room = form.room.trim();

    const res = editingId
      ? await fetch(`/api/backend/routine/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        })
      : await fetch("/api/backend/routine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
    if (!res.ok) {
      setError(await errMsg(res, "রুটিন সংরক্ষণ করা যায়নি"));
      return;
    }
    setMessage(editingId ? "স্লট সংশোধন হয়েছে" : "রুটিন স্লট যোগ হয়েছে");
    resetForm();
    await loadRoutine();
  }

  function startEdit(row: Row) {
    setError("");
    setMessage("");
    setEditingId(row.id);
    setForm({
      classId: str(row.classId),
      sectionId: str(row.sectionId),
      subjectId: str(row.subjectId),
      teacherId: str(row.teacherId),
      dayOfWeek: str(row.dayOfWeek ?? "0"),
      period: str(row.period ?? "1"),
      room: str(row.room),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <div className="rowflex" style={{ gap: 9 }}>
            <span className="ic-wrap" style={{ width: 38, height: 38, flexBasis: 38 }}>
              <CalendarClock className="ic" />
            </span>
            <div>
              <h2 className="dpage-title">ক্লাস রুটিন</h2>
              <p className="cs">দিন ও পিরিয়ড অনুযায়ী স্লট তৈরি করুন — মোট {bnNum(rows.length)}টি স্লট</p>
            </div>
          </div>
        </div>
        <span className="sp" />
        {editingId && (
          <span className="chip w">সম্পাদনা চলছে</span>
        )}
      </div>

      <div className="card">
        <div className="chead">
          <div>
            <h3 className="ct">{editingId ? "স্লট সম্পাদনা" : "নতুন রুটিন স্লট"}</h3>
            <p className="cs">শ্রেণি, শাখা, বিষয় ও শিক্ষক নির্বাচন করে স্লট সাজান</p>
          </div>
          <span className="sp" />
          {editingId && (
            <Button type="button" variant="ghost" className="btn gho sm" onClick={() => { resetForm(); setError(""); setMessage(""); }}>
              <X className="ic" /> বাতিল
            </Button>
          )}
        </div>
        <form onSubmit={(e) => void submit(e)}>
          <div className="fgrid">
            <div>
              <label className="lbl" htmlFor="rt-class">শ্রেণি <span className="req">*</span></label>
              <Select id="rt-class" className="sel" required value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "" })}>
                <option value="">শ্রেণি নির্বাচন করুন</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>{str(row.nameBn)}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="rt-section">শাখা</label>
              <Select id="rt-section" className="sel" value={form.sectionId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
                <option value="">শাখা নির্বাচন করুন (ঐচ্ছিক)</option>
                {filteredSections.map((row) => (
                  <option key={row.id} value={row.id}>
                    {str(row.nameBn)}{row.classNameBn ? ` — ${str(row.classNameBn)}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="rt-subject">বিষয়</label>
              <Select id="rt-subject" className="sel" value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">বিষয় নির্বাচন করুন</option>
                {subjects.map((row) => (
                  <option key={row.id} value={row.id}>{str(row.nameBn)}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="rt-teacher">শিক্ষক</label>
              <Select id="rt-teacher" className="sel" value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">শিক্ষক নির্বাচন করুন</option>
                {teachers.map((row) => {
                  const label = [str(row.nameBn) || str(row.displayNameBn), str(row.teacherCode)]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <option key={row.id} value={row.id}>{label || "শিক্ষক"}</option>
                  );
                })}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="rt-day">দিন <span className="req">*</span></label>
              <Select id="rt-day" className="sel" value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                {schoolDays.map((d) => (
                  <option key={d} value={d}>{WEEKDAYS_BN[d]}</option>
                ))}
              </Select>
            </div>
            <div className="rowflex" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="lbl" htmlFor="rt-period">পিরিয়ড <span className="req">*</span></label>
                <Input id="rt-period" className="inp" type="number" min="1" max="10" required
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl" htmlFor="rt-room">কক্ষ</label>
                <Input id="rt-room" className="inp" placeholder="যেমন: ২০১"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="rowflex" style={{ marginTop: 14 }}>
            <Button type="submit" className="btn">
              <Plus className="ic" /> {editingId ? "সংরক্ষণ করুন" : "স্লট সংরক্ষণ করুন"}
            </Button>
            {message && <span className="small grn-t b">{message}</span>}
          </div>
          {error && <p className="alert r" style={{ marginTop: 12 }}>{error}</p>}
        </form>
      </div>

      <div className="card">
        <div className="chead">
          <div>
            <h3 className="ct">সাপ্তাহিক রুটিন প্রিভিউ</h3>
            <p className="cs">স্লটে ক্লিক করলে সম্পাদনা করা যাবে</p>
          </div>
        </div>
        <div className="tw">
          <table className="routine">
            <thead>
              <tr>
                {schoolDays.map((d) => (
                  <th key={d}>{WEEKDAYS_BN[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {schoolDays.map((d) => {
                  const dayRows = rows
                    .filter((r) => Number(r.dayOfWeek) === d)
                    .sort((a, b) => Number(a.period) - Number(b.period));
                  return (
                    <td key={d} style={{ verticalAlign: "top", textAlign: "left", minWidth: 170 }}>
                      {dayRows.length === 0 ? (
                        <p className="admin-empty">স্লট নেই</p>
                      ) : (
                        dayRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => startEdit(row)}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              background: editingId === row.id ? "var(--p100)" : "var(--p50)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "7px 9px",
                              marginBottom: 6,
                              cursor: "pointer",
                              font: "inherit",
                            }}
                          >
                            <span className="rowflex" style={{ gap: 6, justifyContent: "space-between" }}>
                              <b className="num">{bn(str(row.period))} · {str(row.subjectNameBn) || "বিষয় নেই"}</b>
                              <Pencil className="ic sm muted" />
                            </span>
                            <span className="small muted" style={{ display: "block" }}>
                              {str(row.classNameBn) || "—"}
                              {row.sectionNameBn ? ` · ${str(row.sectionNameBn)}` : ""}
                            </span>
                            <span className="small muted" style={{ display: "block" }}>
                              {str(row.teacherNameBn) || "শিক্ষক নেই"}
                              {row.teacherCode ? ` (${str(row.teacherCode)})` : ""}
                              {row.room ? ` · কক্ষ ${bn(str(row.room))}` : ""}
                            </span>
                          </button>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
