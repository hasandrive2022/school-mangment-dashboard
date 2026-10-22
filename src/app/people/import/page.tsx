"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function StudentImportPage() {
  const [csv, setCsv] = useState("displayNameBn,sessionId,classId,sectionId\n");
  const [result, setResult] = useState<{
    imported?: number;
    errors?: Array<{ row: number; message: string }>;
  } | null>(null);
  async function submit() {
    setResult(
      (await (
        await fetch("/api/backend/people/students/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv }),
        })
      ).json()) as {
        imported?: number;
        errors?: Array<{ row: number; message: string }>;
      },
    );
  }
  return (
    <main className="admin-page">
      <div className="admin-page-inner import-page">
        <div className="admin-page-heading">
          <div>
            <p>People · Bulk tools</p>
            <h1>শিক্ষার্থী Excel/CSV আমদানি</h1>
          </div>
          <span className="admin-helper">প্রতি ভুল সারির রিপোর্ট থাকবে</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>CSV ডেটা প্রস্তুত করুন</CardTitle>
            <p>
              প্রথম লাইনে displayNameBn, sessionId, classId, sectionId রাখুন।
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              className="import-editor"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <Button className="mt-4" onClick={() => void submit()}>
              আমদানি শুরু করুন
            </Button>
          </CardContent>
        </Card>
        {result && (
          <Card className="mt-5 import-result">
            <CardHeader>
              <CardTitle>আমদানির ফলাফল</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="import-success">সফল: {result.imported ?? 0}</p>
              {(result.errors ?? []).map((error) => (
                <p className="import-error" key={error.row}>
                  সারি {error.row}: {error.message}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
