"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  RoomGraphic,
  type RoomLayout,
} from "@/components/seat-plans/room-graphic";
import { bn, bnDate, bnNum, WEEKDAYS_BN } from "@/lib/format";
type Row = Record<string, unknown> & { id: string };
type Room = Row & {
  nameBn: string;
  layout: RoomLayout;
  isActive: boolean;
  building?: string | null;
  floor?: string | null;
};
type Assignment = {
  seatNo: number;
  benchRow: number;
  benchColumn: number;
  benchSlot: number;
  benchPosition: string | null;
  roll: number | null;
  registrationNumber: string | null;
};
type GeneratedRoom = Room & {
  roomTeacherName: string;
  capacity: number;
  seated: number;
  assignments: Assignment[];
};
type Generated = {
  sittingDate: string;
  shift: string;
  pattern: string;
  perBench: number;
  assigned: number;
  capacity: number;
  rooms: GeneratedRoom[];
};
function Spinner() {
  return (
    <span aria-hidden="true" className="inline-block animate-spin">
      ◌
    </span>
  );
}
function positionLabel(value: string | null) {
  return value === "left"
    ? "বাম"
    : value === "middle"
      ? "মাঝ"
      : value === "right"
        ? "ডান"
        : "";
}
export default function SeatPlansPage() {
  const toast = useToast();
  const [exams, setExams] = useState<Row[]>([]),
    [subjects, setSubjects] = useState<Row[]>([]),
    [classes, setClasses] = useState<Row[]>([]),
    [sections, setSections] = useState<Row[]>([]),
    [students, setStudents] = useState<Row[]>([]),
    [rooms, setRooms] = useState<Room[]>([]);
  const [examId, setExamId] = useState(""),
    [subjectId, setSubjectId] = useState(""),
    [date, setDate] = useState(""),
    [shift, setShift] = useState("সকাল"),
    [selectedStudents, setSelectedStudents] = useState<string[]>([]),
    [selectedRooms, setSelectedRooms] = useState<string[]>([]),
    [teachers, setTeachers] = useState<Record<string, string>>({}),
    [pattern, setPattern] = useState<"roll" | "registration">("roll"),
    [perBench, setPerBench] = useState("1"),
    [schoolName, setSchoolName] = useState("বিদ্যালয়"),
    [generated, setGenerated] = useState<Generated | null>(null),
    [expandedClasses, setExpandedClasses] = useState<string[]>([]),
    [pending, setPending] = useState("");
  useEffect(() => {
    void (async () => {
      try {
        const [e, c, s, p, r, school] = await Promise.all([
          fetch("/api/backend/results/exams"),
          fetch("/api/backend/academics/classes"),
          fetch("/api/backend/academics/sections"),
          fetch("/api/backend/people/students"),
          fetch("/api/backend/rooms"),
          fetch("/api/school-settings"),
        ]);
        const examPayload = (await e.json()) as { data?: Row[] };
        setExams(examPayload.data ?? []);
        setClasses(((await c.json()) as { data?: Row[] }).data ?? []);
        setSections(((await s.json()) as { data?: Row[] }).data ?? []);
        setStudents(((await p.json()) as { data?: Row[] }).data ?? []);
        setRooms(((await r.json()) as { data?: Room[] }).data ?? []);
        const schoolPayload = (await school.json()) as { data?: Row };
        setSchoolName(String(schoolPayload.data?.nameBn ?? "বিদ্যালয়"));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "তথ্য লোড করা যায়নি",
        );
      }
    })();
  }, []);
  useEffect(() => {
    if (!examId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }
    void fetch(`/api/backend/results/exam-subjects?examId=${examId}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: Row[];
          message?: string;
        };
        if (!response.ok)
          throw new Error(payload.message ?? "বিষয় লোড করা যায়নি");
        setSubjects(payload.data ?? []);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "বিষয় লোড করা যায়নি",
        ),
      );
  }, [examId]);
  const activeStudents = useMemo(
    () => students.filter((student) => student.isActive !== false),
    [students],
  );
  const classStudents = (classId: string) =>
    activeStudents.filter((student) => String(student.classId) === classId);
  const sectionStudents = (sectionId: string) =>
    activeStudents.filter((student) => String(student.sectionId) === sectionId);
  const benches = useMemo(
    () =>
      selectedRooms.reduce(
        (total, id) =>
          total +
          (rooms.find((room) => room.id === id)?.layout ?? []).reduce(
            (sum, row) => sum + Number(row.benches),
            0,
          ),
        0,
      ),
    [selectedRooms, rooms],
  );
  const capacity = benches * Number(perBench);
  function selectStudents(ids: string[], checked: boolean) {
    setSelectedStudents((current) =>
      checked
        ? [...new Set([...current, ...ids])]
        : current.filter((id) => !ids.includes(id)),
    );
  }
  async function generate() {
    if (!subjectId || !selectedStudents.length || !selectedRooms.length) {
      toast.error("বিষয়, শিক্ষার্থী ও অন্তত একটি সক্রিয় রুম নির্বাচন করুন");
      return;
    }
    if (capacity < selectedStudents.length) {
      toast.error("আসন কম — আরও রুম যোগ করুন");
      return;
    }
    setPending("generate");
    try {
      const response = await fetch("/api/backend/seat-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSubjectIds: [subjectId],
          studentIds: selectedStudents,
          roomIds: selectedRooms,
          pattern,
          perBench: Number(perBench),
          sittingDate: date,
          shift,
          roomTeacherNames: teachers,
        }),
      });
      const payload = (await response.json()) as {
        data?: Generated;
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "আসন তৈরি করা যায়নি");
      setGenerated(payload.data ?? null);
      toast.success("আসন বিন্যাস তৈরি হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "আসন তৈরি করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  function print() {
    document.body.dataset.ephemeralSeatPrint = "true";
    window.requestAnimationFrame(() =>
      window.setTimeout(() => window.print(), 30),
    );
    window.addEventListener(
      "afterprint",
      () => delete document.body.dataset.ephemeralSeatPrint,
      { once: true },
    );
  }
  return (
    <main className="content seat-ephemeral-page">
      <div className="page-heading ephemeral-no-print">
        <div>
          <h1>আসন বিন্যাস</h1>
          <p>
            প্রিন্টের জন্য সাময়িকভাবে আসন তৈরি করুন। এটি সংরক্ষণ করা হয় না।
          </p>
        </div>
      </div>
      <div className="ephemeral-no-print seat-ephemeral-form">
        <Card>
          <CardHeader>
            <CardTitle>১. পরীক্ষা ও বিষয়</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              >
                <option value="">পরীক্ষা নির্বাচন</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {String(exam.nameBn ?? "পরীক্ষা")} — শ্রেণি{" "}
                    {String(exam.classNameBn ?? "—")}
                  </option>
                ))}
              </Select>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!examId}
              >
                <option value="">বিষয় নির্বাচন</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {String(subject.subjectNameBn ?? subject.nameBn ?? "বিষয়")}
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
            </div>
            {!subjectId && (
              <p className="mt-3 text-sm text-muted-foreground">
                আগে পরীক্ষা ও বিষয় বাছুন
              </p>
            )}
          </CardContent>
        </Card>
        {subjectId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>২. ক্লাস ও শিক্ষার্থী বাছাই</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {classes.map((academicClass) => {
                    const classRows = classStudents(academicClass.id);
                    const classSelected = classRows.filter((s) =>
                      selectedStudents.includes(s.id),
                    ).length;
                    const classSections = sections.filter(
                      (section) =>
                        String(section.classId) === String(academicClass.id),
                    );
                    return (
                      <div
                        className="seat-selection-class"
                        key={String(academicClass.id)}
                      >
                        <div className="flex items-center justify-between">
                          <label className="font-semibold">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={
                                classRows.length > 0 &&
                                classSelected === classRows.length
                              }
                              onChange={(e) =>
                                selectStudents(
                                  classRows.map((s) => s.id),
                                  e.target.checked,
                                )
                              }
                            />
                            সবাই — শ্রেণি {String(academicClass.nameBn ?? "—")}{" "}
                            ({classSelected}/{classRows.length})
                          </label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setExpandedClasses((current) =>
                                current.includes(academicClass.id)
                                  ? current.filter(
                                      (id) => id !== academicClass.id,
                                    )
                                  : [...current, academicClass.id],
                              )
                            }
                          >
                            {expandedClasses.includes(academicClass.id)
                              ? "গুটান"
                              : "শিক্ষার্থী দেখুন"}
                          </Button>
                        </div>
                        {classSections.map((section) => {
                          const rows = sectionStudents(section.id);
                          const chosen = rows.filter((s) =>
                            selectedStudents.includes(s.id),
                          ).length;
                          return (
                            <div className="ml-4" key={String(section.id)}>
                              <label>
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={
                                    rows.length > 0 && chosen === rows.length
                                  }
                                  onChange={(e) =>
                                    selectStudents(
                                      rows.map((s) => s.id),
                                      e.target.checked,
                                    )
                                  }
                                />
                                {String(section.nameBn ?? "শাখা")}
                                {section.groupName
                                  ? ` — ${String(section.groupName)}`
                                  : ""}{" "}
                                ({chosen}/{rows.length})
                              </label>
                              {expandedClasses.includes(academicClass.id) && (
                                <div className="grid gap-1 pl-6 pt-2 sm:grid-cols-2">
                                  {rows.map((student) => (
                                    <label
                                      className="text-sm"
                                      key={String(student.id)}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={selectedStudents.includes(
                                          student.id,
                                        )}
                                        onChange={(e) =>
                                          selectStudents(
                                            [student.id],
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      {String(
                                        student.nameBn ??
                                          student.displayNameBn ??
                                          "শিক্ষার্থী",
                                      )}{" "}
                                      · রোল{" "}
                                      {student.roll == null
                                        ? "—"
                                        : String(student.roll)}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>৩. রুম ও আসন বিন্যাস</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {rooms
                    .filter((room) => room.isActive)
                    .map((room) => (
                      <Button
                        key={room.id}
                        size="sm"
                        variant={
                          selectedRooms.includes(room.id)
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setSelectedRooms((current) =>
                            current.includes(room.id)
                              ? current.filter((id) => id !== room.id)
                              : [...current, room.id],
                          )
                        }
                      >
                        {room.nameBn} ·{" "}
                        {room.layout.reduce(
                          (sum, row) => sum + row.benches,
                          0,
                        ) * Number(perBench)}{" "}
                        আসন
                      </Button>
                    ))}
                </div>
                {selectedRooms.map((id) => (
                  <div className="mt-2 flex items-center gap-2" key={id}>
                    <span>{rooms.find((room) => room.id === id)?.nameBn}</span>
                    <Input
                      className="max-w-xs"
                      placeholder="দায়িত্বপ্রাপ্ত শিক্ষক"
                      value={teachers[id] ?? ""}
                      onChange={(e) =>
                        setTeachers((current) => ({
                          ...current,
                          [id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Select
                    value={pattern}
                    onChange={(e) =>
                      setPattern(e.target.value as "roll" | "registration")
                    }
                  >
                    <option value="roll">রোল ধরে</option>
                    <option value="registration">রেজিস্ট্রেশন নম্বর ধরে</option>
                  </Select>
                  <Select
                    value={perBench}
                    onChange={(e) => setPerBench(e.target.value)}
                  >
                    <option value="1">প্রতি বেঞ্চে ১ জন</option>
                    <option value="2">প্রতি বেঞ্চে ২ জন</option>
                    <option value="3">প্রতি বেঞ্চে ৩ জন</option>
                  </Select>
                </div>
                <p className="mt-4">
                  বাছাই করা শিক্ষার্থী {bnNum(selectedStudents.length)} · মোট
                  বেঞ্চ {bnNum(benches)} · বসানো যাবে {bnNum(capacity)}
                </p>
                {capacity < selectedStudents.length && (
                  <p className="text-destructive">আসন কম — আরও রুম যোগ করুন</p>
                )}
                <Button
                  className="mt-3"
                  disabled={
                    Boolean(pending) ||
                    capacity < selectedStudents.length ||
                    !selectedStudents.length
                  }
                  onClick={() => void generate()}
                >
                  {pending === "generate" && <Spinner />} জেনারেট
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      {generated && (
        <section className="ephemeral-preview ephemeral-no-print">
          <Card>
            <CardHeader>
              <CardTitle>৪. প্রিভিউ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                এই আসনবিন্যাস সংরক্ষিত হয় না — প্রিন্ট বা PDF নিয়ে নিন। পেজ
                ছাড়লে আবার তৈরি করতে হবে।
              </p>
              {generated.rooms.map((room) => (
                <div className="mb-5" key={String(room.roomId)}>
                  <h3>
                    {String(room.roomName)} · বসানো {bnNum(room.seated)} /{" "}
                    {bnNum(room.capacity)}
                  </h3>
                  <RoomGraphic
                    layout={room.layout}
                    assignments={room.assignments}
                  />
                </div>
              ))}
              <Button onClick={print}>সব রুম একসাথে প্রিন্ট</Button>
            </CardContent>
          </Card>
        </section>
      )}
      <section className="ephemeral-print">
        {generated && (
          <>
            <div className="ephemeral-print-header">
              <h1>{schoolName}</h1>
              <h2>আসন বিন্যাস</h2>
              <p className="ephemeral-date">
                {bnDate(generated.sittingDate)} ·{" "}
                {
                  WEEKDAYS_BN[
                    new Date(`${generated.sittingDate}T00:00:00`).getDay()
                  ]
                }
              </p>
              <p>
                {String(
                  exams.find((exam) => exam.id === examId)?.nameBn ?? "পরীক্ষা",
                )}{" "}
                ·{" "}
                {String(
                  subjects.find((subject) => subject.id === subjectId)
                    ?.subjectNameBn ?? "বিষয়",
                )}{" "}
                · {generated.shift}
              </p>
            </div>
            {generated.rooms.map((room) => (
              <article className="ephemeral-print-room" key={String(room.roomId)}>
                <h2>
                  {String(room.roomName)}{" "}
                  {[room.building, room.floor].filter(Boolean).join(" / ")}
                </h2>
                <div className="ephemeral-board">বোর্ড / শিক্ষকের দিক</div>
                <table>
                  <tbody>
                    {room.layout.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th>সারি {bn(String(rowIndex + 1))}</th>
                        {Array.from(
                          { length: row.benches },
                          (_, benchIndex) => {
                            const seats = room.assignments.filter(
                              (assignment) =>
                                assignment.benchRow === rowIndex + 1 &&
                                assignment.benchColumn === benchIndex + 1,
                            );
                            return (
                              <td key={benchIndex}>
                                {seats.length
                                  ? seats.map((seat, index) => (
                                      <span
                                        className="ephemeral-seat-number"
                                        key={`${seat.seatNo}-${index}`}
                                      >
                                        {bn(
                                          String(
                                            generated.pattern === "roll"
                                              ? (seat.roll ?? "—")
                                              : (seat.registrationNumber ??
                                                  "—"),
                                          ),
                                        )}
                                        {index < seats.length - 1 && <i> | </i>}
                                      </span>
                                    ))
                                  : "খালি"}
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  দায়িত্বপ্রাপ্ত শিক্ষকের নাম:{" "}
                  {room.roomTeacherName || "................................"}
                </p>
                <p>স্বাক্ষর: ____________________</p>
              </article>
            ))}
            <article className="ephemeral-print-summary">
              <h2>সারাংশ</h2>
              <table>
                <thead>
                  <tr>
                    <th>রুম</th>
                    <th>মোট আসন</th>
                    <th>বসানো হয়েছে</th>
                    <th>সংখ্যার পরিসর</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.rooms.map((room) => {
                    const values = room.assignments
                      .map((seat) =>
                        generated.pattern === "roll"
                          ? seat.roll
                          : seat.registrationNumber,
                      )
                      .filter((value) => value != null)
                      .map(Number)
                      .sort((a, b) => a - b);
                    return (
                      <tr key={String(room.roomId)}>
                        <td>{String(room.roomName)}</td>
                        <td>{bnNum(room.capacity)}</td>
                        <td>{bnNum(room.seated)}</td>
                        <td>
                          {values.length
                            ? `${bn(String(values[0]))}–${bn(String(values.at(-1)))}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <th>মোট</th>
                    <th>{bnNum(generated.capacity)}</th>
                    <th>{bnNum(generated.assigned)}</th>
                    <th>—</th>
                  </tr>
                </tbody>
              </table>
            </article>
          </>
        )}
      </section>
    </main>
  );
}
