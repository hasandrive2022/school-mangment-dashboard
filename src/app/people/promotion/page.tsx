"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = Record<string, unknown> & { id: string };
type Preview = Row & {
  newRoll?: number | null;
  studentId: string;
  nameBn: string;
  oldRoll?: number | null;
  meritPosition?: number | null;
  totalMarks?: number | null;
  isPassed?: boolean;
  note?: string;
};
const show = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
export default function PromotionPage() {
  const [students, setStudents] = useState<Row[]>([]),
    [sessions, setSessions] = useState<Row[]>([]),
    [classes, setClasses] = useState<Row[]>([]),
    [sections, setSections] = useState<Row[]>([]),
    [exams, setExams] = useState<Row[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]),
    [sessionId, setSessionId] = useState(""),
    [classId, setClassId] = useState(""),
    [sectionId, setSectionId] = useState(""),
    [sourceExamId, setSourceExamId] = useState(""),
    [useMerit, setUseMerit] = useState(true),
    [preview, setPreview] = useState<Preview[] | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    void Promise.all([
      apiGet<{ data?: Row[] }>("/api/backend/academics/sessions"),
      apiGet<{ data?: Row[] }>("/api/backend/academics/classes"),
      apiGet<{ data?: Row[] }>("/api/backend/academics/sections"),
      apiGet<{ data?: Row[] }>("/api/backend/people/students"),
      apiGet<{ data?: Row[] }>("/api/backend/results/exams"),
    ])
      .then(([s, c, sec, st, e]) => {
        setSessions(s.data ?? []);
        setClasses(c.data ?? []);
        setSections(sec.data ?? []);
        setStudents(st.data ?? []);
        setExams(e.data ?? []);
      })
      .catch(() => setMessage("তথ্য লোড করা যায়নি"));
  }, []);
  const targetSections = useMemo(
    () => sections.filter((s) => s.classId === classId),
    [sections, classId],
  );
  const sourceClassIds = useMemo(
    () => [
      ...new Set(
        students
          .filter((s) => studentIds.includes(s.id))
          .map((s) => String(s.classId ?? "")),
      ),
    ],
    [students, studentIds],
  );
  const sourceExams = useMemo(
    () =>
      exams.filter(
        (e) =>
          Boolean(e.isPublished) && sourceClassIds.includes(String(e.classId)),
      ),
    [exams, sourceClassIds],
  );
  async function makePreview() {
    if (!studentIds.length || !sessionId || !classId || !sourceExamId) {
      setMessage("শিক্ষার্থী, সেশন, লক্ষ্য শ্রেণি ও উৎস পরীক্ষা নির্বাচন করুন");
      return;
    }
    const r = await fetch("/api/backend/people/students/promote/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds,
        sessionId,
        classId,
        sectionId: sectionId || undefined,
        sourceExamId,
      }),
    });
    const p = (await r.json()) as {
      data?: Preview[];
      message?: string;
      error?: string;
    };
    if (!r.ok) {
      setMessage(p.message ?? p.error ?? "প্রিভিউ তৈরি করা যায়নি");
      return;
    }
    setPreview(p.data ?? []);
    setMessage("প্রিভিউ প্রস্তুত — নতুন রোল প্রয়োজনে সম্পাদনা করুন");
  }
  async function apply() {
    const body: Record<string, unknown> = {
      studentIds,
      sessionId,
      classId,
      sectionId: sectionId || undefined,
    };
    if (useMerit && preview)
      body.rollAssignments = preview.map((r) => ({
        studentId: r.studentId,
        roll: Number(r.newRoll),
      }));
    const r = await fetch("/api/backend/people/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const p = (await r.json()) as {
      count?: number;
      message?: string;
      error?: string;
    };
    setMessage(
      r.ok
        ? `${p.count ?? 0} জন শিক্ষার্থী প্রমোট হয়েছে।`
        : (p.message ?? p.error ?? "প্রমোশন করা যায়নি"),
    );
    if (r.ok) setPreview(null);
  }
  return (
    <div className="dstack">
      <div className="admin-page-heading">
        <div>
          <p>People · Academic transition</p>
          <h1>শ্রেণি প্রমোশন</h1>
        </div>
        <span className="admin-helper">
          প্রিভিউ দেখে তারপর নতুন রোলসহ প্রমোশন করুন
        </span>
      </div>
      {message && <p className="alert b promotion-note">{message}</p>}
      <Card>
        <CardHeader>
          <CardTitle>প্রমোশন সেটআপ</CardTitle>
        </CardHeader>
        <CardContent className="promotion-form">
          <label>
            শিক্ষার্থী
            <select
              className="sel"
              multiple
              size={7}
              value={studentIds}
              onChange={(e) =>
                setStudentIds(
                  Array.from(e.target.selectedOptions, (o) => o.value),
                )
              }
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.displayNameBn ?? s.nameBn ?? "শিক্ষার্থী")} · রোল{" "}
                  {show(s.roll)} · {show(s.registrationNumber)}
                </option>
              ))}
            </select>
          </label>
          <Select
            className="sel"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          >
            <option value="">নতুন সেশন নির্বাচন করুন</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.nameBn ?? s.name ?? s.year)}
              </option>
            ))}
          </Select>
          <Select
            className="sel"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">নতুন শ্রেণি নির্বাচন করুন</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.nameBn ?? c.name)}
              </option>
            ))}
          </Select>
          {targetSections.length > 0 && (
            <Select
              className="sel"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              <option value="">লক্ষ্য শাখা নির্বাচন করুন</option>
              {targetSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.nameBn)}
                </option>
              ))}
            </Select>
          )}
          <Select
            className="sel"
            value={sourceExamId}
            onChange={(e) => {
              setSourceExamId(e.target.value);
              setUseMerit(Boolean(e.target.value));
            }}
          >
            <option value="">উৎস বার্ষিক/প্রকাশিত পরীক্ষা নির্বাচন করুন</option>
            {sourceExams.map((e) => (
              <option key={e.id} value={e.id}>
                {String(e.nameBn)}
                {String(e.examType ?? "")
                  .toLowerCase()
                  .includes("annual") || String(e.nameBn).includes("বার্ষিক")
                  ? " — বার্ষিক"
                  : ""}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useMerit}
              onChange={(e) => setUseMerit(e.target.checked)}
            />{" "}
            মেধা অনুযায়ী নতুন রোল দাও
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void makePreview()}>প্রিভিউ দেখুন</Button>
            {preview && (
              <Button onClick={() => void apply()}>
                নিশ্চিত করে প্রমোট করুন
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {preview && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>প্রস্তাবিত রোল — সংরক্ষণের আগে যাচাই করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tbl-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>মেধা</th>
                    <th>নাম</th>
                    <th>আগের রোল</th>
                    <th>মোট নম্বর</th>
                    <th>নতুন রোল</th>
                    <th>নোট</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.studentId}>
                      <td>
                        {r.isPassed === false && (
                          <Badge variant="destructive">ফেল</Badge>
                        )}{" "}
                        {show(r.meritPosition)}
                      </td>
                      <td>{r.nameBn}</td>
                      <td>{show(r.oldRoll)}</td>
                      <td>{show(r.totalMarks)}</td>
                      <td>
                        <Input
                          type="number"
                          min={1}
                          value={r.newRoll ?? ""}
                          onChange={(e) =>
                            setPreview(
                              (items) =>
                                items?.map((x) =>
                                  x.studentId === r.studentId
                                    ? {
                                        ...x,
                                        newRoll:
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                      }
                                    : x,
                                ) ?? null,
                            )
                          }
                        />
                      </td>
                      <td>{show(r.note)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
