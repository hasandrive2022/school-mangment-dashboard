"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPost } from "@/lib/admin-api";

type Exam = { id: string; nameBn: string };
type Subject = {
  id: string;
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

export default function ExamRoutinePage() {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void apiGet<{ data?: Exam[] }>("/api/backend/results/exams")
      .then((payload) => setExams(payload.data ?? []))
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "পরীক্ষার তালিকা লোড করা যায়নি",
        ),
      );
  }, []);

  useEffect(() => {
    if (!examId) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    void apiGet<{ data?: Subject[] }>(
      `/api/backend/results/exam-subjects?examId=${encodeURIComponent(examId)}`,
    )
      .then((payload) => setSubjects(payload.data ?? []))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "রুটিন লোড করা যায়নি",
        ),
      )
      .finally(() => setLoading(false));
  }, [examId, toast]);

  function update(id: string, field: keyof Subject, value: string) {
    setSubjects((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }
  const orderedSubjects = [...subjects].sort((a, b) =>
    `${a.examDate ?? "9999-99-99"}T${a.startsAt ?? "99:99"}`.localeCompare(
      `${b.examDate ?? "9999-99-99"}T${b.startsAt ?? "99:99"}`,
    ),
  );

  async function save(row: Subject) {
    if (!row.examDate || !row.startsAt || !row.endsAt) {
      toast.error("তারিখ, শুরু সময় ও শেষ সময় পূরণ করুন");
      return;
    }
    try {
      await apiPost("/api/backend/results/exam-subjects", {
        examId,
        subjectId: row.subjectId,
        fullMarks: row.fullMarks,
        passMarks: row.passMarks,
        cqMarks: row.cqMarks ?? 0,
        mcqMarks: row.mcqMarks ?? 0,
        practicalMarks: row.practicalMarks ?? 0,
        examDate: row.examDate,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      });
      toast.success("পরীক্ষার রুটিন সংরক্ষণ হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "রুটিন সংরক্ষণ করা যায়নি",
      );
    }
  }

  return (
    <div className="dstack exam-routine-page">
      <div className="admin-page-heading">
        <div>
          <p>পরীক্ষা অফিস</p>
          <h1>পরীক্ষার রুটিন</h1>
        </div>
        <span className="admin-helper">
          প্রতিটি বিষয়ের পরীক্ষা তারিখ ও সময় নির্ধারণ করুন
        </span>
      </div>
      <Card className="card exam-routine-selector">
        <CardHeader>
          <CardTitle>
            <CalendarDays size={20} /> পরীক্ষা নির্বাচন
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            className="sel"
            value={examId}
            onChange={(event) => setExamId(event.target.value)}
          >
            <option value="">পরীক্ষা নির্বাচন করুন</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.nameBn}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : examId && subjects.length ? (
        <Card className="card">
          <CardHeader>
            <CardTitle>বিষয়ভিত্তিক পরীক্ষার রুটিন</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="exam-routine-list">
              <div className="exam-routine-labels">
                <span>ক্রমিক</span>
                <span>বিষয়</span>
                <span>পরীক্ষার তারিখ</span>
                <span>শুরু</span>
                <span>শেষ</span>
                <span>কাজ</span>
              </div>
              {orderedSubjects.map((row, index) => (
                <div className="exam-routine-row" key={row.id}>
                  <span className="exam-routine-serial">{index + 1}</span>
                  <strong>{row.subjectNameBn ?? "বিষয়"}</strong>
                  <Input
                    aria-label={`${row.subjectNameBn ?? "বিষয়"} পরীক্ষার তারিখ`}
                    type="date"
                    value={row.examDate ?? ""}
                    onChange={(event) =>
                      update(row.id, "examDate", event.target.value)
                    }
                  />
                  <Input
                    aria-label={`${row.subjectNameBn ?? "বিষয়"} শুরুর সময়`}
                    type="time"
                    value={row.startsAt ?? ""}
                    onChange={(event) =>
                      update(row.id, "startsAt", event.target.value)
                    }
                  />
                  <Input
                    aria-label={`${row.subjectNameBn ?? "বিষয়"} শেষ সময়`}
                    type="time"
                    value={row.endsAt ?? ""}
                    onChange={(event) =>
                      update(row.id, "endsAt", event.target.value)
                    }
                  />
                  <Button type="button" onClick={() => void save(row)}>
                    সংরক্ষণ
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : examId ? (
        <Card className="card">
          <CardContent>এই পরীক্ষায় এখনো কোনো বিষয় যোগ করা হয়নি।</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
