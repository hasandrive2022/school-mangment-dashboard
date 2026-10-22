"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
const tabs = [
  ["sessions", "সেশন"],
  ["classes", "শ্রেণি"],
  ["sections", "শাখা"],
  ["subjects", "বিষয়"],
] as const;
export default function AcademicsPage() {
  const [tab, setTab] = useState<string>("sessions");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    void fetch(`/api/backend/academics/${tab}`)
      .then((r) => r.json())
      .then((p: { data?: Record<string, unknown>[] }) => setRows(p.data ?? []));
  }, [tab]);
  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl font-bold text-primary-800">একাডেমিক কাঠামো</h1>
        <div className="my-6 flex gap-2">
          {tabs.map(([key, label]) => (
            <Button
              type="button"
              variant={tab === key ? "default" : "ghost"}
              key={key}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="rounded-lg bg-white p-5">
          {rows.map((row, index) => (
            <div className="border-b py-3" key={String(row.id ?? index)}>
              {String(row.nameBn ?? row.name ?? row.year ?? "রেকর্ড")}
            </div>
          ))}
          {rows.length === 0 && <p>কোনো রেকর্ড নেই।</p>}
        </div>
      </div>
    </main>
  );
}
