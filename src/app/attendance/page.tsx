"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminSWR } from "@/lib/swr";
import { bn, bnNum } from "@/lib/format";

type Me = { user?: { role?: "ADMIN" | "TEACHER" | "STUDENT" } };
type Assignment = {
  id: string;
  subjectId: string;
  subjectNameBn: string;
  classId: string;
  classNameBn: string;
  sectionId: string | null;
  sectionNameBn: string | null;
};
type ClassRow = { id: string; nameBn: string };
type SectionRow = { id: string; nameBn: string; classId: string };
type Status = "PRESENT" | "ABSENT" | "LEAVE";
type RosterRow = {
  id: string;
  registrationNumber: string | null;
  nameBn: string;
  roll: number | null;
  status: Status;
};

function todayLocal(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

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

export default function AttendancePage() {
  const { data: mePayload } = useAdminSWR<Me>("/api/auth/me");
  const role = mePayload?.user?.role;
  const isTeacher = role === "TEACHER";

  const { data: assignmentsPayload } = useAdminSWR<{ data?: Assignment[] }>(
    isTeacher ? "/api/backend/teacher/portal/assignments" : null,
  );
  const { data: classesPayload } = useAdminSWR<{ data?: ClassRow[] }>(
    role === "ADMIN" ? "/api/backend/academics/classes" : null,
  );
  const { data: sectionsPayload } = useAdminSWR<{ data?: SectionRow[] }>(
    role === "ADMIN" ? "/api/backend/academics/sections" : null,
  );

  const assignments = useMemo(
    () => assignmentsPayload?.data ?? [],
    [assignmentsPayload],
  );

  const classOptions = useMemo<ClassRow[]>(() => {
    if (role === "ADMIN") return classesPayload?.data ?? [];
    if (isTeacher) {
      const seen = new Map<string, ClassRow>();
      for (const row of assignments) {
        if (!seen.has(row.classId))
          seen.set(row.classId, { id: row.classId, nameBn: row.classNameBn });
      }
      return [...seen.values()];
    }
    return [];
  }, [role, isTeacher, classesPayload, assignments]);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);

  const sectionOptions = useMemo<SectionRow[]>(() => {
    if (!classId) return [];
    if (role === "ADMIN")
      return (sectionsPayload?.data ?? []).filter(
        (row) => row.classId === classId,
      );
    const seen = new Map<string, SectionRow>();
    for (const row of assignments) {
      if (row.classId === classId && row.sectionId && row.sectionNameBn) {
        if (!seen.has(row.sectionId))
          seen.set(row.sectionId, {
            id: row.sectionId,
            nameBn: row.sectionNameBn,
            classId: row.classId,
          });
      }
    }
    return [...seen.values()];
  }, [classId, role, sectionsPayload, assignments]);

  const counts = useMemo(
    () => ({
      present: rows.filter((row) => row.status === "PRESENT").length,
      absent: rows.filter((row) => row.status === "ABSENT").length,
      leave: rows.filter((row) => row.status === "LEAVE").length,
    }),
    [rows],
  );

  const noAssignments =
    isTeacher && assignmentsPayload !== undefined && assignments.length === 0;

  async function load() {
    if (!classId) {
      setMessageOk(false);
      setMessage("আগে শ্রেণি নির্বাচন করুন।");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ classId });
      if (sectionId) params.set("sectionId", sectionId);
      const response = await fetch(
        `/api/backend/attendance/roster?${params.toString()}`,
      );
      if (!response.ok) {
        setMessageOk(false);
        setMessage(
          await serverMessage(response, "শিক্ষার্থী তালিকা লোড করা যায়নি।"),
        );
        setRows([]);
        setLoaded(false);
        return;
      }
      const payload = (await response.json()) as {
        data?: Omit<RosterRow, "status">[];
      };
      setRows(
        (payload.data ?? []).map((row) => ({ ...row, status: "PRESENT" as Status })),
      );
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backend/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sectionId: sectionId || undefined,
          date,
          entries: rows.map((row) => ({
            studentId: row.id,
            status: row.status,
          })),
        }),
      });
      if (!response.ok) {
        setMessageOk(false);
        setMessage(
          await serverMessage(response, "হাজিরা সংরক্ষণ করা যায়নি।"),
        );
        return;
      }
      setMessageOk(true);
      setMessage(`হাজিরা সংরক্ষণ হয়েছে — মোট ${bnNum(rows.length)} জন।`);
    } finally {
      setBusy(false);
    }
  }

  function setStatus(id: string, status: Status) {
    setRows((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">হাজিরা নেওয়া</h2>
          <p className="cs">
            শ্রেণি ও শাখা বেছে শিক্ষার্থী তালিকা আনুন — ডিফল্টভাবে সবাই উপস্থিত
            থাকে, শুধু অনুপস্থিত/ছুটি বদলালেই হবে।
          </p>
        </div>
      </div>

      {message && (
        <p className={`alert ${messageOk ? "g" : "r"}`}>{message}</p>
      )}

      {noAssignments ? (
        <div className="card">
          <p className="admin-empty">
            আপনার কোনো শ্রেণি বরাদ্দ নেই — প্রশাসকের সাথে যোগাযোগ করুন।
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="filterbar">
              <div className="fld">
                <label className="lbl" htmlFor="att-class">
                  শ্রেণি
                </label>
                <select
                  id="att-class"
                  className="sel"
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setSectionId("");
                    setRows([]);
                    setLoaded(false);
                  }}
                >
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.nameBn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="att-section">
                  শাখা
                </label>
                <select
                  id="att-section"
                  className="sel"
                  value={sectionId}
                  disabled={!classId}
                  onChange={(event) => {
                    setSectionId(event.target.value);
                    setRows([]);
                    setLoaded(false);
                  }}
                >
                  <option value="">সব শাখা</option>
                  {sectionOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.nameBn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="att-date">
                  তারিখ
                </label>
                <input
                  id="att-date"
                  className="inp"
                  type="date"
                  value={date}
                  disabled={isTeacher}
                  onChange={(event) => setDate(event.target.value)}
                />
                {isTeacher && (
                  <p className="hint">শিক্ষক শুধু আজকের হাজিরা নিতে পারবেন।</p>
                )}
              </div>
              <span className="sp" style={{ flex: 1 }} />
              <Button
                type="button"
                className="btn"
                disabled={busy || !classId}
                onClick={() => void load()}
              >
                শিক্ষার্থী দেখুন
              </Button>
            </div>
          </div>

          {loaded && (
            <div className="rowflex">
              <span className="chip g">উপস্থিত: {bnNum(counts.present)} জন</span>
              <span className="chip r">অনুপস্থিত: {bnNum(counts.absent)} জন</span>
              <span className="chip w">ছুটি: {bnNum(counts.leave)} জন</span>
              <span className="chip gr">মোট: {bnNum(rows.length)} জন</span>
              <span className="sp" style={{ flex: 1 }} />
              <Button
                type="button"
                className="btn sec sm"
                onClick={() =>
                  setRows((items) =>
                    items.map((item) => ({ ...item, status: "PRESENT" as Status })),
                  )
                }
              >
                সবাইকে উপস্থিত ধরুন
              </Button>
            </div>
          )}

          <div className="card flush">
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>রোল</th>
                    <th>শিক্ষার্থী</th>
                    <th>রেজিস্ট্রেশন নম্বর</th>
                    <th className="r">আজকের অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="num">
                        {row.roll != null ? bn(row.roll) : "—"}
                      </td>
                      <td className="b">{row.nameBn}</td>
                      <td className="num">{bn(row.registrationNumber ?? "—")}</td>
                      <td className="r">
                        <span className="seg">
                          <button
                            type="button"
                            className={row.status === "PRESENT" ? "on-g" : ""}
                            onClick={() => setStatus(row.id, "PRESENT")}
                          >
                            উপস্থিত
                          </button>
                          <button
                            type="button"
                            className={row.status === "ABSENT" ? "on-r" : ""}
                            onClick={() => setStatus(row.id, "ABSENT")}
                          >
                            অনুপস্থিত
                          </button>
                          <button
                            type="button"
                            className={row.status === "LEAVE" ? "on-w" : ""}
                            onClick={() => setStatus(row.id, "LEAVE")}
                          >
                            ছুটি
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <p className="admin-empty" style={{ padding: "18px" }}>
                {loaded
                  ? "এই শ্রেণিতে কোনো শিক্ষার্থী পাওয়া যায়নি।"
                  : "শ্রেণি নির্বাচন করে “শিক্ষার্থী দেখুন” চাপুন।"}
              </p>
            )}
            {rows.length > 0 && (
              <div
                className="rowflex"
                style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}
              >
                <span className="small muted">
                  জমা দিলে হাজিরা অ্যাডমিনের রিপোর্ট ও ছাত্র পোর্টালে সঙ্গে সঙ্গে
                  দেখা যাবে।
                </span>
                <span className="sp" style={{ flex: 1 }} />
                <Button
                  type="button"
                  className="btn grn"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  সংরক্ষণ করুন
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
