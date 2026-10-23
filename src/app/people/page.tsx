"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
  const [tab, setTab] = useState<string>("students");
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
      <div className="chead">
        <div>
          <h2 className="dpage-title">শিক্ষার্থী ও শিক্ষক</h2>
          <p className="cs">মানবসম্পদ ও একাডেমিক রেকর্ড</p>
        </div>
        <span className="sp" />
        <Badge variant="success">{rows.length}টি রেকর্ড</Badge>
        <Link className="btn sec sm" href="/people/import">
          Excel/CSV ইমপোর্ট
        </Link>
        <Link className="btn gho sm" href="/people/promotion">
          প্রমোশন
        </Link>
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
      <div className="card">
        <div className="chead">
          <h3 className="ct">
            {tabs.find(([key]) => key === tab)?.[1]} যোগ করুন
          </h3>
        </div>
        <form onSubmit={create} className="rowflex">
          <Input
            className="inp"
            style={{ flex: 1, minWidth: 220 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="নাম"
            required
          />
          <Button type="submit" className="btn">
            + যোগ করুন
          </Button>
          {message && <span className="small grn-t b">{message}</span>}
        </form>
      </div>
      <div className="card flush">
        <div className="chead" style={{ padding: "16px 18px 0" }}>
          <h3 className="ct">রেকর্ড তালিকা</h3>
          <span className="sp" />
          <span className="chip b">{rows.length}টি রেকর্ড</span>
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
