"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="dstack" style={{ gap: 7 }}>
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className="relative" style={{ position: "relative", height: 42 }}>
        <LockKeyhole
          className="absolute left-3 text-muted-foreground"
          style={{ zIndex: 2, pointerEvents: "none", top: 21, transform: "translateY(-50%)" }}
          aria-hidden="true"
        />
        <Input
          id={id}
          className="inp"
          style={{ height: 42, boxSizing: "border-box", padding: "0 48px 0 40px", lineHeight: "42px" }}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1"
          style={{ position: "absolute", right: 4, top: 5, zIndex: 3, width: 32, height: 32 }}
          onPointerDown={(event) => {
            event.preventDefault();
            setVisible((current) => !current);
          }}
          aria-label={visible ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 12) {
      setError("নতুন পাসওয়ার্ড কমপক্ষে ১২ অক্ষরের হতে হবে।");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("নতুন পাসওয়ার্ড দুটির মিল নেই।");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string | string[];
        error?: string;
      } | null;
      if (!response.ok) {
        const detail = Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message ?? payload?.error;
        setError(detail ?? "পাসওয়ার্ড পরিবর্তন করা যায়নি।");
        return;
      }
      setMessage("পাসওয়ার্ড পরিবর্তন হয়েছে।");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("সার্ভারে যোগাযোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dstack" style={{ maxWidth: 640 }}>
      <div className="chead">
        <div>
          <h2 className="dpage-title">আমার পাসওয়ার্ড</h2>
          <p className="cs">আপনার account সুরক্ষিত রাখতে নিয়মিত পাসওয়ার্ড পরিবর্তন করুন।</p>
        </div>
      </div>
      <Card className="card" size="sm">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <CardTitle>পাসওয়ার্ড পরিবর্তন</CardTitle>
              <CardDescription>নতুন পাসওয়ার্ড কমপক্ষে ১২ অক্ষরের হতে হবে।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="dstack" style={{ gap: 18 }} onSubmit={submit}>
            <PasswordField id="current-password" label="বর্তমান পাসওয়ার্ড" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField id="new-password" label="নতুন পাসওয়ার্ড" autoComplete="new-password" minLength={12} value={newPassword} onChange={setNewPassword} />
            <PasswordField id="confirm-password" label="নতুন পাসওয়ার্ড আবার লিখুন" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={setConfirmPassword} />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="alert r" role="alert">নতুন পাসওয়ার্ড দুটির মিল নেই।</p>
            )}
            <Button type="submit" className="btn w-full" disabled={saving}>
              {saving ? "সংরক্ষণ হচ্ছে…" : "পাসওয়ার্ড পরিবর্তন করুন"}
            </Button>
            {error && <p className="alert r" role="alert">{error}</p>}
            {message && <p className="alert g" role="status">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
