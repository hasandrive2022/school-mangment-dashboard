"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiGet } from "@/lib/admin-api";
import { bn, bnDate } from "@/lib/format";

type ExamOption = { id: string; nameBn: string; classId?: string };
type AdmitStudent = {
  id: string;
  nameBn: string;
  nameEn?: string | null;
  registrationNumber?: string | null;
  roll?: number | null;
  sectionId?: string | null;
  sectionNameBn?: string | null;
  groupName?: string | null;
  photoUrl?: string | null;
  fatherNameBn?: string | null;
};
type AdmitData = {
  school?: {
    nameBn: string;
    nameEn?: string;
    eiin?: string;
    address?: string;
    logoUrl?: string | null;
  } | null;
  exam: { id: string; nameBn: string; startsAt?: string | null; endsAt?: string | null };
  classNameBn: string;
  subjects: Array<{ code?: string | null; nameBn: string }>;
  students: AdmitStudent[];
};

const DEFAULT_INSTRUCTIONS =
  "পরীক্ষার্থীকে অবশ্যই প্রবেশপত্র সঙ্গে আনতে হবে। পরীক্ষা শুরুর ৩০ মিনিট আগে কেন্দ্রে উপস্থিত হতে হবে। মোবাইল ফোন, স্মার্টওয়াচ বা যেকোনো ইলেকট্রনিক ডিভাইস পরীক্ষার হলে আনা সম্পূর্ণ নিষিদ্ধ।";

function printAdmitCards() {
  document.body.classList.add("printing-admit");
  const clear = () => document.body.classList.remove("printing-admit");
  window.addEventListener("afterprint", clear, { once: true });
  window.setTimeout(clear, 1500);
  window.print();
}

function AdmitCardsInner() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState(searchParams.get("examId") ?? "");
  const [data, setData] = useState<AdmitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");
  const [perPage, setPerPage] = useState("4");
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);

  useEffect(() => {
    void apiGet<{ data: ExamOption[] }>("/api/backend/results/exams")
      .then((p) => setExams(p.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!examId) {
      setData(null);
      return;
    }
    setLoading(true);
    void apiGet<{ data: AdmitData }>(`/api/backend/results/exams/${examId}/admit-data`)
      .then((p) => setData(p.data))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "ডেটা লোড করা যায়নি"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const sectionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of data?.students ?? [])
      if (s.sectionId) map.set(s.sectionId, s.sectionNameBn ?? "শাখা");
    return [...map.entries()];
  }, [data]);

  const students = useMemo(
    () =>
      (data?.students ?? []).filter(
        (s) => !sectionFilter || s.sectionId === sectionFilter,
      ),
    [data, sectionFilter],
  );

  const school = data?.school ?? { nameBn: "বিদ্যালয়" };
  const period =
    data?.exam.startsAt || data?.exam.endsAt
      ? `${data?.exam.startsAt ? bnDate(data.exam.startsAt) : ""}${data?.exam.endsAt ? ` — ${bnDate(data.exam.endsAt)}` : ""}`
      : "";

  return (
    <div className="admit-page">
      <Card className="card no-print">
        <CardHeader>
          <CardTitle>প্রবেশপত্র তৈরি করুন</CardTitle>
          <p>পরীক্ষা বেছে নিলেই ওই শ্রেণির সব শিক্ষার্থীর প্রবেশপত্র তৈরি হয়ে যাবে — প্রিন্ট করে কেটে বিতরণ করুন।</p>
        </CardHeader>
        <CardContent>
          <div className="finance-filters">
            <Select className="sel" value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">পরীক্ষা বেছে নিন</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>{exam.nameBn}</option>
              ))}
            </Select>
            <Select className="sel" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option value="">সব শাখা</option>
              {sectionOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
            <Select className="sel" value={perPage} onChange={(e) => setPerPage(e.target.value)}>
              <option value="2">প্রতি পৃষ্ঠায় ২টি</option>
              <option value="4">প্রতি পৃষ্ঠায় ৪টি</option>
            </Select>
            <Button className="btn pri" disabled={!students.length} onClick={printAdmitCards}>
              প্রিন্ট / PDF ({bn(students.length)}টি কার্ড)
            </Button>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="finance-label">নির্দেশনা (কার্ডে ছাপা হবে)</label>
            <textarea className="inp" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : data ? (
        students.length ? (
          <div className={`admit-sheet admit-grid-${perPage}`}>
            {students.map((student) => (
              <article className="admit-card" key={student.id}>
                <header className="admit-head">
                  {school.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="admit-logo" src={school.logoUrl} alt="" />
                  ) : null}
                  <div className="admit-school">
                    <h3>{school.nameBn}</h3>
                    <p>{school.nameEn ?? ""}{school.eiin ? ` · EIIN: ${school.eiin}` : ""}</p>
                    <p>{school.address ?? ""}</p>
                  </div>
                </header>
                <div className="admit-band">
                  <span>প্রবেশপত্র</span>
                  <b>{data.exam.nameBn}</b>
                </div>
                <div className="admit-body">
                  <table className="admit-info">
                    <tbody>
                      <tr><th>নাম</th><td>{student.nameBn}</td></tr>
                      <tr><th>শ্রেণি</th><td>{data.classNameBn}{student.sectionNameBn ? ` · শাখা: ${student.sectionNameBn}` : ""}{student.groupName ? ` · গ্রুপ: ${student.groupName}` : ""}</td></tr>
                      <tr><th>রোল</th><td>{student.roll != null ? bn(student.roll) : "—"}</td></tr>
                      <tr><th>রেজিস্ট্রেশন নম্বর</th><td>{student.registrationNumber ? bn(student.registrationNumber) : "—"}</td></tr>
                      <tr><th>পিতার নাম</th><td>{student.fatherNameBn ?? "—"}</td></tr>
                      {period ? <tr><th>পরীক্ষা</th><td>{period}</td></tr> : null}
                      <tr><th>আসন / কক্ষ</th><td>………………………</td></tr>
                    </tbody>
                  </table>
                  <div className="admit-photo">
                    {student.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.photoUrl} alt={student.nameBn} />
                    ) : (
                      <span>ছবি</span>
                    )}
                  </div>
                </div>
                {data.subjects.length ? (
                  <div className="admit-subjects">
                    <b>বিষয়সমূহ:</b>{" "}
                    {data.subjects
                      .map((s) => `${s.nameBn}${s.code ? ` (${bn(s.code)})` : ""}`)
                      .join(" · ")}
                  </div>
                ) : null}
                <p className="admit-note">{instructions}</p>
                <footer className="admit-signs">
                  <span>শ্রেণি শিক্ষকের স্বাক্ষর</span>
                  <span>প্রধান শিক্ষকের স্বাক্ষর ও সিল</span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty">এই ফিল্টারে কোনো শিক্ষার্থী নেই।</div>
        )
      ) : (
        <div className="admin-empty">আগে একটি পরীক্ষা বেছে নিন।</div>
      )}
    </div>
  );
}

export default function AdmitCardsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <AdmitCardsInner />
    </Suspense>
  );
}
