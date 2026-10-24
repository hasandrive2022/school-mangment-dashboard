"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { apiDelete } from "@/lib/admin-api";

type Row = Record<string, unknown> & { id: string };
const days = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার"];

export default function RoutinePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    dayOfWeek: "0",
    period: "1",
    room: "",
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    void Promise.all([
      fetch("/api/backend/academics/classes"),
      fetch("/api/backend/academics/subjects"),
      fetch("/api/backend/routine"),
    ]).then(async ([classResponse, subjectResponse, routineResponse]) => {
      const [classData, subjectData, routineData] = await Promise.all([
        classResponse.json() as Promise<{ data?: Row[] }>,
        subjectResponse.json() as Promise<{ data?: Row[] }>,
        routineResponse.json() as Promise<{ data?: Row[] }>,
      ]);
      setClasses(classData.data ?? []);
      setSubjects(subjectData.data ?? []);
      setRows(routineData.data ?? []);
    });
  }, []);
  async function reload() {
    const routineResponse = await fetch("/api/backend/routine");
    const routineData = (await routineResponse.json()) as { data?: Row[] };
    setRows(routineData.data ?? []);
  }
  async function create() {
    const response = await fetch("/api/backend/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: {
          ...form,
          period: Number(form.period),
          dayOfWeek: Number(form.dayOfWeek),
        },
      }),
    });
    setMessage(
      response.ok ? "রুটিন slot যোগ হয়েছে" : "রুটিন সংরক্ষণ করা যায়নি",
    );
    if (response.ok) {
      const payload = (await response.json()) as { data?: Row };
      if (payload.data)
        setRows((items) => [...(items ?? []), payload.data as Row]);
    }
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>Academic schedule</p>
            <h1>ক্লাস রুটিন</h1>
          </div>
          <span className="admin-helper">
            দিন ও period অনুযায়ী slot তৈরি করুন
          </span>
        </div>
        <Card className="card">
          <CardHeader>
            <CardTitle>নতুন routine slot</CardTitle>
          </CardHeader>
          <CardContent className="routine-form">
            <Select className="sel"
              value={form.classId}
              onChange={(event) =>
                setForm({ ...form, classId: event.target.value })
              }
            >
              <option value="">শ্রেণি নির্বাচন</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {String(row.nameBn)}
                </option>
              ))}
            </Select>
            <Select className="sel"
              value={form.subjectId}
              onChange={(event) =>
                setForm({ ...form, subjectId: event.target.value })
              }
            >
              <option value="">বিষয় নির্বাচন</option>
              {subjects.map((row) => (
                <option key={row.id} value={row.id}>
                  {String(row.nameBn)}
                </option>
              ))}
            </Select>
            <Select className="sel"
              value={form.dayOfWeek}
              onChange={(event) =>
                setForm({ ...form, dayOfWeek: event.target.value })
              }
            >
              {days.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </Select>
            <Input className="inp"
              type="number"
              min="1"
              max="10"
              placeholder="Period"
              value={form.period}
              onChange={(event) =>
                setForm({ ...form, period: event.target.value })
              }
            />
            <Input className="inp"
              placeholder="কক্ষ (ঐচ্ছিক)"
              value={form.room}
              onChange={(event) =>
                setForm({ ...form, room: event.target.value })
              }
            />
            <Button className="btn" onClick={() => void create()}>Slot সংরক্ষণ</Button>
            {message && <p className="text-accent-600">{message}</p>}
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <CardTitle>রুটিন প্রিভিউ</CardTitle>
          </CardHeader>
          <CardContent>
            {rows === null ? (
              <ListSkeleton rows={4} />
            ) : (
              <div className="routine-board">
                {days.map((day, index) => (
                  <section key={day}>
                    <h3>{day}</h3>
                    {rows
                      .filter((row) => Number(row.dayOfWeek) === index)
                      .sort((a, b) => Number(a.period) - Number(b.period))
                      .map((row) => (
                        <article key={row.id}>
                          <b>Period {String(row.period)}</b>
                          <span>{String(row.subjectNameBn ?? "বিষয়")}</span>
                          <small>
                            {String(row.classNameBn ?? "—")}
                            {row.room ? ` · ${String(row.room)}` : ""}
                          </small>
                          <DeleteButton
                            itemLabel={`${day} · Period ${String(row.period)} · ${String(row.subjectNameBn ?? "বিষয়")}`}
                            onDelete={() =>
                              apiDelete(`/api/backend/routine/${row.id}`).then(() => undefined)
                            }
                            onDeleted={reload}
                          />
                        </article>
                      ))}
                    {!rows.some((row) => Number(row.dayOfWeek) === index) && (
                      <p>slot নেই</p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
