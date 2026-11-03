"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Room = { id: string; nameBn: string; building?: string | null; floor?: string | null; benchRows: number; benchColumns: number; isActive: boolean };
export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ nameBn: "", building: "", floor: "", benchRows: "5", benchColumns: "4" });
  async function load() { const r = await fetch("/api/backend/rooms"); const p = await r.json() as { data?: Room[] }; setRooms(p.data ?? []); }
  useEffect(() => { void load(); }, []);
  async function save() { if (!form.nameBn.trim()) return; await fetch("/api/backend/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, benchRows: Number(form.benchRows), benchColumns: Number(form.benchColumns) }) }); setForm({ ...form, nameBn: "" }); await load(); }
  async function deactivate(id: string) { await fetch(`/api/backend/rooms/${id}`, { method: "DELETE" }); await load(); }
  return <main className="content"><div className="page-heading"><div><h1>রুমসমূহ</h1><p>সিট প্ল্যানের জন্য সক্রিয় কক্ষ ও বেঞ্চের গ্রিড পরিচালনা করুন।</p></div></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><Card><CardHeader><CardTitle>রুমের তালিকা</CardTitle></CardHeader><CardContent><div className="tbl-wrap"><table className="finance-table"><thead><tr><th>রুম</th><th>ভবন/তলা</th><th>গ্রিড</th><th>ধারণক্ষমতা</th><th>অবস্থা</th><th /></tr></thead><tbody>{rooms.map(r => <tr key={r.id}><td>{r.nameBn}</td><td>{[r.building, r.floor].filter(Boolean).join(" / ") || "—"}</td><td>{r.benchRows} × {r.benchColumns}</td><td>{r.benchRows * r.benchColumns} / {r.benchRows * r.benchColumns * 2}</td><td><Badge variant="secondary">{r.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></td><td>{r.isActive && <Button size="sm" variant="outline" onClick={() => void deactivate(r.id)}>নিষ্ক্রিয়</Button>}</td></tr>)}</tbody></table></div></CardContent></Card><Card><CardHeader><CardTitle>নতুন রুম</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-3"><Input placeholder="রুম নম্বর/নাম" value={form.nameBn} onChange={e => setForm({ ...form, nameBn: e.target.value })} /><Input placeholder="ভবন (ঐচ্ছিক)" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} /><Input placeholder="তলা (ঐচ্ছিক)" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} /><div className="grid grid-cols-2 gap-3"><Input type="number" min={1} placeholder="সারি" value={form.benchRows} onChange={e => setForm({ ...form, benchRows: e.target.value })} /><Input type="number" min={1} placeholder="কলাম" value={form.benchColumns} onChange={e => setForm({ ...form, benchColumns: e.target.value })} /></div><Button onClick={() => void save()}>রুম সংরক্ষণ</Button></div></CardContent></Card></div></main>;
}
