"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function PromotionPage() {
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [sessions, setSessions] = useState<Array<{ id: string; nameBn?: string; name?: string; year?: number }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; nameBn?: string; name?: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; displayNameBn?: string; nameBn?: string; registrationNumber?: string }>>([]);
  useEffect(() => {
    void Promise.all([
      apiGet<{ data?: typeof sessions }>("/api/backend/academics/sessions"),
      apiGet<{ data?: typeof classes }>("/api/backend/academics/classes"),
      apiGet<{ data?: typeof students }>("/api/backend/people/students"),
    ]).then(([sessionPayload, classPayload, studentPayload]) => {
      setSessions(sessionPayload.data ?? []);
      setClasses(classPayload.data ?? []);
      setStudents(studentPayload.data ?? []);
    }).catch(() => undefined);
  }, []);
  async function promote() {
    const response = await fetch("/api/backend/people/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds,
        sessionId,
        classId,
      }),
    });
    const payload = (await response.json()) as {
      count?: number;
      error?: string;
    };
    setMessage(
      response.ok
        ? `${payload.count ?? 0} জন শিক্ষার্থী প্রমোট হয়েছে।`
        : (payload.error ?? "প্রমোশন করা যায়নি।"),
    );
  }
  return (
    <div className="dstack">
        <div className="admin-page-heading">
          <div>
            <p>People · Academic transition</p>
            <h1>শ্রেণি প্রমোশন</h1>
          </div>
          <span className="admin-helper">
            নির্বাচিত শিক্ষার্থীদের নতুন সেশনে নিন
          </span>
        </div>
        <Card className="card">
          <CardHeader>
            <CardTitle>প্রমোশন সেটআপ</CardTitle>
            <p>এক বা একাধিক শিক্ষার্থী নির্বাচন করুন।</p>
          </CardHeader>
          <CardContent className="promotion-form">
            <Select className="sel" multiple size={6} aria-label="শিক্ষার্থী নির্বাচন" value={studentIds}
              onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (option) => option.value))}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.displayNameBn ?? student.nameBn ?? "শিক্ষার্থী"} · {student.registrationNumber ?? ""}</option>)}
            </Select>
            <Select className="sel" aria-label="নতুন সেশন" value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}>
              <option value="">নতুন সেশন নির্বাচন করুন</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.nameBn ?? row.name ?? row.year ?? "সেশন"}</option>)}
            </Select>
            <Select className="sel" aria-label="নতুন শ্রেণি" value={classId}
              onChange={(e) => setClassId(e.target.value)}>
              <option value="">নতুন শ্রেণি নির্বাচন করুন</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.nameBn ?? row.name ?? "শ্রেণি"}</option>)}
            </Select>
            <Button className="btn" onClick={() => void promote()}>প্রমোট করুন</Button>
            {message && <p className="text-accent-600">{message}</p>}
          </CardContent>
        </Card>
        <div className="alert b promotion-note">
          প্রমোশনের পর শিক্ষার্থীর registration number অপরিবর্তিত থাকে; শুধু
          session ও class বদলায়।
        </div>
    </div>
  );
}
