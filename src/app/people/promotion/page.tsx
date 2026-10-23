"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function PromotionPage() {
  const [studentIds, setStudentIds] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  async function promote() {
    const response = await fetch("/api/backend/people/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: studentIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
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
            <p>একাধিক শিক্ষার্থী ID কমা দিয়ে লিখুন।</p>
          </CardHeader>
          <CardContent className="promotion-form">
            <Input className="inp"
              placeholder="শিক্ষার্থী ID ১, শিক্ষার্থী ID ২"
              value={studentIds}
              onChange={(e) => setStudentIds(e.target.value)}
            />
            <Input className="inp"
              placeholder="নতুন সেশন ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
            <Input className="inp"
              placeholder="নতুন শ্রেণি ID"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            />
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
