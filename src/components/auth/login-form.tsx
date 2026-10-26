"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
          setError(data.error ?? "লগিন করা যায়নি।");
        return;
      }
      // The replacement navigation already fetches a fresh server tree. Calling
      // refresh immediately after it can close the same RSC stream twice in
      // Next.js, which produces CLOSED writable stream errors in the preview.
      window.location.assign("/dashboard");
    } catch {
      setError("সার্ভারে যোগাযোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <label htmlFor="email" className="lbl">
            ইমেইল <span className="req">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            placeholder="আপনার ইমেইল"
            className="inp"
          />
        </div>
        <div>
          <label htmlFor="password" className="lbl">
            পাসওয়ার্ড <span className="req">*</span>
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              placeholder="পাসওয়ার্ড"
              className="inp"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={pending}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 h-full w-11"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="alert r" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="btn"
          style={{ width: "100%", justifyContent: "center", height: 46 }}
          disabled={pending}
        >
          {pending ? "প্রবেশ করা হচ্ছে…" : "লগিন করুন"}
        </Button>
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <Link
            href="/forgot-password"
            className="btn gho"
            style={{ display: "inline-flex", color: "var(--p700)", textDecoration: "none" }}
          >
            পাসওয়ার্ড ভুলে গেছেন?
          </Link>
        </div>
      </form>
      <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
        শুধুমাত্র অনুমোদিত প্রশাসক ও শিক্ষকদের জন্য।
      </p>
    </div>
  );
}
