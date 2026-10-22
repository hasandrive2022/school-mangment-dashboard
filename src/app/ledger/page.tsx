/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function LedgerPage() {
  const [report, setReport] = useState<{
    totals?: { income: number; expense: number; balance: number };
  } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  async function load() {
    const r = await fetch(`/api/backend/finance/ledger?from=${from}&to=${to}`);
    setReport(
      (await r.json()) as {
        totals?: { income: number; expense: number; balance: number };
      },
    );
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1000px]">
        <h1 className="text-2xl font-bold text-primary-800">
          আয়–ব্যয় রিপোর্ট
        </h1>
        <div className="my-6 flex gap-3 rounded-lg bg-white p-4">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button onClick={() => void load()}>রিপোর্ট</Button>
        </div>
        {report?.totals && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>আয়</CardTitle>
              </CardHeader>
              <CardContent>৳ {report.totals.income}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ব্যয়</CardTitle>
              </CardHeader>
              <CardContent>৳ {report.totals.expense}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ব্যালেন্স</CardTitle>
              </CardHeader>
              <CardContent>৳ {report.totals.balance}</CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
