"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function MarksEntryPage() {
  const [form, setForm] = useState({
    examSubjectId: "",
    studentId: "",
    cq: "",
    mcq: "",
    practical: "",
  });
  const [message, setMessage] = useState("");
  async function save() {
    const response = await fetch("/api/backend/results/marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cq: Number(form.cq),
        mcq: Number(form.mcq),
        practical: Number(form.practical),
      }),
    });
    setMessage(
      response.ok
        ? "নম্বর জমা হয়েছে এবং শিক্ষক এন্ট্রি লক হয়েছে"
        : "নম্বর সংরক্ষণ করা যায়নি",
    );
  }
  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[700px]">
        <h1 className="text-2xl font-bold text-primary-800">নম্বর এন্ট্রি</h1>
        <div className="mt-6 grid gap-4 rounded-lg bg-white p-6">
          {Object.entries(form).map(([key, value]) => (
            <Input
              key={key}
              placeholder={key}
              value={value}
              onChange={(e) =>
                setForm((current) => ({ ...current, [key]: e.target.value }))
              }
            />
          ))}
          <Button type="button" onClick={() => void save()}>
            জমা দিন
          </Button>
          {message && <p>{message}</p>}
        </div>
      </div>
    </main>
  );
}
