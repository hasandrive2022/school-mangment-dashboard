"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export default function ResultsPage() {
  const [scale, setScale] = useState<Scale[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
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
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="admin-page-heading">
          <div>
            <p>পরীক্ষা ও মূল্যায়ন</p>
            <h1>ফলাফল ব্যবস্থাপনা</h1>
          </div>
          <Badge variant="success">DB grading scale</Badge>
        </div>
        <div className="results-layout">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>পরীক্ষা ফর্ম</CardTitle>
              </CardHeader>
              <CardContent className="results-form">
                <Input
                  placeholder="পরীক্ষার নাম"
                  value={form.nameBn}
                  onChange={(event) =>
                    setForm({ ...form, nameBn: event.target.value })
                  }
                />
                <Input
                  placeholder="শ্রেণি ID"
                  value={form.classId}
                  onChange={(event) =>
                    setForm({ ...form, classId: event.target.value })
                  }
                />
                <Input
                  placeholder="সেশন ID"
                  value={form.sessionId}
                  onChange={(event) =>
                    setForm({ ...form, sessionId: event.target.value })
                  }
                />
                <Input
                  type="date"
                  value={form.examDate}
                  onChange={(event) =>
                    setForm({ ...form, examDate: event.target.value })
                  }
                />
                <Button onClick={() => void createExam()}>
                  পরীক্ষা সংরক্ষণ করুন
                </Button>
              </CardContent>
            </Card>
            <Card className="mt-5">
              <CardHeader>
                <CardTitle>পরীক্ষাসমূহ</CardTitle>
              </CardHeader>
              <CardContent>
                {exams.length ? (
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
                          onClick={() => void publish(exam.id)}
                        >
                          {exam.isPublished ? "আপডেট" : "প্রকাশ করুন"}
                        </Button>
                        <Input
                          className="w-32"
                          placeholder="Class ID"
                          value={processClass}
                          onChange={(event) =>
                            setProcessClass(event.target.value)
                          }
                        />
                        <Button size="sm" onClick={() => void process(exam.id)}>
                          Process
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="admin-empty">কোনো পরীক্ষা নেই।</div>
                )}
              </CardContent>
            </Card>
          </section>
          <section>
            <Card>
              <CardHeader>
                <CardTitle>বাংলাদেশ বোর্ড গ্রেডিং স্কেল</CardTitle>
                <p className="text-sm text-neutral-600">
                  এই স্কেল database থেকে আসে; hardcoded নয়।
                </p>
              </CardHeader>
              <CardContent>
                <div className="scale-table">
                  {scale.map((row) => (
                    <div className="scale-row" key={row.id}>
                      <span>
                        {row.minMarks}–{row.maxMarks}
                      </span>
                      <b>{row.letter}</b>
                      <span>GPA {row.gpa}</span>
                    </div>
                  ))}
                </div>
                <div className="scale-add">
                  <Input
                    placeholder="Min"
                    value={newScale.minMarks}
                    onChange={(event) =>
                      setNewScale({ ...newScale, minMarks: event.target.value })
                    }
                  />
                  <Input
                    placeholder="Max"
                    value={newScale.maxMarks}
                    onChange={(event) =>
                      setNewScale({ ...newScale, maxMarks: event.target.value })
                    }
                  />
                  <Input
                    placeholder="Letter"
                    value={newScale.letter}
                    onChange={(event) =>
                      setNewScale({ ...newScale, letter: event.target.value })
                    }
                  />
                  <Input
                    placeholder="GPA"
                    value={newScale.gpa}
                    onChange={(event) =>
                      setNewScale({ ...newScale, gpa: event.target.value })
                    }
                  />
                  <Button onClick={() => void addScale()}>সারি যোগ</Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
        {message && <p className="mt-4 text-accent-600">{message}</p>}
      </div>
    </main>
  );
}
