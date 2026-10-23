"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminSWR } from "@/lib/swr";
import { bn, bnNum } from "@/lib/format";

type Me = { user?: { role?: "ADMIN" | "TEACHER" | "STUDENT" } };
type Exam = {
  id: string;
  nameBn: string;
  classId: string;
  classNameBn: string;
  sessionName?: string;
  sessionYear?: number;
};
type ExamSubject = {
  id: string;
  subjectId: string;
  subjectNameBn: string;
  fullMarks: number;
  passMarks: number;
  cqMarks: number;
  mcqMarks: number;
  practicalMarks: number;
};
type Assignment = {
  id: string;
  subjectId: string;
  classId: string;
};
type RosterStudent = {
  id: string;
  registrationNumber: string | null;
  nameBn: string;
  roll: number | null;
};
type MarkRowApi = {
  id: string;
  studentId: string;
  cq: number | null;
  mcq: number | null;
  practical: number | null;
  isAbsent: boolean;
  isSubmitted: boolean;
  isLocked: boolean;
  studentNameBn: string;
  registrationNumber: string | null;
  roll: number | null;
};
type GridRow = {
  studentId: string;
  nameBn: string;
  registrationNumber: string | null;
  roll: number | null;
  cq: string;
  mcq: string;
  practical: string;
  isAbsent: boolean;
  isSubmitted: boolean;
  isLocked: boolean;
  rowMessage: string;
  rowError: boolean;
};

async function serverMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = (await response
    .json()
    .catch(() => null)) as { message?: string | string[]; error?: string } | null;
  if (Array.isArray(payload?.message)) return payload.message.join(" ");
  return payload?.message ?? payload?.error ?? fallback;
}

function numText(value: number | null): string {
  return value == null ? "" : String(value);
}

export default function MarksEntryPage() {
  const { data: mePayload } = useAdminSWR<Me>("/api/auth/me");
  const role = mePayload?.user?.role;
  const isTeacher = role === "TEACHER";

  const { data: examsPayload } = useAdminSWR<{ data?: Exam[] }>(
    role ? "/api/backend/results/exams" : null,
  );
  const { data: assignmentsPayload } = useAdminSWR<{ data?: Assignment[] }>(
    isTeacher ? "/api/backend/teacher/portal/assignments" : null,
  );

  const [examId, setExamId] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");
  const [rows, setRows] = useState<GridRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);

  const exams = useMemo(() => examsPayload?.data ?? [], [examsPayload]);
  const exam = useMemo(
    () => exams.find((row) => row.id === examId) ?? null,
    [exams, examId],
  );

  const { data: subjectsPayload } = useAdminSWR<{ data?: ExamSubject[] }>(
    examId ? `/api/backend/results/exam-subjects?examId=${examId}` : null,
  );

  const subjects = useMemo(() => {
    const all = subjectsPayload?.data ?? [];
    if (!isTeacher || !exam) return all;
    const mine = assignmentsPayload?.data ?? [];
    return all.filter((subject) =>
      mine.some(
        (row) => row.subjectId === subject.subjectId && row.classId === exam.classId,
      ),
    );
  }, [subjectsPayload, isTeacher, exam, assignmentsPayload]);

  const subject = useMemo(
    () => subjects.find((row) => row.id === examSubjectId) ?? null,
    [subjects, examSubjectId],
  );

  async function loadGrid(nextExam: Exam, nextSubject: ExamSubject) {
    setBusy(true);
    setMessage("");
    try {
      const rosterParams = new URLSearchParams({ classId: nextExam.classId });
      const [rosterResponse, marksResponse] = await Promise.all([
        fetch(`/api/backend/attendance/roster?${rosterParams.toString()}`),
        fetch(
          `/api/backend/results/marks?examSubjectId=${encodeURIComponent(nextSubject.id)}`,
        ),
      ]);
      if (!rosterResponse.ok) {
        setMessageOk(false);
        setMessage(
          await serverMessage(rosterResponse, "শিক্ষার্থী তালিকা লোড করা যায়নি।"),
        );
        setRows([]);
        return;
      }
      const rosterPayload = (await rosterResponse.json()) as {
        data?: RosterStudent[];
      };
      const marksPayload = marksResponse.ok
        ? ((await marksResponse.json()) as { data?: MarkRowApi[] })
        : { data: [] as MarkRowApi[] };
      const marksByStudent = new Map(
        (marksPayload.data ?? []).map((row) => [row.studentId, row]),
      );
      const roster = rosterPayload.data ?? [];
      const merged: GridRow[] = roster.map((student) => {
        const mark = marksByStudent.get(student.id);
        return {
          studentId: student.id,
          nameBn: student.nameBn,
          registrationNumber: student.registrationNumber,
          roll: student.roll,
          cq: numText(mark?.cq ?? null),
          mcq: numText(mark?.mcq ?? null),
          practical: numText(mark?.practical ?? null),
          isAbsent: mark?.isAbsent ?? false,
          isSubmitted: mark?.isSubmitted ?? false,
          isLocked: mark?.isLocked ?? false,
          rowMessage: "",
          rowError: false,
        };
      });
      // Marks may exist for students no longer on the roster — surface them too.
      for (const mark of marksPayload.data ?? []) {
        if (!merged.some((row) => row.studentId === mark.studentId)) {
          merged.push({
            studentId: mark.studentId,
            nameBn: mark.studentNameBn,
            registrationNumber: mark.registrationNumber,
            roll: mark.roll,
            cq: numText(mark.cq),
            mcq: numText(mark.mcq),
            practical: numText(mark.practical),
            isAbsent: mark.isAbsent,
            isSubmitted: mark.isSubmitted,
            isLocked: mark.isLocked,
            rowMessage: "",
            rowError: false,
          });
        }
      }
      merged.sort((a, b) => (a.roll ?? 9999) - (b.roll ?? 9999));
      setRows(merged);
    } finally {
      setBusy(false);
    }
  }

  function patchRow(studentId: string, patch: Partial<GridRow>) {
    setRows((items) =>
      items.map((item) =>
        item.studentId === studentId ? { ...item, ...patch } : item,
      ),
    );
  }

  async function saveRow(row: GridRow): Promise<boolean> {
    if (!subject) return false;
    if (row.isLocked) {
      patchRow(row.studentId, {
        rowMessage: "লক করা — আনলক করতে অ্যাডমিনের অনুমতি লাগবে",
        rowError: true,
      });
      return false;
    }
    const response = await fetch("/api/backend/results/marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examSubjectId: subject.id,
        studentId: row.studentId,
        cq: row.isAbsent ? 0 : Number(row.cq || 0),
        mcq: row.isAbsent ? 0 : Number(row.mcq || 0),
        practical: row.isAbsent ? 0 : Number(row.practical || 0),
        isAbsent: row.isAbsent,
      }),
    });
    if (!response.ok) {
      const text = await serverMessage(response, "নম্বর সংরক্ষণ করা যায়নি।");
      patchRow(row.studentId, {
        rowMessage: /লক|lock/i.test(text)
          ? "লক করা — আনলক করতে অ্যাডমিনের অনুমতি লাগবে"
          : text,
        rowError: true,
      });
      return false;
    }
    patchRow(row.studentId, {
      isSubmitted: true,
      isLocked: isTeacher ? true : row.isLocked,
      rowMessage: "জমা হয়েছে",
      rowError: false,
    });
    return true;
  }

  async function saveAll() {
    setBusy(true);
    setMessage("");
    let saved = 0;
    const failures: string[] = [];
    for (const row of rows) {
      if (row.isLocked) continue;
      const ok = await saveRow(row);
      if (ok) saved += 1;
      else failures.push(row.nameBn);
    }
    setBusy(false);
    if (failures.length === 0) {
      setMessageOk(true);
      setMessage(`সব নম্বর জমা হয়েছে — মোট ${bnNum(saved)} জন।`);
    } else {
      setMessageOk(false);
      setMessage(
        `${bnNum(saved)} জনের নম্বর জমা হয়েছে। যাদের জমা হয়নি: ${failures.join(", ")} — লক করা থাকলে আনলক করতে অ্যাডমিনের অনুমতি লাগবে।`,
      );
    }
  }

  function totalOf(row: GridRow): number | null {
    if (row.isAbsent) return 0;
    if (row.cq === "" && row.mcq === "" && row.practical === "") return null;
    return Number(row.cq || 0) + Number(row.mcq || 0) + Number(row.practical || 0);
  }

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">নম্বর এন্ট্রি</h2>
          <p className="cs">
            পরীক্ষা ও বিষয় বেছে পুরো শ্রেণির নম্বর একসাথে বসান — মোট নম্বর
            নিজে থেকেই হিসাব হয়।
          </p>
        </div>
      </div>

      <div className="alert w">
        <span>
          জমা দেওয়ার পর শিক্ষকের এন্ট্রি লক হয়ে যায় — নম্বর বদলাতে হলে
          অ্যাডমিনের অনুমতি লাগবে। লক করা সারি শিক্ষক সম্পাদনা করতে পারবেন না।
        </span>
      </div>

      {message && <p className={`alert ${messageOk ? "g" : "r"}`}>{message}</p>}

      <div className="card">
        <div className="filterbar">
          <div className="fld">
            <label className="lbl" htmlFor="marks-exam">
              পরীক্ষা
            </label>
            <select
              id="marks-exam"
              className="sel"
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setExamSubjectId("");
                setRows([]);
              }}
            >
              <option value="">পরীক্ষা নির্বাচন করুন</option>
              {exams.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nameBn} · {row.classNameBn}
                  {row.sessionName ? ` · ${row.sessionName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label className="lbl" htmlFor="marks-subject">
              বিষয়
            </label>
            <select
              id="marks-subject"
              className="sel"
              value={examSubjectId}
              disabled={!examId}
              onChange={(event) => {
                const nextId = event.target.value;
                setExamSubjectId(nextId);
                setRows([]);
                const nextSubject = subjects.find((row) => row.id === nextId);
                if (exam && nextSubject) void loadGrid(exam, nextSubject);
              }}
            >
              <option value="">বিষয় নির্বাচন করুন</option>
              {subjects.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.subjectNameBn} · পূর্ণ নম্বর {bn(row.fullMarks)}
                </option>
              ))}
            </select>
          </div>
          <span className="sp" style={{ flex: 1 }} />
          {subject && (
            <>
              <span className="chip b">
                পূর্ণমান {bn(subject.fullMarks)} · পাস {bn(subject.passMarks)}
              </span>
              <span className="chip gr">{exam?.classNameBn}</span>
            </>
          )}
        </div>
        {isTeacher && examId && subjectsPayload && subjects.length === 0 && (
          <p className="admin-empty" style={{ marginTop: 12 }}>
            এই পরীক্ষায় আপনার বরাদ্দকৃত কোনো বিষয় নেই।
          </p>
        )}
      </div>

      <div className="card flush">
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 56 }}>রোল</th>
                <th>শিক্ষার্থী</th>
                <th className="c">
                  সৃজনশীল{subject?.cqMarks ? ` (${bn(subject.cqMarks)})` : ""}
                </th>
                <th className="c">
                  বহুনির্বাচনি{subject?.mcqMarks ? ` (${bn(subject.mcqMarks)})` : ""}
                </th>
                <th className="c">
                  ব্যবহারিক
                  {subject?.practicalMarks ? ` (${bn(subject.practicalMarks)})` : ""}
                </th>
                <th className="c">মোট</th>
                <th className="c">অনুপস্থিত</th>
                <th>অবস্থা</th>
                <th className="r">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = totalOf(row);
                return (
                  <tr key={row.studentId}>
                    <td className="num">{row.roll != null ? bn(row.roll) : "—"}</td>
                    <td>
                      <span className="b">{row.nameBn}</span>
                      <span className="ds small muted" style={{ display: "block" }}>
                        রেজি: {bn(row.registrationNumber ?? "—")}
                      </span>
                      {row.rowMessage && (
                        <span
                          className="small"
                          style={{
                            display: "block",
                            color: row.rowError ? "var(--red)" : "var(--green)",
                          }}
                        >
                          {row.rowMessage}
                        </span>
                      )}
                    </td>
                    {(["cq", "mcq", "practical"] as const).map((field) => {
                      const max =
                        field === "cq"
                          ? subject?.cqMarks
                          : field === "mcq"
                            ? subject?.mcqMarks
                            : subject?.practicalMarks;
                      return (
                        <td className="c" key={field}>
                          {max ? (
                            <input
                              className="inp num"
                              style={{ width: 84, height: 36, textAlign: "center" }}
                              inputMode="numeric"
                              disabled={row.isLocked || row.isAbsent || busy}
                              value={row[field]}
                              onChange={(event) =>
                                patchRow(row.studentId, {
                                  [field]: event.target.value.replace(/[^0-9]/g, ""),
                                })
                              }
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                    <td className="c b num">{total == null ? "—" : bn(total)}</td>
                    <td className="c">
                      <input
                        type="checkbox"
                        disabled={row.isLocked || busy}
                        checked={row.isAbsent}
                        onChange={(event) =>
                          patchRow(row.studentId, { isAbsent: event.target.checked })
                        }
                      />
                    </td>
                    <td>
                      {row.isLocked ? (
                        <span className="chip r">লক করা</span>
                      ) : row.isSubmitted ? (
                        <span className="chip g">জমা হয়েছে</span>
                      ) : (
                        <span className="chip gr">খসড়া</span>
                      )}
                    </td>
                    <td className="r">
                      <Button
                        type="button"
                        className="btn gho sm"
                        disabled={busy || row.isLocked}
                        onClick={() => void saveRow(row)}
                      >
                        জমা
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="admin-empty" style={{ padding: "18px" }}>
            {subject
              ? "এই শ্রেণিতে কোনো শিক্ষার্থী পাওয়া যায়নি।"
              : "পরীক্ষা ও বিষয় নির্বাচন করলে শিক্ষার্থীদের তালিকা আসবে।"}
          </p>
        )}
        {rows.length > 0 && (
          <div
            className="rowflex"
            style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}
          >
            <Button
              type="button"
              className="btn grn"
              disabled={busy}
              onClick={() => void saveAll()}
            >
              সব জমা দিন
            </Button>
            <span className="small muted">
              লক করা সারি বাদ যাবে — সেগুলো বদলাতে অ্যাডমিনের অনুমতি লাগবে।
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
