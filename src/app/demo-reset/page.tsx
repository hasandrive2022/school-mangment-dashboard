"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function DemoResetPage() {
  const [message, setMessage] = useState("");
  async function reset() {
    if (!window.confirm("ডেমো ডেটা রিসেট করবেন?")) return;
    const response = await fetch("/api/backend/demo/reset", { method: "POST" });
    setMessage(response.ok ? "ডেমো রিসেট শুরু হয়েছে" : "রিসেট করা যায়নি");
  }
  return (
    <div className="dstack" style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
      <Card className="card">
        <CardHeader>
          <CardTitle>ডেমো ডেটা রিসেট</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="alert w" style={{ marginBottom: 16 }}>
            শুধু EIIN 123456 ডেমো স্কুলের ডেটা মুছে পুনরায় seed হবে।
          </p>
          <Button variant="destructive" className="btn dgr" onClick={() => void reset()}>
            রিসেট করুন
          </Button>
          {message && (
            <p className="alert b" style={{ marginTop: 14 }}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
