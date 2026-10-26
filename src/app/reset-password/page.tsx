"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) return setError("রিসেট লিংকটি অসম্পূর্ণ।");
    if (password.length < 12) return setError("পাসওয়ার্ড কমপক্ষে ১২ অক্ষরের হতে হবে।");
    if (password !== confirm) return setError("পাসওয়ার্ড দুটির মিল নেই।");
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: { message?: string }; message?: string; error?: string } | null;
      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "পাসওয়ার্ড পরিবর্তন করা যায়নি।");
        return;
      }
      setMessage(payload?.data?.message ?? "পাসওয়ার্ড পরিবর্তন হয়েছে।");
      setPassword("");
      setConfirm("");
    } catch {
      setError("সার্ভারে যোগাযোগ করা যায়নি।");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-wrap full">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader><CardTitle>নতুন পাসওয়ার্ড সেট করুন</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="dstack" style={{ gap: 14 }}>
            <label className="lbl" htmlFor="new-reset-password">নতুন পাসওয়ার্ড</label>
            <Input id="new-reset-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="lbl" htmlFor="confirm-reset-password">পাসওয়ার্ড আবার লিখুন</label>
            <Input id="confirm-reset-password" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <Button type="submit" className="btn" disabled={pending}>{pending ? "সংরক্ষণ হচ্ছে…" : "পাসওয়ার্ড সংরক্ষণ করুন"}</Button>
            {error && <p className="alert r" role="alert">{error}</p>}
            {message && <p className="alert g" role="status">{message}</p>}
          </form>
          <Link href="/login" className="small muted" style={{ display: "block", marginTop: 16, textAlign: "center" }}>লগিনে ফিরে যান</Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="login-wrap full" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
