/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPost } from "@/lib/admin-api";

type Row = Record<string, unknown> & { id: string };

const tabs = [
  ["sessions", "সেশন"],
  ["classes", "শ্রেণি"],
  ["sections", "শাখা"],
  ["subjects", "বিষয়"],
] as const;

export default function AcademicsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<string>("sessions");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [classOptions, setClassOptions] = useState<Row[]>([]);

  useEffect(() => {
    void apiGet<{ data?: Row[] }>("/api/backend/academics/classes")
      .then((payload) => setClassOptions(payload.data ?? []))
      .catch(() => setClassOptions([]));
  }, []);

  async function load() {
    setRows(null);
    try {
      const payload = await apiGet<{ data?: Row[] }>(`/api/backend/academics/${tab}`);
      setRows(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "তালিকা লোড করা যায়নি");
      setRows([]);
    }
  }
  useEffect(() => {
    void load();
  }, [tab]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value: Record<string, unknown> =
        tab === "sessions"
          ? { name, year: year ? Number(year) : undefined }
          : tab === "sections"
            ? { nameBn: name, classId }
            : { nameBn: name, name };
      await apiPost(`/api/backend/academics/${tab}`, { value }, "তৈরি করা যায়নি");
      toast.success("নতুন রেকর্ড তৈরি হয়েছে");
      setName("");
      setYear("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "তৈরি করা যায়নি");
    }
  }

  const tabLabel = tabs.find(([key]) => key === tab)?.[1] ?? "";

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
      <form onSubmit={create} className="card rowflex">
        <Input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder={`নতুন ${tabLabel}-এর নাম`} value={name} onChange={(e) => setName(e.target.value)} required />
        {tab === "sessions" && (
          <Input className="inp" style={{ width: 140 }} type="number" placeholder="বছর (যেমন 2026)" value={year} onChange={(e) => setYear(e.target.value)} />
        )}
        {tab === "sections" && (
          <Select className="sel" style={{ width: 200 }} value={classId} onChange={(e) => setClassId(e.target.value)} required>
            <option value="">শ্রেণি নির্বাচন</option>
            {classOptions.map((row) => (
              <option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>
            ))}
          </Select>
        )}
        <Button type="submit" className="btn">যোগ করুন</Button>
      </form>
      <div className="card">
        {rows === null ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <p className="admin-empty">কোনো রেকর্ড নেই।</p>
        ) : (
          rows.map((row, index) => {
            const label = String(row.nameBn ?? row.name ?? row.year ?? "রেকর্ড");
            return (
              <div className="listrow" key={row.id ?? index}>
                <span className="av">{index + 1}</span>
                <div className="grow">
                  <b>{label}</b>
                  {row.year ? <span className="muted"> · {String(row.year)}</span> : null}
                </div>
                <span className="chip b">{tabLabel}</span>
                <DeleteButton
                  itemLabel={label}
                  onDelete={() => apiDelete(`/api/backend/academics/${tab}/${row.id}`).then(() => undefined)}
                  onDeleted={load}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
