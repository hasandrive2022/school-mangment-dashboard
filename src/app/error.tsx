"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Next.js error boundary hook */
  }, []);
  return (
    <main className="admin-error-page">
      <div className="admin-error-card">
        <div className="admin-error-code">!</div>
        <p>সাময়িক সমস্যা</p>
        <h1>ডেটা লোড করা যায়নি</h1>
        <Button onClick={() => reset()}>আবার চেষ্টা করুন</Button>
      </div>
    </main>
  );
}
