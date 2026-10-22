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
      <div className="mb-9">
        <p className="mb-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
          স্বাগতম
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-primary-800">
          প্রশাসন প্যানেলে লগইন
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          প্রশাসক বা শিক্ষক হিসেবে প্রবেশ করুন।
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="text-sm font-medium text-foreground"
          >
            ইমেইল বা ইউজারনেম
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
            className="h-12 px-4"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              পাসওয়ার্ড
            </label>
          </div>
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
              placeholder="Enter your password"
              className="h-12 px-4 pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={pending}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 h-12 w-12"
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
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full rounded-lg text-sm"
          disabled={pending}
        >
          {pending ? "প্রবেশ করা হচ্ছে…" : "লগইন করুন"}
        </Button>
      </form>
      <p className="mt-9 text-center text-xs leading-5 text-muted-foreground">
        শুধুমাত্র অনুমোদিত প্রশাসক ও শিক্ষকদের জন্য।
      </p>
    </div>
  );
}
