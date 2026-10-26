"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiGet } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
type Teacher = { id: string; displayNameBn?: string; nameBn?: string; teacherCode?: string };
export default function TeacherPasswordPage() {
  const toast = useToast();
  const [teacherId, setTeacherId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  useEffect(() => {
    void apiGet<{ data?: Teacher[] }>("/api/backend/people/teachers")
      .then((payload) => setTeachers(payload.data ?? []))
      .catch(() => setTeachers([]));
  }, []);
  async function reset() {
    setMessage("");
    setError("");
    if (!teacherId || newPassword.length < 8) {
      setError("শিক্ষক নির্বাচন করে কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।");
      toast.error("শিক্ষক নির্বাচন করে কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/auth/reset-teacher-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, newPassword }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
      error?: string;
    } | null;
    if (response.ok) {
      setMessage("পাসওয়ার্ড রিসেট হয়েছে।");
      toast.success("পাসওয়ার্ড রিসেট হয়েছে।");
      setNewPassword("");
    } else {
      setError(
        Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message ?? payload?.error ?? "পাসওয়ার্ড রিসেট করা যায়নি।",
      );
    }
    setSaving(false);
  }
  return (
    <div className="dstack" style={{ maxWidth: 560 }}>
      <div className="chead">
        <div>
          <h2 className="dpage-title">শিক্ষকের পাসওয়ার্ড রিসেট</h2>
          <p className="cs">তালিকা থেকে শিক্ষক নির্বাচন করে নতুন পাসওয়ার্ড সেট করুন।</p>
        </div>
      </div>
      <div className="card">
        <div className="dstack" style={{ gap: 14 }}>
          <div>
            <label className="lbl">শিক্ষক নির্বাচন</label>
            <Select
              className="sel"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">শিক্ষক নির্বাচন করুন</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.displayNameBn ?? teacher.nameBn ?? "শিক্ষক"}{teacher.teacherCode ? ` · ${teacher.teacherCode}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="lbl">নতুন পাসওয়ার্ড</label>
            <Input
              className="inp"
              type="password"
              minLength={8}
              placeholder="নতুন পাসওয়ার্ড"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Button className="btn" onClick={() => void reset()} disabled={saving}>
              {saving ? "সংরক্ষণ হচ্ছে…" : "রিসেট করুন"}
            </Button>
          </div>
          {error && <p className="alert r" role="alert">{error}</p>}
          {message && <p className="alert g" role="status">{message}</p>}
        </div>
      </div>
    </div>
  );
}
