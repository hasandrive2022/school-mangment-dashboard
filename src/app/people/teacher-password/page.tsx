"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiGet } from "@/lib/admin-api";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

type Teacher = {
  id: string;
  userId?: string | null;
  displayNameBn?: string;
  nameBn?: string;
  teacherCode?: string;
  email?: string | null;
};

export default function TeacherPasswordPage() {
  const [teacherId, setTeacherId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("নতুন পাসওয়ার্ড এবং নিশ্চিত পাসওয়ার্ড এক নয়।");
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
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setError(
        Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message ?? payload?.error ?? "পাসওয়ার্ড রিসেট করা যায়নি।",
      );
    }
    setSaving(false);
  }
  const selectedTeacher = teachers.find((teacher) => teacher.userId === teacherId);

  return (
    <div className="dstack" style={{ maxWidth: 760 }}>
      <div className="chead">
        <div>
          <h2 className="dpage-title">শিক্ষকের পাসওয়ার্ড রিসেট</h2>
          <p className="cs">শিক্ষকের account নির্বাচন করে নিরাপদে নতুন পাসওয়ার্ড সেট করুন।</p>
        </div>
      </div>

      <Card className="card">
        <CardHeader>
          <div className="rowflex" style={{ alignItems: "center", gap: 12 }}>
            <span className="iconbox" aria-hidden="true"><KeyRound size={20} /></span>
            <div>
              <CardTitle>নতুন পাসওয়ার্ড সেট করুন</CardTitle>
              <p className="cs">শিক্ষককে নতুন পাসওয়ার্ডটি নিরাপদ মাধ্যমে জানিয়ে দিন।</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="dstack" style={{ gap: 16 }}>
            <div>
              <label className="lbl" htmlFor="teacher-select">শিক্ষক নির্বাচন</label>
            <Select
              id="teacher-select"
              className="sel"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">শিক্ষক নির্বাচন করুন</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.userId ?? ""} disabled={!teacher.userId}>
                  {teacher.displayNameBn ?? teacher.nameBn ?? "শিক্ষক"}{teacher.teacherCode ? ` · ${teacher.teacherCode}` : ""}
                </option>
              ))}
            </Select>
            {selectedTeacher?.email ? <p className="muted" style={{ marginTop: 6 }}>লগইন ইমেইল: {selectedTeacher.email}</p> : null}
            </div>
            <div>
              <label className="lbl" htmlFor="teacher-password">নতুন পাসওয়ার্ড</label>
              <div className="password-field">
                <Input
                  id="teacher-password"
                  className="inp"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button type="button" variant="ghost" className="password-toggle" aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <div>
              <label className="lbl" htmlFor="teacher-password-confirm">পাসওয়ার্ড নিশ্চিত করুন</label>
              <Input
                id="teacher-password-confirm"
                className="inp"
                type={showPassword ? "text" : "password"}
                minLength={8}
                placeholder="আবার পাসওয়ার্ড লিখুন"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="rowflex" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <p className="muted"><ShieldCheck size={16} style={{ verticalAlign: "-3px", marginRight: 5 }} />পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।</p>
              <Button className="btn" onClick={() => void reset()} disabled={saving || !teacherId}>
                {saving ? "সংরক্ষণ হচ্ছে…" : "পাসওয়ার্ড রিসেট করুন"}
              </Button>
            </div>
            {error && <p className="alert r" role="alert">{error}</p>}
            {message && <p className="alert g" role="status">{message}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
