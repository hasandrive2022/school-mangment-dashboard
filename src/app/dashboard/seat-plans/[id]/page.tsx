"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Row = Record<string, unknown> & { id: string; status?: string; student?: Row; candidate?: Row; assignment?: Row; room?: Row; link?: Row };
type Detail = Row & { subjects?: Row[]; rooms?: Row[]; assignments?: Row[] };
const steps = ["পরীক্ষা ও বিষয়", "ক্লাস ও গ্রুপ", "যোগ্যতা ও অনুমোদন", "রুম ও বিন্যাস", "পর্যালোচনা ও প্রকাশ"];
const reasonLabels: Record<string, string> = { fee_due: "ফি বকেয়া", not_failed: "ফেল নয়", no_subject: "বিষয় নেই", manual: "ম্যানুয়াল" };
const nested = (v: unknown): Row => v && typeof v === "object" ? v as Row : { id: "" };

export default function SeatPlanDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [step, setStep] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [excluded, setExcluded] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [pattern, setPattern] = useState("serial");
  const [mode, setMode] = useState("mixed");
  const [perBench, setPerBench] = useState("1");
  const [registration, setRegistration] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { void params.then((p) => setId(p.id)); }, [params]);
  async function load() {
    if (!id) return;
    const [d, c, r, x] = await Promise.all([
      fetch(`/api/backend/seat-plans/${id}`),
      fetch(`/api/backend/seat-plans/${id}/candidates`),
      fetch("/api/backend/rooms"),
      fetch(`/api/backend/seat-plans/${id}/excluded`),
    ]);
    const detailData = ((await d.json()) as { data?: Detail }).data ?? null;
    setDetail(detailData); setCandidates(((await c.json()) as { data?: Row[] }).data ?? []);
    setRooms(((await r.json()) as { data?: Row[] }).data ?? []); setExcluded(((await x.json()) as { data?: Row[] }).data ?? []);
    if (detailData?.rooms) setTeacherNames(Object.fromEntries(detailData.rooms.map((r) => [String(nested(r.room).id || nested(r.link).roomId), String(nested(r.link).roomTeacherName ?? "")] )));
  }
  useEffect(() => { void load(); }, [id]);
  const approved = useMemo(() => candidates.filter((c) => nested(c.candidate).status === "approved"), [candidates]);
  async function addCandidate() { if (!registration) return; const r = await fetch(`/api/backend/seat-plans/${id}/candidates/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationNumber: registration }) }); setMessage(r.ok ? "শিক্ষার্থী যোগ হয়েছে" : "রেজিস্ট্রেশন নম্বর পাওয়া যায়নি"); setRegistration(""); await load(); }
  async function excludeSelected() { if (!selected.length) return; await fetch(`/api/backend/seat-plans/${id}/candidates`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ excludeStudentIds: selected }) }); setSelected([]); setMessage("নির্বাচিত প্রার্থীদের বাদ দেওয়া হয়েছে"); await load(); }
  async function generate() { const r = await fetch(`/api/backend/seat-plans/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomIds, roomMode: mode, pattern, perBench: Number(perBench), roomTeacherNames: teacherNames }) }); const p = await r.json() as { message?: string }; setMessage(r.ok ? "আসন বিন্যাস তৈরি হয়েছে" : (p.message ?? "আসন তৈরি করা যায়নি")); await load(); }
  async function post(action: string) { const r = await fetch(`/api/backend/seat-plans/${id}/${action}`, { method: "POST" }); const p = await r.json() as { message?: string }; setMessage(r.ok ? "কাজ সম্পন্ন হয়েছে" : (p.message ?? "কাজটি করা যায়নি")); await load(); }
  function print(kind: "chart" | "summary" | "excluded") { document.body.dataset.seatPrint = kind; window.print(); window.setTimeout(() => delete document.body.dataset.seatPrint, 250); }
  if (!detail) return <main className="content"><p>সিট প্ল্যান লোড হচ্ছে…</p></main>;
  const status = String(detail.status);
  return <main className="content seat-plan-detail">
    <div className="page-heading no-seat-print"><div><Link href="/dashboard/seat-plans">← সিট প্ল্যানে ফিরুন</Link><h1>{String(detail.title)}</h1><p>{String(detail.sittingDate)} · {String(detail.shift)} · <Badge>{status === "published" ? "প্রকাশিত" : status === "locked" ? "লক" : "খসড়া"}</Badge></p></div></div>
    {message && <p className="text-sm text-muted-foreground no-seat-print">{message}</p>}
    <div className="seat-stepper no-seat-print">{steps.map((label, i) => <button type="button" key={label} className={i === step ? "active" : i < step ? "done" : ""} onClick={() => setStep(i)}>{i + 1}. {label}</button>)}</div>
    {step === 0 && <Card className="no-seat-print"><CardHeader><CardTitle>পরীক্ষা ও বিষয়</CardTitle></CardHeader><CardContent><p>সংযুক্ত বিষয়: {(detail.subjects ?? []).map((s) => String(s.subjectNameBn ?? s.nameBn ?? "বিষয়")).join(" · ")}</p><Button onClick={() => setStep(1)}>পরবর্তী</Button></CardContent></Card>}
    {step === 1 && <Card className="no-seat-print"><CardHeader><CardTitle>ক্লাস ও গ্রুপ</CardTitle></CardHeader><CardContent><p>নির্বাচিত শাখা থেকে প্রার্থী তালিকা তৈরি হয়েছে। প্রতিটি প্রার্থীর শ্রেণি, শাখা ও গ্রুপ ধাপ ৩-এ যাচাই করুন।</p><Button onClick={() => setStep(2)}>পরবর্তী</Button></CardContent></Card>}
    {step === 2 && <Card className="no-seat-print"><CardHeader><CardTitle>যোগ্যতা ও অনুমোদন</CardTitle></CardHeader><CardContent><div className="mb-4 flex gap-2"><Input placeholder="রেজিস্ট্রেশন নম্বর দিয়ে যোগ করুন" value={registration} onChange={(e) => setRegistration(e.target.value)} /><Button onClick={() => void addCandidate()}>যোগ</Button><Button variant="outline" onClick={() => void excludeSelected()}>নির্বাচিত বাদ</Button></div><div className="tbl-wrap"><table className="finance-table"><thead><tr><th /><th>নাম</th><th>রেজি</th><th>শ্রেণি/শাখা/গ্রুপ</th><th>অবস্থা</th></tr></thead><tbody>{candidates.map((c) => { const student = nested(c.student); const candidate = nested(c.candidate); return <tr key={candidate.id}><td><input type="checkbox" checked={selected.includes(String(student.id))} onChange={() => setSelected((x) => x.includes(String(student.id)) ? x.filter((y) => y !== String(student.id)) : [...x, String(student.id)])} /></td><td>{String(c.name ?? "—")}</td><td>{String(c.registrationNumber ?? "—")}</td><td>{[c.classNameBn, c.sectionNameBn, c.groupName].filter(Boolean).join(" / ") || "—"}</td><td>{candidate.status === "approved" ? <Badge variant="success">অনুমোদিত</Badge> : <Badge variant="warning">{reasonLabels[String(candidate.excludeReason)] ?? "বাদ"}</Badge>}</td></tr>; })}</tbody></table></div><p className="mt-3">অনুমোদিত: {approved.length} জন · বাদ: {excluded.length} জন</p><Button onClick={() => setStep(3)}>পরবর্তী</Button></CardContent></Card>}
    {step === 3 && <Card className="no-seat-print"><CardHeader><CardTitle>রুম ও বিন্যাস</CardTitle></CardHeader><CardContent><div className="mb-4 flex flex-wrap gap-2">{rooms.filter((r) => Boolean(r.isActive)).map((r) => <div key={r.id} className="flex flex-col gap-1"><Button size="sm" variant={roomIds.includes(r.id) ? "default" : "outline"} onClick={() => setRoomIds((x) => x.includes(r.id) ? x.filter((y) => y !== r.id) : [...x, r.id])}>{String(r.nameBn)} ({Number(r.benchRows) * Number(r.benchColumns) * Number(perBench)})</Button>{roomIds.includes(r.id) && <Input className="w-44" placeholder="দায়িত্বপ্রাপ্ত শিক্ষক" value={teacherNames[r.id] ?? ""} onChange={(e) => setTeacherNames((x) => ({ ...x, [r.id]: e.target.value }))} />}</div>)}</div><div className="flex flex-wrap gap-3"><label>প্যাটার্ন <select value={pattern} onChange={(e) => setPattern(e.target.value)}><option value="serial">ক্রমিক</option><option value="class_mix">শ্রেণি মিশ্রণ</option><option value="group_mix">গ্রুপ মিশ্রণ</option><option value="zigzag">জিগজ্যাগ</option></select></label><label>রুম মোড <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="mixed">মিশ্র</option><option value="separate_by_group">গ্রুপ আলাদা</option></select></label><label>প্রতি বেঞ্চ <select value={perBench} onChange={(e) => setPerBench(e.target.value)}><option value="1">১</option><option value="2">২</option></select></label></div><Button className="mt-4" onClick={() => void generate()}>আসন জেনারেট</Button><Button className="mt-4 ml-2" variant="outline" onClick={() => setStep(4)}>পরবর্তী</Button></CardContent></Card>}
    {step === 4 && <><Card className="no-seat-print"><CardHeader><CardTitle>পর্যালোচনা ও প্রকাশ</CardTitle></CardHeader><CardContent><p>বসানো হয়েছে: {detail.assignments?.length ?? 0} জন · অনুমোদিত: {approved.length} জন</p><div className="flex flex-wrap gap-2"><Button onClick={() => print("chart")}>দরজার চার্ট প্রিন্ট</Button><Button variant="outline" onClick={() => print("summary")}>সারাংশ প্রিন্ট</Button><Button variant="outline" onClick={() => print("excluded")}>বাদ-পড়া তালিকা</Button>{status === "draft" && <Button variant="outline" onClick={() => void post("lock")}>লক</Button>}{status === "locked" && <Button onClick={() => void post("publish")}>প্রকাশ</Button>}</div></CardContent></Card><section className="seat-print-sheet"><div className="seat-excluded-sheet"><h2>বাদ-পড়া শিক্ষার্থীদের তালিকা</h2><p>{String(detail.title)} · {String(detail.sittingDate)}</p><table><thead><tr><th>নাম</th><th>রেজিস্ট্রেশন</th><th>শ্রেণি/শাখা</th><th>কারণ</th></tr></thead><tbody>{excluded.map((c) => <tr key={c.id}><td>{String(c.name ?? "—")}</td><td>{String(c.registrationNumber ?? "—")}</td><td>{[c.classNameBn, c.sectionNameBn].filter(Boolean).join(" / ") || "—"}</td><td>{reasonLabels[String(nested(c.candidate).excludeReason)] ?? "বাদ"}</td></tr>)}</tbody></table></div>{(detail.rooms ?? []).map((r) => { const room = nested(r.room); const link = nested(r.link); return <article className="seat-chart-room" key={String(link.id || room.id)}><h2>আসন বিন্যাস — {String(room.nameBn ?? "রুম")}</h2><p>{String(detail.sittingDate)} · {String(detail.title)}</p><table><thead><tr><th>সিট নম্বর</th><th>রোল</th><th>শিক্ষার্থীর নাম</th><th>রেজিস্ট্রেশন নম্বর</th><th>গ্রুপ</th></tr></thead><tbody>{(detail.assignments ?? []).filter((a) => String(a.roomName) === String(room.nameBn)).map((a) => { const assignment = nested(a.assignment); const student = nested(a.student); return <tr key={assignment.id || a.id}><td>{String(assignment.seatNo ?? "—")}</td><td>{String(student.roll ?? "—")}</td><td>{String(a.name ?? "—")}</td><td>{String(a.registrationNumber ?? "—")}</td><td>{String(a.groupName ?? "—")}</td></tr>; })}</tbody></table><p>কক্ষের দায়িত্বপ্রাপ্ত শিক্ষকের নাম: {String(link.roomTeacherName ?? "____________________")}</p></article>; })}</section></>}
  </main>;
}
