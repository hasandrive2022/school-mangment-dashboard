"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
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
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
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
          <label htmlFor="identifier" className="lbl">
            ব্যবহারকারীর নাম / ইমেইল <span className="req">*</span>
          </label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            disabled={pending}
            placeholder="ইমেইল বা ইউজারনেম"
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
              {showPassword ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                  <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.7 4 10 8a13.7 13.7 0 0 1-3.1 5.1M6.2 6.2C4.5 7.4 3.3 9.2 2 12c1.3 4 5 8 10 8 1.4 0 2.7-.3 3.8-.8" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
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
      </form>
      <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
        শুধুমাত্র অনুমোদিত প্রশাসক ও শিক্ষকদের জন্য।
      </p>
    </div>
  );
}
