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
    <div className="dstack">
        <div className="chead">
          <div>
            <h2 className="dpage-title">একাডেমিক কাঠামো</h2>
            <p className="cs">সেশন, শ্রেণি, শাখা ও বিষয় — শিক্ষক–বিষয় বণ্টন People পেজের “বিষয় বরাদ্দ” ট্যাবে।</p>
          </div>
        </div>
        <div className="tabs">
          {tabs.map(([key, label]) => (
            <Button
              type="button"
              variant="ghost"
              className={tab === key ? "on" : ""}
              key={key}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="card">
          {rows.map((row, index) => (
            <div className="listrow" key={String(row.id ?? index)}>
              <span className="av">{index + 1}</span>
              <div className="grow">
                <b>{String(row.nameBn ?? row.name ?? row.year ?? "রেকর্ড")}</b>
              </div>
              <span className="chip b">{tabs.find(([key]) => key === tab)?.[1]}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="admin-empty">কোনো রেকর্ড নেই।</p>}
        </div>
    </div>
  );
}
