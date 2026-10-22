"use client";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="admin-page">
      <div className="admin-page-inner">
        <div className="admin-page-heading">
          <div>
            <p>মানবসম্পদ ও একাডেমিক রেকর্ড</p>
            <h1>শিক্ষার্থী ও শিক্ষক</h1>
          </div>
          <Badge variant="success">{rows.length}টি রেকর্ড</Badge>
        </div>
        <div className="people-tabs">
          {tabs.map(([key, label]) => (
            <Button
              className="shrink-0"
              variant={tab === key ? "default" : "ghost"}
              size="sm"
              key={key}
              onClick={() => setTab(key)}
              type="button"
            >
              {label}
            </Button>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {tabs.find(([key]) => key === tab)?.[1]} যোগ করুন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="people-create-form">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="নাম"
                required
              />
              <Button type="submit">+ যোগ করুন</Button>
              {message && (
                <span className="text-sm text-accent-600">{message}</span>
              )}
            </form>
          </CardContent>
        </Card>
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>রেকর্ড তালিকা</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="people-list">
              {rows.map((row) => (
                <div className="people-row" key={row.id}>
                  <div>
                    <b>
                      {String(
                        row.displayNameBn ??
                          row.nameBn ??
                          row.teacherCode ??
                          row.designation ??
                          row.id,
                      )}
                    </b>
                    <small>
                      {String(
                        row.teacherCode ??
                          row.designation ??
                          row.registrationNumber ??
                          "সক্রিয় রেকর্ড",
                      )}
                    </small>
                  </div>
                  <Badge variant="secondary">সক্রিয়</Badge>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="admin-empty">কোনো রেকর্ড নেই।</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
