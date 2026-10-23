"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function TeacherPasswordPage() {
  const [teacherId, setTeacherId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  async function reset() {
    const response = await fetch("/api/auth/reset-teacher-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, newPassword }),
    });
    setMessage(
      response.ok ? "পাসওয়ার্ড রিসেট হয়েছে।" : "পাসওয়ার্ড রিসেট করা যায়নি।",
    );
  }
  return (
    <div className="dstack" style={{ maxWidth: 560 }}>
      <div className="chead">
        <div>
          <h2 className="dpage-title">শিক্ষকের পাসওয়ার্ড রিসেট</h2>
          <p className="cs">শিক্ষকের ID দিয়ে নতুন পাসওয়ার্ড সেট করুন (কমপক্ষে ৮ অক্ষর)।</p>
        </div>
      </div>
      <div className="card">
        <div className="dstack" style={{ gap: 14 }}>
          <div>
            <label className="lbl">শিক্ষক ID</label>
            <Input
              className="inp"
              placeholder="শিক্ষক ID"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            />
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
            <Button className="btn" onClick={() => void reset()}>
              রিসেট করুন
            </Button>
          </div>
          {message && <p className="alert b">{message}</p>}
        </div>
      </div>
    </div>
  );
}
