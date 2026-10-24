"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bn, bnNum } from "@/lib/format";

type Row = Record<string, unknown> & { id: string };
type TabKey = "sessions" | "classes" | "sections" | "subjects";

const tabs: Array<[TabKey, string]> = [
  ["sessions", "সেশন"],
  ["classes", "শ্রেণি"],
  ["sections", "শাখা"],
  ["subjects", "বিষয়"],
];

const emptyForms: Record<TabKey, Record<string, string | boolean>> = {
  sessions: { name: "", year: "", isCurrent: false },
  classes: { nameBn: "", nameEn: "", orderIndex: "" },
  sections: { classId: "", nameBn: "", shift: "দিন", groupName: "" },
  subjects: {
    nameBn: "",
    code: "",
    fullMarks: "",
    cqMarks: "",
    mcqMarks: "",
    practicalMarks: "",
  },
};

function rowsOf(p: unknown): Row[] {
  if (Array.isArray(p)) return p as Row[];
  if (p && typeof p === "object") {
    const d = (p as { data?: unknown }).data;
    if (Array.isArray(d)) return d as Row[];
  }
  return [];
}

async function errMsg(res: Response, fallback: string): Promise<string> {
  try {
    const p = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(p.message)) return p.message.join(" ");
    if (typeof p.message === "string" && p.message) return p.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function AcademicsPage() {
  const [tab, setTab] = useState<TabKey>("sessions");
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string | boolean>>({ ...emptyForms.sessions });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(which: TabKey) {
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/academics/${which}`);
      setRows(rowsOf(await res.json()));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(tab);
      setEditingId(null);
      setForm({ ...emptyForms[tab] });
      setError("");
      setMessage("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tab]);

  useEffect(() => {
    void fetch("/api/backend/academics/classes")
      .then((r) => r.json())
      .then((p: unknown) => setClasses(rowsOf(p)))
      .catch(() => setClasses([]));
  }, []);

  function setField(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildValue(): Record<string, unknown> {
    if (tab === "sessions") {
      return {
        name: String(form.name ?? "").trim(),
        year: Number(form.year),
        isCurrent: Boolean(form.isCurrent),
      };
    }
    if (tab === "classes") {
      return {
        nameBn: String(form.nameBn ?? "").trim(),
        nameEn: String(form.nameEn ?? "").trim(),
        orderIndex: Number(form.orderIndex || 0),
      };
    }
    if (tab === "sections") {
      return {
        classId: String(form.classId ?? ""),
        nameBn: String(form.nameBn ?? "").trim(),
        shift: String(form.shift ?? "দিন"),
        groupName: String(form.groupName ?? "").trim() || undefined,
      };
    }
    return {
      nameBn: String(form.nameBn ?? "").trim(),
      code: String(form.code ?? "").trim() || undefined,
      fullMarks: Number(form.fullMarks || 0),
      cqMarks: Number(form.cqMarks || 0),
      mcqMarks: Number(form.mcqMarks || 0),
      practicalMarks: Number(form.practicalMarks || 0),
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const value = buildValue();
    const url = editingId
      ? `/api/backend/academics/${tab}/${editingId}`
      : `/api/backend/academics/${tab}`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      setError(await errMsg(res, "সংরক্ষণ করা যায়নি"));
      return;
    }
    setMessage(editingId ? "সংশোধন সংরক্ষিত হয়েছে" : "যোগ করা হয়েছে");
    setEditingId(null);
    setForm({ ...emptyForms[tab] });
    await load(tab);
    if (tab === "classes") {
      const cres = await fetch("/api/backend/academics/classes");
      setClasses(rowsOf(await cres.json()));
    }
  }

  function startEdit(row: Row) {
    setError("");
    setMessage("");
    setEditingId(row.id);
    if (tab === "sessions") {
      setForm({
        name: str(row.name),
        year: str(row.year),
        isCurrent: Boolean(row.isCurrent),
      });
    } else if (tab === "classes") {
      setForm({
        nameBn: str(row.nameBn),
        nameEn: str(row.nameEn),
        orderIndex: str(row.orderIndex),
      });
    } else if (tab === "sections") {
      setForm({
        classId: str(row.classId),
        nameBn: str(row.nameBn),
        shift: str(row.shift) || "দিন",
        groupName: str(row.groupName),
      });
    } else {
      setForm({
        nameBn: str(row.nameBn),
        code: str(row.code),
        fullMarks: str(row.fullMarks),
        cqMarks: str(row.cqMarks),
        mcqMarks: str(row.mcqMarks),
        practicalMarks: str(row.practicalMarks),
      });
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForms[tab] });
    setError("");
  }

  async function remove(row: Row) {
    const label =
      str(row.nameBn) || str(row.name) || str(row.year) || "এই রেকর্ডটি";
    if (!window.confirm(`“${label}” মুছে ফেলতে চান?`)) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/backend/academics/${tab}/${row.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(await errMsg(res, "মুছে ফেলা যায়নি"));
      return;
    }
    setMessage("মুছে ফেলা হয়েছে");
    if (editingId === row.id) cancelEdit();
    await load(tab);
  }

  const tabLabel = tabs.find(([k]) => k === tab)?.[1] ?? "";

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">একাডেমিক কাঠামো</h2>
          <p className="cs">
            সেশন, শ্রেণি, শাখা ও বিষয় পরিচালনা করুন — মোট {bnNum(rows.length)}টি {tabLabel}
          </p>
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
        <div className="chead">
          <div>
            <h3 className="ct">
              {editingId ? `${tabLabel} সম্পাদনা` : `নতুন ${tabLabel} যোগ করুন`}
            </h3>
            <p className="cs">
              {editingId
                ? "তথ্য বদলে সংরক্ষণ করুন"
                : `নিচের ফর্মে ${tabLabel}-এর তথ্য দিন`}
            </p>
          </div>
          <span className="sp" />
          {editingId && (
            <Button type="button" variant="ghost" className="btn gho sm" onClick={cancelEdit}>
              <X className="ic" /> বাতিল
            </Button>
          )}
        </div>

        <form onSubmit={(e) => void submit(e)}>
          {tab === "sessions" && (
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="ac-name">নাম <span className="req">*</span></label>
                <Input id="ac-name" className="inp" required value={String(form.name ?? "")}
                  onChange={(e) => setField("name", e.target.value)} placeholder="যেমন: ২০২৬" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-year">বছর <span className="req">*</span></label>
                <Input id="ac-year" className="inp" type="number" required value={String(form.year ?? "")}
                  onChange={(e) => setField("year", e.target.value)} placeholder="২০২৬" />
              </div>
              <div className="rowflex" style={{ alignItems: "center" }}>
                <label className="sw blue">
                  <input type="checkbox" checked={Boolean(form.isCurrent)}
                    onChange={(e) => setField("isCurrent", e.target.checked)} />
                  <span className="tr" />
                </label>
                <span className="small b">বর্তমান সেশন</span>
              </div>
            </div>
          )}

          {tab === "classes" && (
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="ac-nameBn">নাম (বাংলা) <span className="req">*</span></label>
                <Input id="ac-nameBn" className="inp" required value={String(form.nameBn ?? "")}
                  onChange={(e) => setField("nameBn", e.target.value)} placeholder="যেমন: ষষ্ঠ" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-nameEn">নাম (ইংরেজি)</label>
                <Input id="ac-nameEn" className="inp" value={String(form.nameEn ?? "")}
                  onChange={(e) => setField("nameEn", e.target.value)} placeholder="যেমন: Six" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-order">ক্রম</label>
                <Input id="ac-order" className="inp" type="number" value={String(form.orderIndex ?? "")}
                  onChange={(e) => setField("orderIndex", e.target.value)} placeholder="১" />
              </div>
            </div>
          )}

          {tab === "sections" && (
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="ac-classId">শ্রেণি <span className="req">*</span></label>
                <Select id="ac-classId" className="sel" required value={String(form.classId ?? "")}
                  onChange={(e) => setField("classId", e.target.value)}>
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{str(c.nameBn)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="lbl" htmlFor="ac-secName">নাম <span className="req">*</span></label>
                <Input id="ac-secName" className="inp" required value={String(form.nameBn ?? "")}
                  onChange={(e) => setField("nameBn", e.target.value)} placeholder="যেমন: ক" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-shift">শিফট</label>
                <Select id="ac-shift" className="sel" value={String(form.shift ?? "দিন")}
                  onChange={(e) => setField("shift", e.target.value)}>
                  <option value="দিন">দিন</option>
                  <option value="সকাল">সকাল</option>
                  <option value="সন্ধ্যা">সন্ধ্যা</option>
                </Select>
              </div>
              <div>
                <label className="lbl" htmlFor="ac-group">গ্রুপ</label>
                <Input id="ac-group" className="inp" value={String(form.groupName ?? "")}
                  onChange={(e) => setField("groupName", e.target.value)} placeholder="যেমন: বিজ্ঞান" />
              </div>
            </div>
          )}

          {tab === "subjects" && (
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="ac-subName">নাম <span className="req">*</span></label>
                <Input id="ac-subName" className="inp" required value={String(form.nameBn ?? "")}
                  onChange={(e) => setField("nameBn", e.target.value)} placeholder="যেমন: গণিত" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-code">কোড</label>
                <Input id="ac-code" className="inp" value={String(form.code ?? "")}
                  onChange={(e) => setField("code", e.target.value)} placeholder="যেমন: ১০১" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-full">পূর্ণ নম্বর</label>
                <Input id="ac-full" className="inp" type="number" value={String(form.fullMarks ?? "")}
                  onChange={(e) => setField("fullMarks", e.target.value)} placeholder="১০০" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-cq">সৃজনশীল (CQ)</label>
                <Input id="ac-cq" className="inp" type="number" value={String(form.cqMarks ?? "")}
                  onChange={(e) => setField("cqMarks", e.target.value)} placeholder="৭০" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-mcq">বহুনির্বাচনি (MCQ)</label>
                <Input id="ac-mcq" className="inp" type="number" value={String(form.mcqMarks ?? "")}
                  onChange={(e) => setField("mcqMarks", e.target.value)} placeholder="৩০" />
              </div>
              <div>
                <label className="lbl" htmlFor="ac-prac">ব্যবহারিক</label>
                <Input id="ac-prac" className="inp" type="number" value={String(form.practicalMarks ?? "")}
                  onChange={(e) => setField("practicalMarks", e.target.value)} placeholder="০" />
              </div>
            </div>
          )}

          <div className="rowflex" style={{ marginTop: 14 }}>
            <Button type="submit" className="btn">
              <Plus className="ic" /> {editingId ? "সংরক্ষণ করুন" : "যোগ করুন"}
            </Button>
            {message && <span className="small grn-t b">{message}</span>}
          </div>
          {error && <p className="alert r" style={{ marginTop: 12 }}>{error}</p>}
        </form>
      </div>

      <div className="card flush">
        <div className="chead" style={{ padding: "18px 18px 6px" }}>
          <div>
            <h3 className="ct">{tabLabel} তালিকা</h3>
            <p className="cs">মোট {bnNum(rows.length)}টি</p>
          </div>
        </div>
        {loading ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>লোড হচ্ছে…</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
            কোনো {tabLabel} নেই — উপরের ফর্ম থেকে যোগ করুন।
          </p>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                {tab === "sessions" && (
                  <tr><th>নাম</th><th>বছর</th><th>অবস্থা</th><th className="r">কার্যকলাপ</th></tr>
                )}
                {tab === "classes" && (
                  <tr><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ক্রম</th><th className="r">কার্যকলাপ</th></tr>
                )}
                {tab === "sections" && (
                  <tr><th>শাখা</th><th>শ্রেণি</th><th>শিফট</th><th>গ্রুপ</th><th className="r">কার্যকলাপ</th></tr>
                )}
                {tab === "subjects" && (
                  <tr><th>বিষয়</th><th>কোড</th><th>পূর্ণ নম্বর</th><th>সৃজনশীল</th><th>বহুনির্বাচনি</th><th>ব্যবহারিক</th><th className="r">কার্যকলাপ</th></tr>
                )}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {tab === "sessions" && (
                      <>
                        <td><b>{str(row.name) || "—"}</b></td>
                        <td className="num">{bn(str(row.year))}</td>
                        <td>{row.isCurrent ? <span className="chip g">বর্তমান</span> : <span className="chip gr">আগের</span>}</td>
                      </>
                    )}
                    {tab === "classes" && (
                      <>
                        <td><b>{str(row.nameBn) || "—"}</b></td>
                        <td>{str(row.nameEn) || "—"}</td>
                        <td className="num">{bn(str(row.orderIndex ?? ""))}</td>
                      </>
                    )}
                    {tab === "sections" && (
                      <>
                        <td><b>{str(row.nameBn) || "—"}</b></td>
                        <td>{str(row.classNameBn) || "—"}</td>
                        <td>{str(row.shift) || "—"}</td>
                        <td>{str(row.groupName) || "—"}</td>
                      </>
                    )}
                    {tab === "subjects" && (
                      <>
                        <td><b>{str(row.nameBn) || "—"}</b></td>
                        <td className="num">{bn(str(row.code)) || "—"}</td>
                        <td className="num">{bn(str(row.fullMarks ?? ""))}</td>
                        <td className="num">{bn(str(row.cqMarks ?? ""))}</td>
                        <td className="num">{bn(str(row.mcqMarks ?? ""))}</td>
                        <td className="num">{bn(str(row.practicalMarks ?? ""))}</td>
                      </>
                    )}
                    <td className="r">
                      <span className="rowflex" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <button type="button" className="ibtn" title="সম্পাদনা" onClick={() => startEdit(row)}>
                          <Pencil className="ic" />
                        </button>
                        <button type="button" className="ibtn del" title="মুছুন" onClick={() => void remove(row)}>
                          <Trash2 className="ic" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
