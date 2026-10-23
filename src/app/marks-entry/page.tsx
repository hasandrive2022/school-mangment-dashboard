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
  const labels: Record<string, string> = {
    examSubjectId: "পরীক্ষা–বিষয় ID",
    studentId: "শিক্ষার্থী ID",
    cq: "সৃজনশীল (CQ)",
    mcq: "বহুনির্বাচনি (MCQ)",
    practical: "ব্যবহারিক",
  };
  return (
    <div className="dstack" style={{ maxWidth: 640 }}>
      <div className="chead">
        <div>
          <h2 className="dpage-title">নম্বর এন্ট্রি</h2>
          <p className="cs">নিজের বরাদ্দকৃত বিষয়ের নম্বর জমা দিন — জমা দিলে এন্ট্রি লক হয়ে যায়, আনলক করতে অ্যাডমিনের অনুমতি লাগে।</p>
        </div>
      </div>
      <div className="card">
        <div className="fgrid">
          {Object.entries(form).map(([key, value]) => (
            <div key={key}>
              <label className="lbl">{labels[key] ?? key}</label>
              <Input
                className="inp"
                placeholder={labels[key] ?? key}
                value={value}
                onChange={(e) =>
                  setForm((current) => ({ ...current, [key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Button type="button" className="btn" onClick={() => void save()}>
            জমা দিন
          </Button>
        </div>
        {message && (
          <p className="alert g" style={{ marginTop: 14 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
