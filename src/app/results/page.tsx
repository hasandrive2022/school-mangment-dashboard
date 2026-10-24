"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPost } from "@/lib/admin-api";

type Scale = {
  id: string;
  minMarks: number;
  maxMarks: number;
  letter: string;
  gpa: number;
};
type Exam = {
  id: string;
  nameBn: string;
  classId?: string;
  examDate?: string | null;
  isPublished: boolean;
  publishAt?: string | null;
  countdownEnabled?: boolean;
};
const emptyScale = { minMarks: "", maxMarks: "", letter: "", gpa: "" };

type ExamSubject = {
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
type SubjectOption = { id: string; nameBn?: string };

export default function ResultsPage() {
  const toast = useToast();
  const [scale, setScale] = useState<Scale[] | null>(null);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[] | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [examSubjectExamId, setExamSubjectExamId] = useState("");
  const [examSubjectForm, setExamSubjectForm] = useState({
    subjectId: "",
    fullMarks: "",
    passMarks: "",
    cqMarks: "",
    mcqMarks: "",
    practicalMarks: "",
  });
  const [form, setForm] = useState({
    nameBn: "",
    classId: "",
    sessionId: "",
    examDate: "",
  });
  const [newScale, setNewScale] = useState(emptyScale);
  const [processClass, setProcessClass] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const [scales, examsResponse] = await Promise.all([
      fetch("/api/backend/results/grading-scales"),
      fetch("/api/backend/results/exams"),
    ]);
    setScale(((await scales.json()) as { data?: Scale[] }).data ?? []);
    setExams(((await examsResponse.json()) as { data?: Exam[] }).data ?? []);
  }
  async function loadExamSubjects(examId: string) {
    setExamSubjectExamId(examId);
    if (!examId) {
      setExamSubjects(null);
      return;
    }
    setExamSubjects(null);
    try {
      const payload = await apiGet<{ data?: ExamSubject[] }>(
        `/api/backend/results/exam-subjects?examId=${encodeURIComponent(examId)}`,
      );
      setExamSubjects(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "বিষয় তালিকা লোড করা যায়নি");
      setExamSubjects([]);
    }
  }
  async function addExamSubject() {
    try {
      await apiPost(
        "/api/backend/results/exam-subjects",
        {
          examId: examSubjectExamId,
          subjectId: examSubjectForm.subjectId,
          fullMarks: Number(examSubjectForm.fullMarks),
          passMarks: Number(examSubjectForm.passMarks),
          cqMarks: examSubjectForm.cqMarks ? Number(examSubjectForm.cqMarks) : undefined,
          mcqMarks: examSubjectForm.mcqMarks ? Number(examSubjectForm.mcqMarks) : undefined,
          practicalMarks: examSubjectForm.practicalMarks ? Number(examSubjectForm.practicalMarks) : undefined,
        },
        "পরীক্ষার বিষয় যোগ করা যায়নি",
      );
      toast.success("পরীক্ষার বিষয় যোগ হয়েছে");
      setExamSubjectForm({ subjectId: "", fullMarks: "", passMarks: "", cqMarks: "", mcqMarks: "", practicalMarks: "" });
      await loadExamSubjects(examSubjectExamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "যোগ করা যায়নি");
    }
  }
  useEffect(() => {
    void apiGet<{ data?: SubjectOption[] }>("/api/backend/academics/subjects")
      .then((payload) => setSubjectOptions(payload.data ?? []))
      .catch(() => setSubjectOptions([]));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function createExam() {
    const response = await fetch("/api/backend/results/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: { ...form, failAnySubject: true } }),
    });
    setMessage(response.ok ? "পরীক্ষা তৈরি হয়েছে" : "পরীক্ষা তৈরি করা যায়নি");
    if (response.ok) {
      setForm({ nameBn: "", classId: "", sessionId: "", examDate: "" });
      await load();
    }
  }
  async function addScale() {
    const response = await fetch("/api/backend/results/grading-scales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: {
          minMarks: Number(newScale.minMarks),
          maxMarks: Number(newScale.maxMarks),
          letter: newScale.letter,
          gpa: Number(newScale.gpa),
        },
      }),
    });
    setMessage(
      response.ok
        ? "গ্রেডিং স্কেল সংরক্ষিত হয়েছে"
        : "স্কেল overlap/gap যাচাই করুন",
    );
    if (response.ok) {
      setNewScale(emptyScale);
      await load();
    }
  }
  async function publish(id: string) {
    const response = await fetch(`/api/backend/results/exams/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setMessage(response.ok ? "ফলাফল প্রকাশিত হয়েছে" : "প্রকাশ করা যায়নি");
    await load();
  }
  async function process(id: string) {
    const response = await fetch(
      `/api/backend/results/exams/${id}/process/${processClass}`,
      { method: "POST" },
    );
    setMessage(
      response.ok
        ? "ফলাফল প্রসেস হয়েছে; পুনরায় চালালেও duplicate হবে না"
        : "Exam ও class ID যাচাই করুন",
    );
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>পরীক্ষা ও মূল্যায়ন</p>
            <h1>ফলাফল ব্যবস্থাপনা</h1>
          </div>
          <Badge variant="success">DB grading scale</Badge>
        </div>
        <div className="results-layout">
          <section>
            <Card className="card">
              <CardHeader>
                <CardTitle>পরীক্ষা ফর্ম — নতুন পরীক্ষা</CardTitle>
              </CardHeader>
              <CardContent className="results-form">
                <Input className="inp"
                  placeholder="পরীক্ষার নাম"
                  value={form.nameBn}
                  onChange={(event) =>
                    setForm({ ...form, nameBn: event.target.value })
                  }
                />
                <Input className="inp"
                  placeholder="শ্রেণি ID"
                  value={form.classId}
                  onChange={(event) =>
                    setForm({ ...form, classId: event.target.value })
                  }
                />
                <Input className="inp"
                  placeholder="সেশন ID"
                  value={form.sessionId}
                  onChange={(event) =>
                    setForm({ ...form, sessionId: event.target.value })
                  }
                />
                <Input className="inp"
                  type="date"
                  value={form.examDate}
                  onChange={(event) =>
                    setForm({ ...form, examDate: event.target.value })
                  }
                />
                <Button className="btn" onClick={() => void createExam()}>
                  পরীক্ষা সংরক্ষণ করুন
                </Button>
              </CardContent>
            </Card>
            <Card className="card">
              <CardHeader>
                <CardTitle>পরীক্ষাসমূহ</CardTitle>
              </CardHeader>
              <CardContent>
                {exams === null ? (
                  <ListSkeleton rows={3} />
                ) : exams.length ? (
                  exams.map((exam) => (
                    <article className="exam-row" key={exam.id}>
                      <div>
                        <b>{exam.nameBn}</b>
                        <small>
                          {exam.examDate ?? "তারিখ নেই"} ·{" "}
                          {exam.classId ?? "শ্রেণি নেই"}
                        </small>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={exam.isPublished ? "success" : "secondary"}
                        >
                          {exam.isPublished ? "প্রকাশিত" : "খসড়া"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn gho sm"
                          onClick={() => void publish(exam.id)}
                        >
                          {exam.isPublished ? "আপডেট" : "প্রকাশ করুন"}
                        </Button>
                        <Input className="inp w-32"
                          placeholder="Class ID"
                          value={processClass}
                          onChange={(event) =>
                            setProcessClass(event.target.value)
                          }
                        />
                        <Button size="sm" className="btn sm" onClick={() => void process(exam.id)}>
                          Process
                        </Button>
                        <DeleteButton
                          itemLabel={exam.nameBn}
                          onDelete={() =>
                            apiDelete(`/api/backend/results/exams/${exam.id}`).then(() => undefined)
                          }
                          onDeleted={load}
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="admin-empty">কোনো পরীক্ষা নেই।</div>
                )}
              </CardContent>
            </Card>
            <Card className="card">
              <CardHeader>
                <CardTitle>পরীক্ষার বিষয়সমূহ</CardTitle>
                <p className="text-sm text-neutral-600">
                  পরীক্ষা বেছে নিয়ে বিষয় ও পূর্ণমান নির্ধারণ করুন — নম্বর এন্ট্রি এই তালিকা থেকেই হয়।
                </p>
              </CardHeader>
              <CardContent>
                <Select className="sel"
                  value={examSubjectExamId}
                  onChange={(event) => void loadExamSubjects(event.target.value)}
                >
                  <option value="">পরীক্ষা নির্বাচন করুন</option>
                  {(exams ?? []).map((exam) => (
                    <option key={exam.id} value={exam.id}>{exam.nameBn}</option>
                  ))}
                </Select>
                {examSubjectExamId && (
                  <>
                    <div className="scale-add" style={{ marginTop: 12 }}>
                      <Select className="sel"
                        value={examSubjectForm.subjectId}
                        onChange={(event) => setExamSubjectForm({ ...examSubjectForm, subjectId: event.target.value })}
                      >
                        <option value="">বিষয়</option>
                        {subjectOptions.map((subject) => (
                          <option key={subject.id} value={subject.id}>{subject.nameBn ?? subject.id}</option>
                        ))}
                      </Select>
                      <Input className="inp" type="number" placeholder="পূর্ণমান" value={examSubjectForm.fullMarks} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, fullMarks: e.target.value })} />
                      <Input className="inp" type="number" placeholder="পাস নম্বর" value={examSubjectForm.passMarks} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, passMarks: e.target.value })} />
                      <Input className="inp" type="number" placeholder="CQ" value={examSubjectForm.cqMarks} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, cqMarks: e.target.value })} />
                      <Input className="inp" type="number" placeholder="MCQ" value={examSubjectForm.mcqMarks} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, mcqMarks: e.target.value })} />
                      <Input className="inp" type="number" placeholder="ব্যবহারিক" value={examSubjectForm.practicalMarks} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, practicalMarks: e.target.value })} />
                      <Button className="btn" onClick={() => void addExamSubject()}>বিষয় যোগ</Button>
                    </div>
                    {examSubjects === null ? (
                      <ListSkeleton rows={2} />
                    ) : examSubjects.length === 0 ? (
                      <p className="admin-empty" style={{ marginTop: 12 }}>এই পরীক্ষায় কোনো বিষয় যোগ হয়নি।</p>
                    ) : (
                      examSubjects.map((row) => (
                        <div className="listrow" key={row.id} style={{ marginTop: 8 }}>
                          <span className="grow">
                            <b>{row.subjectNameBn ?? subjectOptions.find((s) => s.id === row.subjectId)?.nameBn ?? row.subjectId}</b>
                            <small className="muted" style={{ display: "block" }}>
                              পূর্ণমান {row.fullMarks} · পাস {row.passMarks}
                              {row.cqMarks ? ` · CQ ${row.cqMarks}` : ""}
                              {row.mcqMarks ? ` · MCQ ${row.mcqMarks}` : ""}
                              {row.practicalMarks ? ` · ব্যবহারিক ${row.practicalMarks}` : ""}
                            </small>
                          </span>
                          <DeleteButton
                            itemLabel={row.subjectNameBn ?? "পরীক্ষার বিষয়"}
                            onDelete={() =>
                              apiDelete(`/api/backend/results/exam-subjects/${row.id}`).then(() => undefined)
                            }
                            onDeleted={() => loadExamSubjects(examSubjectExamId)}
                          />
                        </div>
                      ))
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </section>
          <section>
            <Card className="card">
              <CardHeader>
                <CardTitle>গ্রেডিং স্কেল</CardTitle>
                <p className="text-sm text-neutral-600">
                  এই স্কেল database থেকে আসে; hardcoded নয়।
                </p>
              </CardHeader>
              <CardContent>
                <div className="tw">
                  <table className="tbl" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th className="c">নম্বরের পরিসর</th>
                        <th className="c">লেটার গ্রেড</th>
                        <th className="c">GPA</th>
                        <th className="c">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale === null ? (
                        <tr>
                          <td colSpan={4}><ListSkeleton rows={2} /></td>
                        </tr>
                      ) : (
                        scale.map((row) => (
                          <tr key={row.id}>
                            <td className="c num">
                              {row.minMarks}–{row.maxMarks}
                            </td>
                            <td className="c">
                              <b>{row.letter}</b>
                            </td>
                            <td className="c num">{row.gpa}</td>
                            <td className="c">
                              <DeleteButton
                                itemLabel={`গ্রেড ${row.letter} (${row.minMarks}–${row.maxMarks})`}
                                onDelete={() =>
                                  apiDelete(`/api/backend/results/grading-scales/${row.id}`).then(() => undefined)
                                }
                                onDeleted={load}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="scale-add">
                  <Input className="inp"
                    placeholder="Min"
                    value={newScale.minMarks}
                    onChange={(event) =>
                      setNewScale({ ...newScale, minMarks: event.target.value })
                    }
                  />
                  <Input className="inp"
                    placeholder="Max"
                    value={newScale.maxMarks}
                    onChange={(event) =>
                      setNewScale({ ...newScale, maxMarks: event.target.value })
                    }
                  />
                  <Input className="inp"
                    placeholder="Letter"
                    value={newScale.letter}
                    onChange={(event) =>
                      setNewScale({ ...newScale, letter: event.target.value })
                    }
                  />
                  <Input className="inp"
                    placeholder="GPA"
                    value={newScale.gpa}
                    onChange={(event) =>
                      setNewScale({ ...newScale, gpa: event.target.value })
                    }
                  />
                  <Button className="btn" onClick={() => void addScale()}>সারি যোগ</Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
        {message && <p className="alert g">{message}</p>}
    </div>
  );
}
