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
    <main className="min-h-screen bg-neutral-50 p-8">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>ডেমো ডেটা রিসেট</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-neutral-600">
            শুধু EIIN 123456 ডেমো স্কুলের ডেটা মুছে পুনরায় seed হবে।
          </p>
          <Button variant="destructive" onClick={() => void reset()}>
            রিসেট করুন
          </Button>
          {message && <p className="mt-3">{message}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
