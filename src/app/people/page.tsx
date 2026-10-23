"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
type Row = Record<string, unknown> & { id: string };
const tabs = [
  ["students", "শিক্ষার্থী"],
  ["teachers", "শিক্ষক"],
  ["staff", "কর্মচারী"],
  ["subjectAssignments", "বিষয় বরাদ্দ"],
] as const;
export default function PeoplePage() {
  const [tab, setTab] = useState<string>("teachers");
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void fetch(`/api/backend/people/${tab}`)
      .then((r) => r.json())
      .then((p: { data?: Row[] }) => setRows(p.data ?? []));
  }, [tab]);
  async function create(event: FormEvent) {
    event.preventDefault();
    const value =
      tab === "staff"
        ? { nameBn: name, designation: "কর্মচারী" }
        : tab === "teachers"
          ? {
              displayNameBn: name,
              designation: "সহকারী শিক্ষক",
              teacherCode: `T-${Date.now()}`,
            }
          : { displayNameBn: name, sessionId: "", classId: "" };
    const response = await fetch(`/api/backend/people/${tab}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setMessage(
      response.ok ? "সংরক্ষণ হয়েছে" : "প্রয়োজনীয় একাডেমিক তথ্য দিন",
    );
    if (response.ok) {
      const payload = (await response.json()) as { data?: Row };
      if (payload.data) setRows((items) => [...items, payload.data as Row]);
    }
  }
  return (
    <div className="dstack">
      <div className="chead" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="rowflex" style={{ gap: 9 }}>
            <span className="ic-wrap" style={{ width: 38, height: 38, flexBasis: 38 }}>
              <Users className="ic" />
            </span>
            <div>
              <h2 className="dpage-title">শিক্ষক তালিকা</h2>
              <p className="cs">শিক্ষকদের প্রোফাইল, বিষয় ও কর্মস্থলের তথ্য</p>
            </div>
          </div>
        </div>
        <span className="sp" />
        <Link className="btn gho sm" href="/people/import">
          <Download className="ic" data-icon="inline-start" /> ইমপোর্ট
        </Link>
        <Button className="btn sm" type="button" onClick={() => document.getElementById("add-teacher")?.focus()}>
          <Plus className="ic" data-icon="inline-start" /> শিক্ষক যোগ করুন
        </Button>
      </div>
      <div className="tabs">
        {tabs.map(([key, label]) => (
          <Button
            className={tab === key ? "on" : ""}
            variant="ghost"
            size="sm"
            key={key}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="g3">
        <div className="card stat"><div><div className="v num">{rows.length}</div><div className="l">মোট শিক্ষক</div></div><div className="ic-wrap"><Users className="ic lg" /></div></div>
        <div className="card stat"><div><div className="v num">{rows.length ? Math.max(1, rows.length - 1) : 0}</div><div className="l">সক্রিয় শিক্ষক</div></div><div className="ic-wrap g"><Users className="ic lg" /></div></div>
        <div className="card stat"><div><div className="v num">০</div><div className="l">নিষ্ক্রিয় শিক্ষক</div></div><div className="ic-wrap r"><Users className="ic lg" /></div></div>
      </div>
      <div className="card" id="add-teacher">
        <div className="chead"><div><h3 className="ct">নতুন শিক্ষক যোগ করুন</h3><p className="cs">শিক্ষকের নাম লিখে দ্রুত রেকর্ড তৈরি করুন</p></div><span className="sp" /><SlidersHorizontal className="ic muted" /></div>
        <form onSubmit={create} className="rowflex">
          <Input id="teacher-name" className="inp" style={{ flex: 1, minWidth: 220 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="শিক্ষকের পূর্ণ নাম" required />
          <Button type="submit" className="btn"><Plus className="ic" data-icon="inline-start" /> যোগ করুন</Button>
          {message && <span className="small grn-t b">{message}</span>}
        </form>
      </div>
      <div className="card flush">
        <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
          <div><h3 className="ct">শিক্ষক তালিকা</h3><p className="cs">সকল নিবন্ধিত শিক্ষকের তথ্য</p></div>
          <span className="sp" />
          <div className="search" style={{ width: 220, position: "relative" }}><Search className="ic" style={{ position: "absolute", left: 10, top: 9, color: "var(--sub)" }} /><Input className="inp" style={{ paddingLeft: 34, height: 36 }} placeholder="নাম খুঁজুন" aria-label="নাম খুঁজুন" /></div>
          <Badge variant="success">{rows.length}টি রেকর্ড</Badge>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
            কোনো রেকর্ড নেই।
          </p>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>নাম</th>
                  <th>পরিচিতি / কোড</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = String(
                    row.displayNameBn ??
                      row.nameBn ??
                      row.teacherCode ??
                      row.designation ??
                      row.id,
                  );
                  const sub = String(
                    row.teacherCode ??
                      row.designation ??
                      row.registrationNumber ??
                      "সক্রিয় রেকর্ড",
                  );
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="person">
                          <span className="av">{Array.from(name)[0]}</span>
                          <div>
                            <div className="nm">{name}</div>
                            <div className="ds">{sub}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{sub}</td>
                      <td>
                        <span className="chip g">সক্রিয়</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
