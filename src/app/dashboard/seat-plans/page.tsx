"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
type Row = Record<string, unknown> & { id: string };
export default function SeatPlansPage() {
  const [plans, setPlans] = useState<Row[]>([]),
    [rooms, setRooms] = useState<Row[]>([]),
    [exams, setExams] = useState<Row[]>([]),
    [subjects, setSubjects] = useState<Row[]>([]),
    [sections, setSections] = useState<Row[]>([]),
    [sectionIds, setSectionIds] = useState<string[]>([]),
    [examId, setExamId] = useState(""),
    [subjectId, setSubjectId] = useState(""),
    [date, setDate] = useState(""),
    [shift, setShift] = useState("সকাল"),
    [selectedRooms, setSelectedRooms] = useState<string[]>([]),
    [message, setMessage] = useState("");
  async function load() {
    const [p, r, e, s] = await Promise.all([
      fetch("/api/backend/seat-plans"),
      fetch("/api/backend/rooms"),
      fetch("/api/backend/results/exams"),
      fetch("/api/backend/academics/sections"),
    ]);
    setPlans(((await p.json()) as { data?: Row[] }).data ?? []);
    setRooms(((await r.json()) as { data?: Row[] }).data ?? []);
    setExams(((await e.json()) as { data?: Row[] }).data ?? []);
    const sectionRows = ((await s.json()) as { data?: Row[] }).data ?? [];
    setSections(sectionRows);
    setSectionIds(sectionRows.map((x) => x.id));
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (examId) {
      const exam = exams.find((item) => item.id === examId);
      setSectionIds(
        sections
          .filter(
            (section) => String(section.classId) === String(exam?.classId),
          )
          .map((section) => section.id),
      );
      void fetch(`/api/backend/results/exam-subjects?examId=${examId}`)
        .then((r) => r.json())
        .then((p) => setSubjects((p as { data?: Row[] }).data ?? []));
    }
  }, [examId, exams, sections]);
  async function create() {
    if (!subjectId || !date || !sectionIds.length) {
      setMessage("পরীক্ষার বিষয়, তারিখ ও শাখা দিন");
      return;
    }
    const r = await fetch("/api/backend/seat-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sittingDate: date,
        shift,
        examSubjectIds: [subjectId],
        selectedSectionIds: sectionIds,
        eligibilitySource: "all",
      }),
    });
    const p = (await r.json()) as { message?: string };
    setMessage(
      r.ok ? "প্ল্যান তৈরি হয়েছে" : (p.message ?? "প্ল্যান তৈরি করা যায়নি"),
    );
    if (r.ok) await load();
  }
  async function action(id: string, path: string, body?: object) {
    const r = await fetch(`/api/backend/seat-plans/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const p = (await r.json()) as { message?: string };
    setMessage(r.ok ? "কাজ সম্পন্ন হয়েছে" : (p.message ?? "কাজটি করা যায়নি"));
    await load();
  }
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <h1>আসন বিন্যাস</h1>
          <p>সিটিং তৈরি, রুম নির্বাচন এবং প্রকাশিত আসন পরিচালনা করুন।</p>
        </div>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>নতুন সিট প্ল্যান</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              >
                <option value="">পরীক্ষা নির্বাচন</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {String(e.nameBn ?? e.name ?? "পরীক্ষা")} — শ্রেণি {String(e.classNameBn ?? "—")}
                  </option>
                ))}
              </Select>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">বিষয় নির্বাচন</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {String(s.subjectNameBn ?? s.nameBn ?? "বিষয়")}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Select value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="সকাল">সকাল</option>
                <option value="দিবা">দিবা</option>
              </Select>
              <Button onClick={() => void create()}>খসড়া তৈরি</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>সিট প্ল্যানের তালিকা</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {rooms
                .filter((r) => Boolean(r.isActive))
                .map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={
                      selectedRooms.includes(r.id) ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedRooms((x) =>
                        x.includes(r.id)
                          ? x.filter((id) => id !== r.id)
                          : [...x, r.id],
                      )
                    }
                  >
                    {String(r.nameBn)}
                  </Button>
                ))}
            </div>
            <div className="tbl-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>শিফট</th>
                    <th>শিরোনাম</th>
                    <th>অবস্থা</th>
                    <th>বসানো/অনুমোদিত</th>
                    <th>কাজ</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td>{String(p.sittingDate)}</td>
                      <td>{String(p.shift)}</td>
                      <td>{String(p.title)}</td>
                      <td>
                        <Badge>
                          {p.status === "published"
                            ? "প্রকাশিত"
                            : p.status === "locked"
                              ? "লক"
                              : "খসড়া"}
                        </Badge>
                      </td>
                      <td>
                        {String(p.seatedCount ?? 0)} /{" "}
                        {String(p.approvedCount ?? 0)}
                      </td>
                      <td className="flex flex-wrap gap-2">
                        {p.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                void action(p.id, "generate", {
                                  roomIds: selectedRooms,
                                  roomMode: "mixed",
                                  pattern: "serial",
                                  perBench: 1,
                                })
                              }
                            >
                              জেনারেট
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void action(p.id, "lock")}
                            >
                              লক
                            </Button>
                          </>
                        )}
                        {p.status === "locked" && (
                          <Button
                            size="sm"
                            onClick={() => void action(p.id, "publish")}
                          >
                            প্রকাশ
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
