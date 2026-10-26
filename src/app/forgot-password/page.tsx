"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: { message?: string }; message?: string; error?: string } | null;
      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "অনুরোধ করা যায়নি।");
        return;
      }
      setMessage(payload?.data?.message ?? "ইমেইলটি সঠিক হলে রিসেট লিংক পাঠানো হয়েছে।");
    } catch {
      setError("সার্ভারে যোগাযোগ করা যায়নি।");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-wrap full">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader><CardTitle>পাসওয়ার্ড রিসেট</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="dstack" style={{ gap: 14 }}>
            <label className="lbl" htmlFor="reset-email">অ্যাকাউন্টের ইমেইল</label>
            <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="আপনার ইমেইল" />
            <Button type="submit" className="btn" disabled={pending}>{pending ? "পাঠানো হচ্ছে…" : "রিসেট লিংক পাঠান"}</Button>
            {error && <p className="alert r" role="alert">{error}</p>}
            {message && <p className="alert g" role="status">{message}</p>}
          </form>
          <Link href="/login" className="small muted" style={{ display: "block", marginTop: 16, textAlign: "center" }}>লগিনে ফিরে যান</Link>
        </CardContent>
      </Card>
    </main>
  );
}
