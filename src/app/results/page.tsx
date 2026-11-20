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
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-api";

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
  examDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};
type SubjectOption = { id: string; nameBn?: string };
type AcademicOption = { id: string; nameBn?: string; name?: string; year?: number };

export default function ResultsPage() {
  const toast = useToast();
  const [scale, setScale] = useState<Scale[] | null>(null);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[] | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [classOptions, setClassOptions] = useState<AcademicOption[]>([]);
  const [sessionOptions, setSessionOptions] = useState<AcademicOption[]>([]);
  const [examSubjectExamId, setExamSubjectExamId] = useState("");
  const [examSubjectForm, setExamSubjectForm] = useState({
    subjectId: "",
    fullMarks: "",
    passMarks: "",
    cqMarks: "",
    mcqMarks: "",
    practicalMarks: "",
    examDate: "",
    startsAt: "",
    endsAt: "",
  });
  const [form, setForm] = useState({
    nameBn: "",
    classId: "",
    sessionId: "",
    examDate: "",
  });
  const [newScale, setNewScale] = useState(emptyScale);
  const [processClassByExam, setProcessClassByExam] = useState<Record<string, string>>({});
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  async function load() {
    try {
      const [scales, examsResponse] = await Promise.all([
        apiGet<{ data?: Scale[] }>("/api/backend/results/grading-scales"),
        apiGet<{ data?: Exam[] }>("/api/backend/results/exams"),
      ]);
      setScale(scales.data ?? []);
      setExams(examsResponse.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ফলাফল তথ্য লোড করা যায়নি");
      setScale([]);
      setExams([]);
    }
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
    if (
      !examSubjectExamId ||
      !examSubjectForm.subjectId ||
      !examSubjectForm.fullMarks ||
      !examSubjectForm.passMarks ||
      !examSubjectForm.examDate ||
      !examSubjectForm.startsAt ||
      !examSubjectForm.endsAt
    ) {
      toast.error("বিষয়, পূর্ণমান, পাস নম্বর, তারিখ ও সময় পূরণ করুন");
      return;
    }
    if (examSubjects?.some((row) => row.subjectId === examSubjectForm.subjectId)) {
      toast.error("এই বিষয়টি পরীক্ষায় ইতিমধ্যে যোগ করা হয়েছে");
      return;
    }
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
          examDate: examSubjectForm.examDate,
          startsAt: examSubjectForm.startsAt,
          endsAt: examSubjectForm.endsAt,
        },
        "পরীক্ষার বিষয় যোগ করা যায়নি",
      );
      toast.success("পরীক্ষার বিষয় যোগ হয়েছে");
      setExamSubjectForm({ subjectId: "", fullMarks: "", passMarks: "", cqMarks: "", mcqMarks: "", practicalMarks: "", examDate: "", startsAt: "", endsAt: "" });
      await loadExamSubjects(examSubjectExamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "যোগ করা যায়নি");
    }
  }
  useEffect(() => {
    void Promise.all([
      apiGet<{ data?: SubjectOption[] }>("/api/backend/academics/subjects"),
      apiGet<{ data?: AcademicOption[] }>("/api/backend/academics/classes"),
      apiGet<{ data?: AcademicOption[] }>("/api/backend/academics/sessions"),
    ])
      .then(([subjects, classes, sessions]) => {
        setSubjectOptions(subjects.data ?? []);
        setClassOptions(classes.data ?? []);
        setSessionOptions(sessions.data ?? []);
      })
      .catch(() => {
        setSubjectOptions([]);
        setClassOptions([]);
        setSessionOptions([]);
      });
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function createExam() {
    if (!form.nameBn || !form.classId || !form.sessionId) {
      toast.error("পরীক্ষার নাম, শ্রেণি ও সেশন পূরণ করুন");
      return;
    }
    try {
      await apiPost("/api/backend/results/exams", {
        value: { ...form, failAnySubject: true },
      }, "পরীক্ষা তৈরি করা যায়নি");
      setForm({ nameBn: "", classId: "", sessionId: "", examDate: "" });
      await load();
      toast.success("পরীক্ষা তৈরি হয়েছে");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "পরীক্ষা তৈরি করা যায়নি");
    }
  }
  async function addScale() {
    if (!newScale.minMarks || !newScale.maxMarks || !newScale.letter || !newScale.gpa) {
      toast.error("Min, Max, Letter ও GPA পূরণ করুন");
      return;
    }
    try {
      await apiPost("/api/backend/results/grading-scales", {
        value: {
          minMarks: Number(newScale.minMarks),
          maxMarks: Number(newScale.maxMarks),
          letter: newScale.letter,
          gpa: Number(newScale.gpa),
        },
      }, "গ্রেডিং স্কেল সংরক্ষণ করা যায়নি");
      setNewScale(emptyScale);
      await load();
      toast.success("গ্রেডিং স্কেল সংরক্ষিত হয়েছে");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "গ্রেডিং স্কেল সংরক্ষণ করা যায়নি");
    }
  }
  async function publish(id: string) {
    try {
      await apiPatch(`/api/backend/results/exams/${id}/publish`, {}, "ফলাফল প্রকাশ করা যায়নি");
      toast.success("ফলাফল প্রকাশিত হয়েছে");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ফলাফল প্রকাশ করা যায়নি");
    }
  }
  async function publishSelected() {
    if (!selectedExamIds.length || bulkPublishing) return;
    setBulkPublishing(true);
    try {
      await apiPost(
        "/api/backend/results/exams/publish-bulk",
        { examIds: selectedExamIds },
        "নির্বাচিত ফলাফল প্রকাশ করা যায়নি",
      );
      toast.success(`${selectedExamIds.length}টি শ্রেণির ফলাফল Portal-এ প্রকাশিত হয়েছে`);
      setSelectedExamIds([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "নির্বাচিত ফলাফল প্রকাশ করা যায়নি");
    } finally {
      setBulkPublishing(false);
    }
  }
  async function sendResultSms(id: string) {
    try {
      const payload = await apiPost<{ data: { sent: number; recipients: number; testMode: boolean } }>(
        "/api/backend/sms/send-result",
        { value: { examId: id } },
      );
      toast.success(
        payload.data.testMode
          ? `টেস্ট মোড: ${payload.data.recipients} জনকে ফলাফল SMS লগ করা হয়েছে`
          : `${payload.data.sent} জনকে ফলাফল SMS পাঠানো হয়েছে`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ফলাফল SMS পাঠানো যায়নি");
    }
  }
  async function process(id: string) {
    const processClass = processClassByExam[id] ?? "";
    if (!processClass) {
      toast.error("ফলাফল প্রসেস করার আগে ওই পরীক্ষার শ্রেণি নির্বাচন করুন");
      return;
    }
    try {
      await apiPost(
        `/api/backend/results/exams/${id}/process/${processClass}`,
        {},
        "ফলাফল প্রসেস করা যায়নি",
      );
      toast.success("ফলাফল প্রসেস হয়েছে; পুনরায় চালালেও duplicate হবে না");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ফলাফল প্রসেস করা যায়নি");
    }
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
            <Card className="card" id="exam-list">
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
                <Select className="sel"
                  value={form.classId}
                  onChange={(event) =>
                    setForm({ ...form, classId: event.target.value })
                  }>
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classOptions.map((row) => <option key={row.id} value={row.id}>{row.nameBn ?? row.name ?? "শ্রেণি"}</option>)}
                </Select>
                <Select className="sel"
                  value={form.sessionId}
                  onChange={(event) =>
                    setForm({ ...form, sessionId: event.target.value })
                  }>
                  <option value="">সেশন নির্বাচন করুন</option>
                  {sessionOptions.map((row) => <option key={row.id} value={row.id}>{row.nameBn ?? row.name ?? row.year ?? "সেশন"}</option>)}
                </Select>
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
            <Card className="card" id="exam-subjects">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>পরীক্ষাসমূহ</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!selectedExamIds.length || bulkPublishing}
                    onClick={() => void publishSelected()}
                  >
                    {bulkPublishing
                      ? "প্রকাশ হচ্ছে…"
                      : selectedExamIds.length
                        ? `${selectedExamIds.length}টি নির্বাচিত ফলাফল প্রকাশ করুন`
                        : "নির্বাচিত ফলাফল প্রকাশ করুন"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {exams === null ? (
                  <ListSkeleton rows={3} />
                ) : exams.length ? (
                  exams.map((exam) => (
                    <article className="exam-row" key={exam.id}>
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`${exam.nameBn} নির্বাচন করুন`}
                          checked={selectedExamIds.includes(exam.id)}
                          disabled={exam.isPublished || bulkPublishing}
                          onChange={(event) =>
                            setSelectedExamIds((current) =>
                              event.target.checked
                                ? [...current, exam.id]
                                : current.filter((id) => id !== exam.id),
                            )
                          }
                        />
                        <div>
                          <b>{exam.nameBn}</b>
                          <small>
                            {exam.examDate ?? "তারিখ নেই"} ·{" "}
                            {classOptions.find((row) => row.id === exam.classId)?.nameBn ?? "শ্রেণি নেই"}
                          </small>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                        <Badge
                          variant={exam.isPublished ? "success" : "secondary"}
                          className="whitespace-nowrap"
                        >
                          {exam.isPublished ? "প্রকাশিত" : "খসড়া"}
                        </Badge>
                        <Badge
                          variant={exam.isPublished ? "success" : "secondary"}
                          className="whitespace-nowrap"
                          title="এই status অনুযায়ী Portal-এ ফলাফল দেখা যায়"
                        >
                          {exam.isPublished
                            ? "Portal-এ দেখা যাচ্ছে"
                            : "Portal-এ দেখা যাচ্ছে না"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn gho sm"
                          onClick={() => void publish(exam.id)}
                        >
                          {exam.isPublished ? "আপডেট" : "প্রকাশ করুন"}
                        </Button>
                        {exam.isPublished ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn gho sm"
                            onClick={() => void sendResultSms(exam.id)}
                          >
                            রেজাল্ট SMS
                          </Button>
                        ) : null}
                        <Select className="sel w-full sm:w-32"
                          value={processClassByExam[exam.id] ?? ""}
                          onChange={(event) =>
                            setProcessClassByExam((current) => ({
                              ...current,
                              [exam.id]: event.target.value,
                            }))
                          }>
                          <option value="">শ্রেণি নির্বাচন</option>
                          {classOptions
                            .filter((row) => row.id === exam.classId)
                            .map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.nameBn ?? row.name ?? "শ্রেণি"}
                              </option>
                            ))}
                        </Select>
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
                      <Input className="inp" type="date" aria-label="পরীক্ষার তারিখ" value={examSubjectForm.examDate} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, examDate: e.target.value })} />
                      <Input className="inp" type="time" aria-label="শুরুর সময়" value={examSubjectForm.startsAt} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, startsAt: e.target.value })} />
                      <Input className="inp" type="time" aria-label="শেষ সময়" value={examSubjectForm.endsAt} onChange={(e) => setExamSubjectForm({ ...examSubjectForm, endsAt: e.target.value })} />
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
                              {row.examDate ? ` · ${row.examDate} ${row.startsAt ?? ""}–${row.endsAt ?? ""}` : " · রুটিন অসম্পূর্ণ"}
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
    </div>
  );
}
