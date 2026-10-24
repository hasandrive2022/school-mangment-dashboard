"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bn } from "@/lib/format";
import { UploadThingField } from "@/components/uploadthing-field";

type AcademicRow = {
  id: string;
  nameBn?: string;
  name?: string;
  year?: number | string;
  classId?: string;
  isCurrent?: boolean;
};

const emptyForm = {
  displayNameBn: "",
  nameEn: "",
  sessionId: "",
  classId: "",
  sectionId: "",
  roll: "",
  dateOfBirth: "",
  gender: "",
  religion: "",
  bloodGroup: "",
  fatherNameBn: "",
  motherNameBn: "",
  guardianMobile: "",
  presentAddress: "",
  permanentAddress: "",
  photoUrl: "",
};

export default function NewStudentPage() {
  const [form, setForm] = useState(emptyForm);
  const [sessions, setSessions] = useState<AcademicRow[]>([]);
  const [classes, setClasses] = useState<AcademicRow[]>([]);
  const [sections, setSections] = useState<AcademicRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    id: string;
    registrationNumber?: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [sRes, cRes, secRes] = await Promise.all([
        fetch("/api/backend/academics/sessions"),
        fetch("/api/backend/academics/classes"),
        fetch("/api/backend/academics/sections"),
      ]);
      if (sRes.ok) {
        const p = (await sRes.json()) as { data?: AcademicRow[] };
        const rows = p.data ?? [];
        setSessions(rows);
        const current = rows.find((r) => r.isCurrent) ?? rows[0];
        if (current) {
          setForm((prev) =>
            prev.sessionId ? prev : { ...prev, sessionId: current.id },
          );
        }
      }
      if (cRes.ok) {
        const p = (await cRes.json()) as { data?: AcademicRow[] };
        setClasses(p.data ?? []);
      }
      if (secRes.ok) {
        const p = (await secRes.json()) as { data?: AcademicRow[] };
        setSections(p.data ?? []);
      }
    })();
  }, []);

  const classSections = form.classId
    ? sections.filter((s) => !s.classId || s.classId === form.classId)
    : sections;

  function set<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const value: Record<string, unknown> = {
      displayNameBn: form.displayNameBn,
      sessionId: form.sessionId,
      classId: form.classId,
    };
    if (form.sectionId) value.sectionId = form.sectionId;
    if (form.roll) value.roll = Number(form.roll);
    if (form.nameEn) value.nameEn = form.nameEn;
    if (form.fatherNameBn) value.fatherNameBn = form.fatherNameBn;
    if (form.motherNameBn) value.motherNameBn = form.motherNameBn;
    if (form.guardianMobile) value.guardianMobile = form.guardianMobile;
    if (form.dateOfBirth) value.dateOfBirth = form.dateOfBirth;
    if (form.gender) value.gender = form.gender;
    if (form.religion) value.religion = form.religion;
    if (form.bloodGroup) value.bloodGroup = form.bloodGroup;
    if (form.presentAddress) value.presentAddress = form.presentAddress;
    if (form.permanentAddress) value.permanentAddress = form.permanentAddress;
    if (form.photoUrl) value.photoUrl = form.photoUrl;
    try {
      const response = await fetch("/api/backend/people/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { id: string; registrationNumber?: string };
        message?: string;
      } | null;
      if (!response.ok || !payload?.data) {
        setError(
          payload?.message ??
            "শিক্ষার্থী যোগ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
        );
        return;
      }
      setCreated({
        id: payload.data.id,
        registrationNumber: payload.data.registrationNumber,
      });
    } catch {
      setError("শিক্ষার্থী যোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCreated(null);
    setError("");
    setForm((prev) => ({ ...emptyForm, sessionId: prev.sessionId }));
  }

  if (created) {
    return (
      <div className="dstack">
        <div className="alert g">
          <Check className="ic" />
          <span>
            <b>শিক্ষার্থী সফলভাবে যোগ হয়েছে।</b>
          </span>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p className="cs">রেজিস্ট্রেশন নম্বর</p>
          <div
            className="num"
            style={{ fontSize: 34, fontWeight: 700, color: "var(--p800)" }}
          >
            {created.registrationNumber
              ? bn(created.registrationNumber)
              : "—"}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            এই নম্বরটি শিক্ষার্থী ও অভিভাবককে জানিয়ে দিন — পোর্টালে ঢোকার জন্য
            এটাই লাগবে, পাসওয়ার্ড লাগবে না।
          </p>
          <div
            className="rowflex"
            style={{ justifyContent: "center", marginTop: 18 }}
          >
            <Link
              className="btn"
              href={`/dashboard/people/students/${created.id}`}
            >
              প্রোফাইল দেখুন
            </Link>
            <Button type="button" className="btn gho" onClick={resetForm}>
              <Plus className="ic" data-icon="inline-start" /> আরেকজন যোগ করুন
            </Button>
            <Link className="btn gho" href="/dashboard/people">
              তালিকায় ফিরুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dstack">
      <div className="chead">
        <Link className="btn gho sm" href="/dashboard/people">
          <ArrowLeft className="ic" data-icon="inline-start" /> তালিকায় ফিরুন
        </Link>
        <div>
          <h2 className="dpage-title">নতুন শিক্ষার্থী যোগ করুন</h2>
          <p className="cs">শিক্ষার্থীর পূর্ণ তথ্য দিয়ে রেকর্ড তৈরি করুন</p>
        </div>
      </div>

      {error && <p className="alert r">{error}</p>}

      <form onSubmit={submit} className="dstack">
        <div className="card">
          <div className="chead">
            <h3 className="ct">শ্রেণি তথ্য</h3>
          </div>
          <div className="f3">
            <div>
              <label className="lbl" htmlFor="sf-session">
                সেশন <span className="req">*</span>
              </label>
              <Select
                id="sf-session"
                className="sel"
                value={form.sessionId}
                onChange={(e) => set("sessionId", e.target.value)}
                required
              >
                <option value="">সেশন নির্বাচন করুন</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn ?? s.name ?? (s.year ? bn(s.year) : "সেশন")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="sf-class">
                শ্রেণি <span className="req">*</span>
              </label>
              <Select
                id="sf-class"
                className="sel"
                value={form.classId}
                onChange={(e) => {
                  set("classId", e.target.value);
                  set("sectionId", "");
                }}
                required
              >
                <option value="">শ্রেণি নির্বাচন করুন</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn ?? c.name ?? "শ্রেণি"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="sf-section">
                শাখা
              </label>
              <Select
                id="sf-section"
                className="sel"
                value={form.sectionId}
                onChange={(e) => set("sectionId", e.target.value)}
              >
                <option value="">শাখা নির্বাচন করুন</option>
                {classSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn ?? s.name ?? "শাখা"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="sf-roll">
                রোল নম্বর
              </label>
              <Input
                id="sf-roll"
                className="inp"
                type="number"
                min="1"
                value={form.roll}
                onChange={(e) => set("roll", e.target.value)}
                placeholder="রোল নম্বর"
              />
            </div>
            <div>
              <label className="lbl">রেজিস্ট্রেশন নম্বর</label>
              <Input
                className="inp"
                value="সংরক্ষণ করলেই স্বয়ংক্রিয় তৈরি হবে"
                disabled
                readOnly
              />
              <div className="hint">
                এটাই শিক্ষার্থীর লগিন পরিচয় — পাসওয়ার্ড লাগবে না।
              </div>
            </div>
            <div>
              <label className="lbl">শিক্ষার্থীর ছবি</label>
              <UploadThingField
                endpoint="profileImage"
                value={form.photoUrl}
                onChange={(photoUrl) => set("photoUrl", photoUrl)}
                label="শিক্ষার্থীর ছবি আপলোড করুন"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chead">
            <h3 className="ct">ব্যক্তিগত তথ্য</h3>
          </div>
          <div className="f3">
            <div>
              <label className="lbl" htmlFor="sf-nameBn">
                নাম (বাংলা) <span className="req">*</span>
              </label>
              <Input
                id="sf-nameBn"
                className="inp"
                value={form.displayNameBn}
                onChange={(e) => set("displayNameBn", e.target.value)}
                placeholder="শিক্ষার্থীর পূর্ণ নাম"
                required
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-nameEn">
                নাম (ইংরেজি)
              </label>
              <Input
                id="sf-nameEn"
                className="inp"
                value={form.nameEn}
                onChange={(e) => set("nameEn", e.target.value)}
                placeholder="ইংরেজিতে নাম"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-dob">
                জন্ম তারিখ
              </label>
              <Input
                id="sf-dob"
                className="inp"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-gender">
                লিঙ্গ
              </label>
              <Select
                id="sf-gender"
                className="sel"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">নির্বাচন করুন</option>
                <option value="ছেলে">ছেলে</option>
                <option value="মেয়ে">মেয়ে</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="sf-religion">
                ধর্ম
              </label>
              <Select
                id="sf-religion"
                className="sel"
                value={form.religion}
                onChange={(e) => set("religion", e.target.value)}
              >
                <option value="">নির্বাচন করুন</option>
                <option value="ইসলাম">ইসলাম</option>
                <option value="হিন্দু">হিন্দু</option>
                <option value="বৌদ্ধ">বৌদ্ধ</option>
                <option value="খ্রিস্টান">খ্রিস্টান</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </Select>
            </div>
            <div>
              <label className="lbl" htmlFor="sf-blood">
                রক্তের গ্রুপ
              </label>
              <Select
                id="sf-blood"
                className="sel"
                value={form.bloodGroup}
                onChange={(e) => set("bloodGroup", e.target.value)}
              >
                <option value="">নির্বাচন করুন</option>
                <option value="A+">এ পজিটিভ</option>
                <option value="A-">এ নেগেটিভ</option>
                <option value="B+">বি পজিটিভ</option>
                <option value="B-">বি নেগেটিভ</option>
                <option value="O+">ও পজিটিভ</option>
                <option value="O-">ও নেগেটিভ</option>
                <option value="AB+">এবি পজিটিভ</option>
                <option value="AB-">এবি নেগেটিভ</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chead">
            <h3 className="ct">অভিভাবক ও ঠিকানা</h3>
          </div>
          <div className="f3">
            <div>
              <label className="lbl" htmlFor="sf-father">
                পিতার নাম
              </label>
              <Input
                id="sf-father"
                className="inp"
                value={form.fatherNameBn}
                onChange={(e) => set("fatherNameBn", e.target.value)}
                placeholder="পিতার নাম"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-mother">
                মাতার নাম
              </label>
              <Input
                id="sf-mother"
                className="inp"
                value={form.motherNameBn}
                onChange={(e) => set("motherNameBn", e.target.value)}
                placeholder="মাতার নাম"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-mobile">
                অভিভাবকের মোবাইল
              </label>
              <Input
                id="sf-mobile"
                className="inp"
                value={form.guardianMobile}
                onChange={(e) => set("guardianMobile", e.target.value)}
                placeholder="মোবাইল নম্বর"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-present">
                বর্তমান ঠিকানা
              </label>
              <Input
                id="sf-present"
                className="inp"
                value={form.presentAddress}
                onChange={(e) => set("presentAddress", e.target.value)}
                placeholder="বর্তমান ঠিকানা"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sf-permanent">
                স্থায়ী ঠিকানা
              </label>
              <Input
                id="sf-permanent"
                className="inp"
                value={form.permanentAddress}
                onChange={(e) => set("permanentAddress", e.target.value)}
                placeholder="স্থায়ী ঠিকানা"
              />
            </div>
          </div>
        </div>

        <div className="rowflex">
          <Button type="submit" className="btn" disabled={submitting}>
            <Check className="ic" data-icon="inline-start" />
            {submitting ? "সংরক্ষণ হচ্ছে…" : "শিক্ষার্থী সংরক্ষণ করুন"}
          </Button>
          <Link className="btn gho" href="/dashboard/people">
            বাতিল
          </Link>
          <span className="small muted">
            সংরক্ষণের পর রেজিস্ট্রেশন নম্বরটি শিক্ষার্থী ও অভিভাবককে জানিয়ে
            দিন।
          </span>
        </div>
      </form>
    </div>
  );
}
