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
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[600px]">
        <h1 className="text-2xl font-bold text-primary-800">
          শিক্ষকের পাসওয়ার্ড রিসেট
        </h1>
        <div className="mt-6 grid gap-4 rounded-lg bg-white p-6">
          <Input
            placeholder="শিক্ষক ID"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          />
          <Input
            type="password"
            minLength={8}
            placeholder="নতুন পাসওয়ার্ড"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button onClick={() => void reset()}>রিসেট করুন</Button>
          {message && <p>{message}</p>}
        </div>
      </div>
    </main>
  );
}
