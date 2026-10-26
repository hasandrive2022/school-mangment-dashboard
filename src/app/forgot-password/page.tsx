"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (token && password !== confirm) {
      setError("পাসওয়ার্ড দুটির মিল নেই।");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(token ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, newPassword: password } : { email }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: { message?: string; sent?: boolean }; message?: string; error?: string } | null;
      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "অনুরোধ করা যায়নি।");
        return;
      }
      const successMessage = payload?.data?.message ?? (token ? "পাসওয়ার্ড পরিবর্তন হয়েছে।" : "অনুরোধটি গ্রহণ করা হয়েছে।");
      setMessage(successMessage);
      toast.success(successMessage);
      if (token) {
        setPassword("");
        setConfirm("");
      }
    } catch {
      setError("সার্ভারে যোগাযোগ করা যায়নি।");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-wrap full">
      <div className="login-card">
        <div className="logo"><GraduationCap className="ic lg" /></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--p800)" }}>বিদ্যালয় ব্যবস্থাপনা প্যানেল</div>
          <div style={{ marginTop: 14, fontSize: 16, fontWeight: 700 }}>{token ? "নতুন পাসওয়ার্ড সেট করুন" : "পাসওয়ার্ড রিসেট"}</div>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{token ? "নতুন পাসওয়ার্ড দিয়ে আপনার অ্যাকাউন্ট সুরক্ষিত করুন।" : "আপনার ইমেইলে একটি নিরাপদ রিসেট লিংক পাঠানো হবে।"}</p>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
          {token ? (
            <>
              <div><label className="lbl" htmlFor="reset-password">নতুন পাসওয়ার্ড</label><Input id="reset-password" type="password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="নতুন পাসওয়ার্ড" className="inp" /></div>
              <div><label className="lbl" htmlFor="reset-confirm">পাসওয়ার্ড আবার লিখুন</label><Input id="reset-confirm" type="password" minLength={12} required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="পাসওয়ার্ড আবার লিখুন" className="inp" /></div>
            </>
          ) : (
            <div><label className="lbl" htmlFor="reset-email">অ্যাকাউন্টের ইমেইল</label><Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="আপনার ইমেইল" className="inp" /></div>
          )}
          {error && <p className="alert r" role="alert">{error}</p>}
          {message && <p className="alert g" role="status">{message}</p>}
          <Button type="submit" className="btn" style={{ width: "100%", justifyContent: "center", height: 46 }} disabled={pending}>{pending ? "অপেক্ষা করুন…" : token ? "পাসওয়ার্ড সংরক্ষণ করুন" : "রিসেট লিংক পাঠান"}</Button>
        </form>
        <Link href="/login" className="btn gho" style={{ display: "flex", marginTop: 14, justifyContent: "center", textDecoration: "none" }}>লগিনে ফিরে যান</Link>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className="login-wrap full" />}><ForgotPasswordContent /></Suspense>;
}
