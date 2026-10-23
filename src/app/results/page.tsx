"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bn, bnDate, bnNum } from "@/lib/format";

type Row = Record<string, unknown> & { id: string };

type ScaleRow = {
  id: string;
  minMarks: number;
  maxMarks: number;
  letter: string;
  gpa: string | number;
  orderIndex?: number;
};

type ExamRow = Row & {
  nameBn: string;
  sessionId?: string;
  classId?: string;
  examType?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  isPublished: boolean;
  publishAt?: string | null;
  countdownEnabled?: boolean;
  failAnySubject?: boolean;
  classNameBn?: string;
  sessionName?: string;
  sessionYear?: number | string;
};

type ExamSubjectRow = {
  id: string;
  examId: string;
  subjectId: string;
  subjectNameBn?: string;
  fullMarks: number;
  passMarks: number;
  cqMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
};

function rowsOf<T>(p: unknown): T[] {
  if (Array.isArray(p)) return p as T[];
  if (p && typeof p === "object") {
    const d = (p as { data?: unknown }).data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}

function dataOf<T>(p: unknown): T | null {
  if (p && typeof p === "object" && "data" in p) {
    return (p as { data: T }).data;
  }
  return (p as T) ?? null;
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

function toDateTimeLocal(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const examTypes: Array<[string, string]> = [
  ["half-yearly", "অর্ধ-বার্ষিক"],
  ["annual", "বার্ষিক"],
  ["monthly", "মাসিক"],
  ["weekly", "সাপ্তাহিক"],
  ["other", "অন্যান্য"],
];

const resultTabs = [
  ["exams", "পরীক্ষা"],
  ["processing", "রেজাল্ট প্রসেসিং"],
  ["grading", "গ্রেডিং স্কেল"],
] as const;
type ResultTab = (typeof resultTabs)[number][0];

export default function ResultsPage() {
  const [tab, setTab] = useState<ResultTab>("exams");
  const [scale, setScale] = useState<ScaleRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // exam create form
  const [examForm, setExamForm] = useState({
    nameBn: "",
    sessionId: "",
    classId: "",
    examType: "half-yearly",
    startsAt: "",
    endsAt: "",
    failAnySubject: true,
  });

  // exam subjects panel
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubjectRow[]>([]);
  const [esForm, setEsForm] = useState({
    subjectId: "",
    fullMarks: "100",
    passMarks: "33",
    cqMarks: "0",
    mcqMarks: "0",
    practicalMarks: "0",
  });

  // processing
  const [processExamId, setProcessExamId] = useState("");
  const [processClassId, setProcessClassId] = useState("");
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({});
  const [scheduleCountdown, setScheduleCountdown] = useState<Record<string, boolean>>({});

  // grading
  const [newScale, setNewScale] = useState({
    minMarks: "",
    maxMarks: "",
    letter: "",
    gpa: "",
  });

  async function loadAll() {
    const [scalesRes, examsRes, sessRes, clsRes, subRes] = await Promise.all([
      fetch("/api/backend/results/grading-scales").then((r) => r.json()).catch(() => null),
      fetch("/api/backend/results/exams").then((r) => r.json()).catch(() => null),
      fetch("/api/backend/academics/sessions").then((r) => r.json()).catch(() => null),
      fetch("/api/backend/academics/classes").then((r) => r.json()).catch(() => null),
      fetch("/api/backend/academics/subjects").then((r) => r.json()).catch(() => null),
    ]);
    setScale(rowsOf<ScaleRow>(scalesRes));
    setExams(rowsOf<ExamRow>(examsRes));
    setSessions(rowsOf<Row>(sessRes));
    setClasses(rowsOf<Row>(clsRes));
    setSubjects(rowsOf<Row>(subRes));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sortedScale = useMemo(
    () => [...scale].sort((a, b) => Number(a.minMarks) - Number(b.minMarks)),
    [scale],
  );

  const processExam = useMemo(
    () => exams.find((e) => e.id === processExamId) ?? null,
    [exams, processExamId],
  );

  // Note: the processing-class dropdown defaults to the selected exam's
  // class inside the exam dropdown's onChange handler (no effect needed).

  async function loadExamSubjects(examId: string) {
    const res = await fetch(`/api/backend/results/exam-subjects?examId=${encodeURIComponent(examId)}`);
    setExamSubjects(rowsOf<ExamSubjectRow>(await res.json()));
  }

  async function toggleSubjects(exam: ExamRow) {
    if (expandedExamId === exam.id) {
      setExpandedExamId(null);
      setExamSubjects([]);
      return;
    }
    setExpandedExamId(exam.id);
    await loadExamSubjects(exam.id);
  }

  async function createExam(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const value: Record<string, unknown> = {
      nameBn: examForm.nameBn.trim(),
      sessionId: examForm.sessionId,
      classId: examForm.classId,
      examType: examForm.examType,
      failAnySubject: examForm.failAnySubject,
    };
    if (examForm.startsAt) value.startsAt = examForm.startsAt;
    if (examForm.endsAt) value.endsAt = examForm.endsAt;
    const res = await fetch("/api/backend/results/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      setError(await errMsg(res, "পরীক্ষা তৈরি করা যায়নি"));
      return;
    }
    setMessage("পরীক্ষা তৈরি হয়েছে");
    setExamForm({
      nameBn: "",
      sessionId: "",
      classId: "",
      examType: "half-yearly",
      startsAt: "",
      endsAt: "",
      failAnySubject: true,
    });
    await loadAll();
  }

  async function addExamSubject(event: FormEvent) {
    event.preventDefault();
    if (!expandedExamId) return;
    setError("");
    setMessage("");
    const res = await fetch("/api/backend/results/exam-subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: expandedExamId,
        subjectId: esForm.subjectId,
        fullMarks: Number(esForm.fullMarks || 0),
        passMarks: Number(esForm.passMarks || 0),
        cqMarks: Number(esForm.cqMarks || 0),
        mcqMarks: Number(esForm.mcqMarks || 0),
        practicalMarks: Number(esForm.practicalMarks || 0),
      }),
    });
    if (!res.ok) {
      setError(await errMsg(res, "বিষয় কনফিগ সংরক্ষণ করা যায়নি"));
      return;
    }
    setMessage("বিষয় কনফিগ সংরক্ষিত হয়েছে");
    await loadExamSubjects(expandedExamId);
  }

  async function removeExamSubject(id: string) {
    if (!window.confirm("এই বিষয়ের কনফিগ মুছে ফেলতে চান?")) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/backend/results/exam-subjects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await errMsg(res, "মুছে ফেলা যায়নি"));
      return;
    }
    if (expandedExamId) await loadExamSubjects(expandedExamId);
  }

  async function processResults() {
    if (!processExamId || !processClassId) {
      setError("পরীক্ষা ও শ্রেণি নির্বাচন করুন");
      return;
    }
    setError("");
    setMessage("");
    setProcessedCount(null);
    const res = await fetch(
      `/api/backend/results/exams/${processExamId}/process/${processClassId}`,
      { method: "POST" },
    );
    if (!res.ok) {
      setError(await errMsg(res, "ফলাফল প্রসেস করা যায়নি"));
      return;
    }
    const payload: unknown = await res.json();
    const data = dataOf<{ processed: number }>(payload);
    const count = typeof data?.processed === "number" ? data.processed : 0;
    setProcessedCount(count);
    setMessage(`মোট ${bnNum(count)} জনের ফলাফল প্রসেস হয়েছে`);
    await loadAll();
  }

  async function publishNow(id: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/backend/results/exams/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setError(await errMsg(res, "প্রকাশ করা যায়নি"));
      return;
    }
    setMessage("ফলাফল প্রকাশিত হয়েছে");
    await loadAll();
  }

  async function publishSchedule(id: string) {
    const at = scheduleAt[id];
    if (!at) {
      setError("প্রকাশের তারিখ ও সময় দিন");
      return;
    }
    setError("");
    setMessage("");
    const res = await fetch(`/api/backend/results/exams/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publishAt: new Date(at).toISOString(),
        countdownEnabled: Boolean(scheduleCountdown[id]),
      }),
    });
    if (!res.ok) {
      setError(await errMsg(res, "নির্ধারণ করা যায়নি"));
      return;
    }
    setMessage("প্রকাশের সময় নির্ধারণ করা হয়েছে");
    await loadAll();
  }

  async function addScale(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/backend/results/grading-scales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: {
          minMarks: Number(newScale.minMarks),
          maxMarks: Number(newScale.maxMarks),
          letter: newScale.letter.trim(),
          gpa: Number(newScale.gpa),
        },
      }),
    });
    if (!res.ok) {
      setError(await errMsg(res, "গ্রেডিং স্কেল সংরক্ষণ করা যায়নি — পরিসর যাচাই করুন"));
      return;
    }
    setMessage("গ্রেডিং স্কেল সংরক্ষিত হয়েছে");
    setNewScale({ minMarks: "", maxMarks: "", letter: "", gpa: "" });
    await loadAll();
  }

  function examStatus(exam: ExamRow) {
    if (exam.isPublished) return <span className="chip g">প্রকাশিত</span>;
    if (exam.publishAt) {
      return <span className="chip w">নির্ধারিত: {bnDate(exam.publishAt)}</span>;
    }
    return <span className="chip gr">খসড়া</span>;
  }

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">ফলাফল ব্যবস্থাপনা</h2>
          <p className="cs">পরীক্ষা, রেজাল্ট প্রসেসিং, প্রকাশ ও গ্রেডিং স্কেল</p>
        </div>
      </div>

      <div className="tabs">
        {resultTabs.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            className={tab === key ? "on" : ""}
            onClick={() => { setTab(key); setError(""); setMessage(""); }}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && <p className="alert r">{error}</p>}
      {message && <p className="alert g">{message}</p>}

      {tab === "exams" && (
        <>
          <div className="card">
            <div className="chead">
              <div>
                <h3 className="ct">পরীক্ষা ফর্ম — নতুন পরীক্ষা</h3>
                <p className="cs">নাম, সেশন, শ্রেণি ও সময়কাল দিয়ে পরীক্ষা তৈরি করুন</p>
              </div>
            </div>
            <form onSubmit={(e) => void createExam(e)}>
              <div className="fgrid">
                <div>
                  <label className="lbl" htmlFor="ex-name">নাম <span className="req">*</span></label>
                  <Input id="ex-name" className="inp" required placeholder="যেমন: অর্ধ-বার্ষিক পরীক্ষা ২০২৬"
                    value={examForm.nameBn}
                    onChange={(e) => setExamForm({ ...examForm, nameBn: e.target.value })} />
                </div>
                <div>
                  <label className="lbl" htmlFor="ex-type">ধরন</label>
                  <Select id="ex-type" className="sel" value={examForm.examType}
                    onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}>
                    {examTypes.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="lbl" htmlFor="ex-session">সেশন <span className="req">*</span></label>
                  <Select id="ex-session" className="sel" required value={examForm.sessionId}
                    onChange={(e) => setExamForm({ ...examForm, sessionId: e.target.value })}>
                    <option value="">সেশন নির্বাচন করুন</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {str(s.name) || bn(str(s.year))}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="lbl" htmlFor="ex-class">শ্রেণি <span className="req">*</span></label>
                  <Select id="ex-class" className="sel" required value={examForm.classId}
                    onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}>
                    <option value="">শ্রেণি নির্বাচন করুন</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{str(c.nameBn)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="lbl" htmlFor="ex-start">শুরুর তারিখ</label>
                  <Input id="ex-start" className="inp" type="date" value={examForm.startsAt}
                    onChange={(e) => setExamForm({ ...examForm, startsAt: e.target.value })} />
                </div>
                <div>
                  <label className="lbl" htmlFor="ex-end">শেষ তারিখ</label>
                  <Input id="ex-end" className="inp" type="date" value={examForm.endsAt}
                    onChange={(e) => setExamForm({ ...examForm, endsAt: e.target.value })} />
                </div>
              </div>
              <div className="rowflex" style={{ marginTop: 14 }}>
                <label className="sw blue">
                  <input type="checkbox" checked={examForm.failAnySubject}
                    onChange={(e) => setExamForm({ ...examForm, failAnySubject: e.target.checked })} />
                  <span className="tr" />
                </label>
                <span className="small b">যেকোনো বিষয়ে ফেল = ফেল</span>
                <span className="sp" />
                <Button type="submit" className="btn">
                  <Plus className="ic" /> পরীক্ষা সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>

          <div className="card flush">
            <div className="chead" style={{ padding: "18px 18px 6px" }}>
              <div>
                <h3 className="ct">পরীক্ষাসমূহ</h3>
                <p className="cs">মোট {bnNum(exams.length)}টি পরীক্ষা</p>
              </div>
            </div>
            {exams.length === 0 ? (
              <p className="admin-empty" style={{ margin: "0 18px 18px" }}>কোনো পরীক্ষা নেই।</p>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>নাম</th>
                      <th>শ্রেণি</th>
                      <th>সেশন</th>
                      <th>সময়কাল</th>
                      <th>অবস্থা</th>
                      <th className="r">বিষয় কনফিগ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <Fragment key={exam.id}>
                        <tr>
                          <td><b>{exam.nameBn}</b></td>
                          <td>{exam.classNameBn || "—"}</td>
                          <td>{exam.sessionName || (exam.sessionYear ? bn(str(exam.sessionYear)) : "—")}</td>
                          <td className="num">
                            {exam.startsAt || exam.endsAt
                              ? `${bnDate(exam.startsAt)} – ${bnDate(exam.endsAt)}`
                              : "—"}
                          </td>
                          <td>{examStatus(exam)}</td>
                          <td className="r">
                            <Button type="button" variant="ghost" className="btn gho sm"
                              onClick={() => void toggleSubjects(exam)}>
                              {expandedExamId === exam.id ? <ChevronUp className="ic" /> : <ChevronDown className="ic" />}
                              বিষয়সমূহ
                            </Button>
                          </td>
                        </tr>
                        {expandedExamId === exam.id && (
                          <tr>
                            <td colSpan={6} style={{ background: "var(--p50)" }}>
                              <div style={{ padding: "6px 2px" }}>
                                <h4 className="ct" style={{ fontSize: 15 }}>বিষয়ভিত্তিক পূর্ণমান ও পাস নম্বর — {exam.nameBn}</h4>
                                {examSubjects.length === 0 ? (
                                  <p className="admin-empty">এই পরীক্ষার জন্য কোনো বিষয় কনফিগ নেই।</p>
                                ) : (
                                  <div className="tw">
                                    <table className="tbl" style={{ minWidth: 0 }}>
                                      <thead>
                                        <tr>
                                          <th>বিষয়</th>
                                          <th className="c">পূর্ণ নম্বর</th>
                                          <th className="c">পাস নম্বর</th>
                                          <th className="c">সৃজনশীল</th>
                                          <th className="c">বহুনির্বাচনি</th>
                                          <th className="c">ব্যবহারিক</th>
                                          <th className="r">কার্যকলাপ</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {examSubjects.map((es) => (
                                          <tr key={es.id}>
                                            <td><b>{es.subjectNameBn || "—"}</b></td>
                                            <td className="c num">{bnNum(Number(es.fullMarks))}</td>
                                            <td className="c num">{bnNum(Number(es.passMarks))}</td>
                                            <td className="c num">{bnNum(Number(es.cqMarks ?? 0))}</td>
                                            <td className="c num">{bnNum(Number(es.mcqMarks ?? 0))}</td>
                                            <td className="c num">{bnNum(Number(es.practicalMarks ?? 0))}</td>
                                            <td className="r">
                                              <button type="button" className="ibtn del" title="মুছুন"
                                                onClick={() => void removeExamSubject(es.id)}>
                                                <Trash2 className="ic" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                <form onSubmit={(e) => void addExamSubject(e)} style={{ marginTop: 12 }}>
                                  <div className="f3">
                                    <div>
                                      <label className="lbl" htmlFor="es-subject">বিষয়</label>
                                      <Select id="es-subject" className="sel" required value={esForm.subjectId}
                                        onChange={(e) => setEsForm({ ...esForm, subjectId: e.target.value })}>
                                        <option value="">বিষয় নির্বাচন করুন</option>
                                        {subjects.map((s) => (
                                          <option key={s.id} value={s.id}>{str(s.nameBn)}</option>
                                        ))}
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="lbl" htmlFor="es-full">পূর্ণ নম্বর</label>
                                      <Input id="es-full" className="inp" type="number" value={esForm.fullMarks}
                                        onChange={(e) => setEsForm({ ...esForm, fullMarks: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="lbl" htmlFor="es-pass">পাস নম্বর</label>
                                      <Input id="es-pass" className="inp" type="number" value={esForm.passMarks}
                                        onChange={(e) => setEsForm({ ...esForm, passMarks: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="lbl" htmlFor="es-cq">সৃজনশীল (CQ)</label>
                                      <Input id="es-cq" className="inp" type="number" value={esForm.cqMarks}
                                        onChange={(e) => setEsForm({ ...esForm, cqMarks: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="lbl" htmlFor="es-mcq">বহুনির্বাচনি (MCQ)</label>
                                      <Input id="es-mcq" className="inp" type="number" value={esForm.mcqMarks}
                                        onChange={(e) => setEsForm({ ...esForm, mcqMarks: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="lbl" htmlFor="es-prac">ব্যবহারিক</label>
                                      <Input id="es-prac" className="inp" type="number" value={esForm.practicalMarks}
                                        onChange={(e) => setEsForm({ ...esForm, practicalMarks: e.target.value })} />
                                    </div>
                                  </div>
                                  <div className="rowflex" style={{ marginTop: 10 }}>
                                    <Button type="submit" className="btn sm">
                                      <Plus className="ic" /> বিষয় যোগ করুন
                                    </Button>
                                  </div>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "processing" && (
        <>
          <div className="card">
            <div className="chead">
              <div>
                <h3 className="ct">রেজাল্ট প্রসেস করুন</h3>
                <p className="cs">পরীক্ষা ও শ্রেণি নির্বাচন করে প্রসেস চালান</p>
              </div>
            </div>
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="pr-exam">পরীক্ষা</label>
                <Select id="pr-exam" className="sel" value={processExamId}
                  onChange={(e) => {
                    setProcessExamId(e.target.value);
                    const ex = exams.find((x) => x.id === e.target.value);
                    setProcessClassId(ex ? str(ex.classId) : "");
                    setProcessedCount(null);
                  }}>
                  <option value="">পরীক্ষা নির্বাচন করুন</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.nameBn}{ex.classNameBn ? ` — ${ex.classNameBn}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="lbl" htmlFor="pr-class">শ্রেণি</label>
                <Select id="pr-class" className="sel" value={processClassId}
                  onChange={(e) => setProcessClassId(e.target.value)}>
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{str(c.nameBn)}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="rowflex" style={{ marginTop: 14 }}>
              <Button type="button" className="btn" onClick={() => void processResults()}>
                রেজাল্ট প্রসেস করুন
              </Button>
              {processExam && (
                <span className="small muted">
                  বর্তমান অবস্থা: {processExam.isPublished ? "প্রকাশিত" : processExam.publishAt ? `নির্ধারিত (${bnDate(processExam.publishAt)})` : "খসড়া"}
                </span>
              )}
            </div>
            {processedCount !== null && (
              <p className="alert g" style={{ marginTop: 12 }}>
                মোট {bnNum(processedCount)} জনের ফলাফল প্রসেস হয়েছে
              </p>
            )}
          </div>

          <div className="card flush">
            <div className="chead" style={{ padding: "18px 18px 6px" }}>
              <div>
                <h3 className="ct">ফলাফল প্রকাশের নিয়ন্ত্রণ</h3>
                <p className="cs">এখনই প্রকাশ করুন অথবা নির্ধারিত সময়ে প্রকাশের জন্য সাজান</p>
              </div>
            </div>
            {exams.length === 0 ? (
              <p className="admin-empty" style={{ margin: "0 18px 18px" }}>কোনো পরীক্ষা নেই।</p>
            ) : (
              <div style={{ padding: "0 18px 18px" }}>
                {exams.map((exam) => (
                  <div className="listrow" key={exam.id} style={{ flexWrap: "wrap" }}>
                    <div className="grow">
                      <b>{exam.nameBn}</b>
                      <div className="small muted">
                        {exam.classNameBn || "—"}
                        {exam.startsAt || exam.endsAt
                          ? ` · ${bnDate(exam.startsAt)} – ${bnDate(exam.endsAt)}`
                          : ""}
                      </div>
                    </div>
                    {examStatus(exam)}
                    <Button type="button" className="btn sm" onClick={() => void publishNow(exam.id)}>
                      এখনই প্রকাশ করুন
                    </Button>
                    <span className="rowflex" style={{ gap: 8 }}>
                      <Input className="inp" type="datetime-local" style={{ width: 210 }}
                        aria-label="প্রকাশের তারিখ ও সময়"
                        value={scheduleAt[exam.id] ?? toDateTimeLocal(exam.publishAt)}
                        onChange={(e) => setScheduleAt((s) => ({ ...s, [exam.id]: e.target.value }))} />
                      <label className="sw blue">
                        <input type="checkbox"
                          checked={scheduleCountdown[exam.id] ?? Boolean(exam.countdownEnabled)}
                          onChange={(e) => setScheduleCountdown((s) => ({ ...s, [exam.id]: e.target.checked }))} />
                        <span className="tr" />
                      </label>
                      <span className="small">কাউন্টডাউন</span>
                      <Button type="button" variant="ghost" className="btn gho sm"
                        onClick={() => void publishSchedule(exam.id)}>
                        নির্ধারণ করুন
                      </Button>
                    </span>
                  </div>
                ))}
                <p className="small muted" style={{ marginTop: 10 }}>
                  প্রকাশের আগ পর্যন্ত ছাত্র পোর্টাল ও পাবলিক সার্চে এই পরীক্ষার ফলাফল দেখা যাবে না। কাউন্টডাউন চালু থাকলে ওয়েবসাইটে প্রকাশের বাকি সময় দেখাবে।
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "grading" && (
        <div className="card">
          <div className="chead">
            <div>
              <h3 className="ct">গ্রেডিং স্কেল</h3>
              <p className="cs">বোর্ডের নিয়ম বদলালে এখান থেকেই স্কেল বদলে দিন — ফলাফল প্রসেসিং এই স্কেল অনুযায়ীই হিসাব করে।</p>
            </div>
          </div>
          {sortedScale.length === 0 ? (
            <p className="admin-empty">
              কোনো গ্রেডিং স্কেল নেই — নিচের ফর্ম থেকে যোগ করুন অথবা সিড চালালে ডিফল্ট বোর্ড স্কেল আসবে।
            </p>
          ) : (
            <div className="tw">
              <table className="tbl" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th className="c">নম্বরের পরিসর</th>
                    <th className="c">লেটার</th>
                    <th className="c">জিপিএ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedScale.map((row) => (
                    <tr key={row.id}>
                      <td className="c num">
                        {bnNum(Number(row.minMarks))}–{bnNum(Number(row.maxMarks))}
                      </td>
                      <td className="c"><b>{row.letter}</b></td>
                      <td className="c num">{bn(String(row.gpa))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form onSubmit={(e) => void addScale(e)} style={{ marginTop: 16 }}>
            <h4 className="ct" style={{ fontSize: 15 }}>নতুন সারি যোগ করুন</h4>
            <div className="fgrid" style={{ marginTop: 8 }}>
              <div>
                <label className="lbl" htmlFor="gs-min">সর্বনিম্ন নম্বর</label>
                <Input id="gs-min" className="inp" type="number" required placeholder="যেমন: ৮০"
                  value={newScale.minMarks}
                  onChange={(e) => setNewScale({ ...newScale, minMarks: e.target.value })} />
              </div>
              <div>
                <label className="lbl" htmlFor="gs-max">সর্বোচ্চ নম্বর</label>
                <Input id="gs-max" className="inp" type="number" required placeholder="যেমন: ১০০"
                  value={newScale.maxMarks}
                  onChange={(e) => setNewScale({ ...newScale, maxMarks: e.target.value })} />
              </div>
              <div>
                <label className="lbl" htmlFor="gs-letter">লেটার গ্রেড</label>
                <Input id="gs-letter" className="inp" required placeholder="যেমন: A+"
                  value={newScale.letter}
                  onChange={(e) => setNewScale({ ...newScale, letter: e.target.value })} />
              </div>
              <div>
                <label className="lbl" htmlFor="gs-gpa">জিপিএ</label>
                <Input id="gs-gpa" className="inp" type="number" step="0.01" required placeholder="যেমন: ৫.০০"
                  value={newScale.gpa}
                  onChange={(e) => setNewScale({ ...newScale, gpa: e.target.value })} />
              </div>
            </div>
            <div className="rowflex" style={{ marginTop: 12 }}>
              <Button type="submit" className="btn">
                <Plus className="ic" /> সারি যোগ করুন
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
