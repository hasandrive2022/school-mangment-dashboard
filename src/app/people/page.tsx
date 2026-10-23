"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { bn, bnNum, takaLabel, takaToPaisa } from "@/lib/format";

type StudentRow = {
  id: string;
  nameBn?: string;
  nameEn?: string;
  registrationNumber?: string;
  classNameBn?: string;
  sectionNameBn?: string;
  roll?: number | string | null;
  fatherNameBn?: string;
  guardianMobile?: string;
  isActive?: boolean;
};
type TeacherRow = {
  id: string;
  nameBn?: string;
  nameEn?: string;
  teacherCode?: string;
  designation?: string;
  qualification?: string;
  mobile?: string;
  monthlySalary?: number;
  isActive?: boolean;
};
type StaffRow = {
  id: string;
  nameBn?: string;
  designation?: string;
  mobile?: string;
};
type AssignmentRow = {
  id: string;
  teacherId?: string;
  classId?: string;
  teacherNameBn?: string;
  teacherCode?: string;
  subjectNameBn?: string;
  classNameBn?: string;
  sectionNameBn?: string;
};
type AcademicRow = {
  id: string;
  nameBn?: string;
  name?: string;
  classId?: string;
  classNameBn?: string;
};

const tabs = [
  ["students", "শিক্ষার্থী"],
  ["teachers", "শিক্ষক"],
  ["staff", "কর্মচারী"],
  ["subjectAssignments", "বিষয় বরাদ্দ"],
] as const;
type TabKey = (typeof tabs)[number][0];

const tabMeta: Record<
  TabKey,
  { title: string; subtitle: string; addLabel: string; listTitle: string }
> = {
  students: {
    title: "শিক্ষার্থী তালিকা",
    subtitle: "শিক্ষার্থীদের প্রোফাইল, শ্রেণি ও অভিভাবকের তথ্য",
    addLabel: "শিক্ষার্থী যোগ করুন",
    listTitle: "শিক্ষার্থী তালিকা",
  },
  teachers: {
    title: "শিক্ষক তালিকা",
    subtitle: "শিক্ষকদের প্রোফাইল, পদবি ও বেতনের তথ্য",
    addLabel: "শিক্ষক যোগ করুন",
    listTitle: "শিক্ষক তালিকা",
  },
  staff: {
    title: "কর্মচারী তালিকা",
    subtitle: "বিদ্যালয়ের কর্মচারীদের তথ্য",
    addLabel: "কর্মচারী যোগ করুন",
    listTitle: "কর্মচারী তালিকা",
  },
  subjectAssignments: {
    title: "বিষয় বরাদ্দ",
    subtitle: "শিক্ষকভিত্তিক বিষয় ও শ্রেণি বরাদ্দ",
    addLabel: "বরাদ্দ যোগ করুন",
    listTitle: "বরাদ্দ তালিকা",
  },
};

const emptyTeacherForm = {
  displayNameBn: "",
  nameEn: "",
  teacherCode: "",
  username: "",
  email: "",
  password: "",
  designation: "সহকারী শিক্ষক",
  qualification: "",
  mobile: "",
  nid: "",
  joiningDate: "",
  monthlySalaryTaka: "",
  photoUrl: "",
};

export default function PeoplePage() {
  const [tab, setTab] = useState<TabKey>("students");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [subjects, setSubjects] = useState<AcademicRow[]>([]);
  const [classes, setClasses] = useState<AcademicRow[]>([]);
  const [sections, setSections] = useState<AcademicRow[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
  const [tempPassword, setTempPassword] = useState("");
  const [staffForm, setStaffForm] = useState({
    nameBn: "",
    designation: "",
    mobile: "",
  });
  const [assignForm, setAssignForm] = useState({
    teacherId: "",
    subjectId: "",
    classId: "",
    sectionId: "",
  });

  const meta = tabMeta[tab];

  async function loadTab(key: TabKey) {
    const res = await fetch(`/api/backend/people/${key}`);
    if (!res.ok) return;
    const payload = (await res.json()) as { data?: unknown[] };
    const data = (payload.data ?? []) as never[];
    if (key === "students") setStudents(data as StudentRow[]);
    if (key === "teachers") setTeachers(data as TeacherRow[]);
    if (key === "staff") setStaff(data as StaffRow[]);
    if (key === "subjectAssignments") setAssignments(data as AssignmentRow[]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/backend/people/${tab}`);
      if (!res.ok || cancelled) return;
      const payload = (await res.json()) as { data?: unknown[] };
      const data = (payload.data ?? []) as never[];
      if (cancelled) return;
      if (tab === "students") setStudents(data as StudentRow[]);
      if (tab === "teachers") setTeachers(data as TeacherRow[]);
      if (tab === "staff") setStaff(data as StaffRow[]);
      if (tab === "subjectAssignments")
        setAssignments(data as AssignmentRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    void (async () => {
      const [tRes, sRes, cRes, secRes] = await Promise.all([
        fetch("/api/backend/people/teachers"),
        fetch("/api/backend/academics/subjects"),
        fetch("/api/backend/academics/classes"),
        fetch("/api/backend/academics/sections"),
      ]);
      if (tRes.ok) {
        const p = (await tRes.json()) as { data?: TeacherRow[] };
        setTeachers(p.data ?? []);
      }
      if (sRes.ok) {
        const p = (await sRes.json()) as { data?: AcademicRow[] };
        setSubjects(p.data ?? []);
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

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((row) =>
      [row.nameBn, row.nameEn, row.registrationNumber, row.guardianMobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((row) =>
      [row.nameBn, row.nameEn, row.teacherCode, row.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [teachers, query]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((row) =>
      [row.nameBn, row.designation, row.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [staff, query]);

  const filteredAssignments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((row) =>
      [row.teacherNameBn, row.teacherCode, row.subjectNameBn, row.classNameBn]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [assignments, query]);

  const stats = useMemo(() => {
    if (tab === "students") {
      const active = students.filter((r) => r.isActive !== false).length;
      return [
        { label: "মোট শিক্ষার্থী", value: students.length, tone: "" },
        { label: "সক্রিয় শিক্ষার্থী", value: active, tone: "g" },
        { label: "নিষ্ক্রিয় শিক্ষার্থী", value: students.length - active, tone: "r" },
      ];
    }
    if (tab === "teachers") {
      const active = teachers.filter(
        (r) => (r as { isActive?: boolean }).isActive !== false,
      ).length;
      return [
        { label: "মোট শিক্ষক", value: teachers.length, tone: "" },
        { label: "সক্রিয় শিক্ষক", value: active, tone: "g" },
        { label: "নিষ্ক্রিয় শিক্ষক", value: teachers.length - active, tone: "r" },
      ];
    }
    if (tab === "staff") {
      const designations = new Set(
        staff.map((r) => r.designation).filter(Boolean),
      ).size;
      const withMobile = staff.filter((r) => r.mobile).length;
      return [
        { label: "মোট কর্মচারী", value: staff.length, tone: "" },
        { label: "পদবির ধরন", value: designations, tone: "g" },
        { label: "মোবাইলসহ কর্মচারী", value: withMobile, tone: "" },
      ];
    }
    const teacherCount = new Set(
      assignments.map((r) => r.teacherId).filter(Boolean),
    ).size;
    const classCount = new Set(
      assignments.map((r) => r.classId).filter(Boolean),
    ).size;
    return [
      { label: "মোট বরাদ্দ", value: assignments.length, tone: "" },
      { label: "শিক্ষক সংখ্যা", value: teacherCount, tone: "g" },
      { label: "শ্রেণি সংখ্যা", value: classCount, tone: "" },
    ];
  }, [tab, students, teachers, staff, assignments]);

  const recordCount =
    tab === "students"
      ? filteredStudents.length
      : tab === "teachers"
        ? filteredTeachers.length
        : tab === "staff"
          ? filteredStaff.length
          : filteredAssignments.length;

  async function submitTeacher(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setTempPassword("");
    const salaryTaka = teacherForm.monthlySalaryTaka
      ? Number(teacherForm.monthlySalaryTaka)
      : undefined;
    const value: Record<string, unknown> = {
      displayNameBn: teacherForm.displayNameBn,
      designation: teacherForm.designation,
    };
    if (teacherForm.nameEn) value.nameEn = teacherForm.nameEn;
    if (teacherForm.teacherCode) value.teacherCode = teacherForm.teacherCode;
    if (teacherForm.username) value.username = teacherForm.username;
    if (teacherForm.email) value.email = teacherForm.email;
    if (teacherForm.password) value.password = teacherForm.password;
    if (teacherForm.qualification) value.qualification = teacherForm.qualification;
    if (teacherForm.mobile) value.mobile = teacherForm.mobile;
    if (teacherForm.nid) value.nid = teacherForm.nid;
    if (teacherForm.joiningDate) value.joiningDate = teacherForm.joiningDate;
    if (salaryTaka !== undefined && !Number.isNaN(salaryTaka))
      value.monthlySalary = takaToPaisa(salaryTaka);
    if (teacherForm.photoUrl) value.photoUrl = teacherForm.photoUrl;
    const response = await fetch("/api/backend/people/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: TeacherRow & { temporaryPassword?: string };
      message?: string;
    } | null;
    if (!response.ok) {
      setError(payload?.message ?? "শিক্ষক যোগ করা যায়নি। আবার চেষ্টা করুন।");
      return;
    }
    if (payload?.data?.temporaryPassword)
      setTempPassword(payload.data.temporaryPassword);
    setMessage("শিক্ষক সফলভাবে যোগ হয়েছে।");
    setTeacherForm(emptyTeacherForm);
    await loadTab("teachers");
  }

  async function submitStaff(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/backend/people/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: { ...staffForm } }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    if (!response.ok) {
      setError(payload?.message ?? "কর্মচারী যোগ করা যায়নি।");
      return;
    }
    setMessage("কর্মচারী সফলভাবে যোগ হয়েছে।");
    setStaffForm({ nameBn: "", designation: "", mobile: "" });
    await loadTab("staff");
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const value: Record<string, unknown> = {
      teacherId: assignForm.teacherId,
      subjectId: assignForm.subjectId,
      classId: assignForm.classId,
    };
    if (assignForm.sectionId) value.sectionId = assignForm.sectionId;
    const response = await fetch("/api/backend/people/subjectAssignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    if (!response.ok) {
      setError(payload?.message ?? "বরাদ্দ যোগ করা যায়নি।");
      return;
    }
    setMessage("বিষয় বরাদ্দ সফলভাবে যোগ হয়েছে।");
    setAssignForm({ teacherId: "", subjectId: "", classId: "", sectionId: "" });
    await loadTab("subjectAssignments");
  }

  const assignSections = assignForm.classId
    ? sections.filter(
        (s) => !s.classId || s.classId === assignForm.classId,
      )
    : sections;

  function handleAddClick() {
    if (tab === "teachers") {
      setShowTeacherForm((v) => !v);
      return;
    }
    document
      .getElementById("people-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="dstack">
      <div className="chead" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="rowflex" style={{ gap: 9 }}>
            <span
              className="ic-wrap"
              style={{ width: 38, height: 38, flexBasis: 38 }}
            >
              <Users className="ic" />
            </span>
            <div>
              <h2 className="dpage-title">{meta.title}</h2>
              <p className="cs">{meta.subtitle}</p>
            </div>
          </div>
        </div>
        <span className="sp" />
        <Link className="btn gho sm" href="/people/import">
          <Download className="ic" data-icon="inline-start" /> ইমপোর্ট
        </Link>
        <Link className="btn gho sm" href="/people/promotion">
          প্রমোশন
        </Link>
        {tab === "students" ? (
          <Link className="btn sm" href="/dashboard/people/students/new">
            <Plus className="ic" data-icon="inline-start" /> {meta.addLabel}
          </Link>
        ) : (
          <Button className="btn sm" type="button" onClick={handleAddClick}>
            <Plus className="ic" data-icon="inline-start" /> {meta.addLabel}
          </Button>
        )}
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <Button
            className={tab === key ? "on" : ""}
            variant="ghost"
            size="sm"
            key={key}
            onClick={() => {
              setTab(key);
              setMessage("");
              setError("");
              setQuery("");
            }}
            type="button"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="g3">
        {stats.map((stat) => (
          <div className="card stat" key={stat.label}>
            <div>
              <div className="v num">{bnNum(stat.value)}</div>
              <div className="l">{stat.label}</div>
            </div>
            <div className={`ic-wrap${stat.tone ? ` ${stat.tone}` : ""}`}>
              <Users className="ic lg" />
            </div>
          </div>
        ))}
      </div>

      {message && <p className="alert g">{message}</p>}
      {error && <p className="alert r">{error}</p>}
      {tempPassword && (
        <div className="alert w">
          <span>
            <b>অস্থায়ী পাসওয়ার্ড (শিক্ষককে জানিয়ে দিন):</b>{" "}
            <span className="num">{tempPassword}</span>
          </span>
        </div>
      )}

      {tab === "students" && (
        <div className="card" id="people-add-form">
          <div className="chead">
            <div>
              <h3 className="ct">নতুন শিক্ষার্থী যোগ করুন</h3>
              <p className="cs">
                পূর্ণাঙ্গ ফর্মে শিক্ষার্থীর সব তথ্য দিয়ে রেকর্ড তৈরি করুন
              </p>
            </div>
            <span className="sp" />
            <Link className="btn" href="/dashboard/people/students/new">
              <Plus className="ic" data-icon="inline-start" /> শিক্ষার্থী যোগ
              করুন
            </Link>
          </div>
        </div>
      )}

      {tab === "teachers" && showTeacherForm && (
        <div className="card" id="people-add-form">
          <div className="chead">
            <div>
              <h3 className="ct">নতুন শিক্ষক যোগ করুন</h3>
              <p className="cs">শিক্ষকের পূর্ণ তথ্য দিন</p>
            </div>
          </div>
          <form onSubmit={submitTeacher}>
            <div className="f3">
              <div>
                <label className="lbl" htmlFor="tf-nameBn">
                  নাম (বাংলা) <span className="req">*</span>
                </label>
                <Input
                  id="tf-nameBn"
                  className="inp"
                  value={teacherForm.displayNameBn}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      displayNameBn: e.target.value,
                    })
                  }
                  placeholder="শিক্ষকের পূর্ণ নাম"
                  required
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-nameEn">
                  নাম (ইংরেজি)
                </label>
                <Input
                  id="tf-nameEn"
                  className="inp"
                  value={teacherForm.nameEn}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, nameEn: e.target.value })
                  }
                  placeholder="ইংরেজিতে নাম"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-code">
                  শিক্ষক কোড
                </label>
                <Input
                  id="tf-code"
                  className="inp"
                  value={teacherForm.teacherCode}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      teacherCode: e.target.value,
                    })
                  }
                  placeholder="খালি রাখলে স্বয়ংক্রিয় তৈরি হবে"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-username">
                  ইউজারনেম
                </label>
                <Input
                  id="tf-username"
                  className="inp"
                  value={teacherForm.username}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, username: e.target.value })
                  }
                  placeholder="খালি রাখলে স্বয়ংক্রিয় তৈরি হবে"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-email">
                  ইমেইল
                </label>
                <Input
                  id="tf-email"
                  className="inp"
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, email: e.target.value })
                  }
                  placeholder="ইমেইল ঠিকানা"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-password">
                  পাসওয়ার্ড
                </label>
                <Input
                  id="tf-password"
                  className="inp"
                  type="text"
                  value={teacherForm.password}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, password: e.target.value })
                  }
                  placeholder="খালি রাখলে অস্থায়ী পাসওয়ার্ড তৈরি হবে"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-designation">
                  পদবি
                </label>
                <Input
                  id="tf-designation"
                  className="inp"
                  list="designation-options"
                  value={teacherForm.designation}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      designation: e.target.value,
                    })
                  }
                />
                <datalist id="designation-options">
                  <option value="প্রধান শিক্ষক" />
                  <option value="সহকারী প্রধান শিক্ষক" />
                  <option value="সহকারী শিক্ষক" />
                  <option value="অন্যান্য" />
                </datalist>
              </div>
              <div>
                <label className="lbl" htmlFor="tf-qualification">
                  যোগ্যতা
                </label>
                <Input
                  id="tf-qualification"
                  className="inp"
                  value={teacherForm.qualification}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      qualification: e.target.value,
                    })
                  }
                  placeholder="শিক্ষাগত যোগ্যতা"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-mobile">
                  মোবাইল
                </label>
                <Input
                  id="tf-mobile"
                  className="inp"
                  value={teacherForm.mobile}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, mobile: e.target.value })
                  }
                  placeholder="মোবাইল নম্বর"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-nid">
                  জাতীয় পরিচয়পত্র নম্বর
                </label>
                <Input
                  id="tf-nid"
                  className="inp"
                  value={teacherForm.nid}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, nid: e.target.value })
                  }
                  placeholder="জাতীয় পরিচয়পত্র নম্বর"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-joining">
                  যোগদানের তারিখ
                </label>
                <Input
                  id="tf-joining"
                  className="inp"
                  type="date"
                  value={teacherForm.joiningDate}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      joiningDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-salary">
                  মাসিক বেতন (টাকা)
                </label>
                <Input
                  id="tf-salary"
                  className="inp"
                  type="number"
                  min="0"
                  value={teacherForm.monthlySalaryTaka}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      monthlySalaryTaka: e.target.value,
                    })
                  }
                  placeholder="টাকায় মাসিক বেতন"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="tf-photo">
                  ছবির ঠিকানা
                </label>
                <Input
                  id="tf-photo"
                  className="inp"
                  value={teacherForm.photoUrl}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, photoUrl: e.target.value })
                  }
                  placeholder="ছবির লিংক"
                />
              </div>
            </div>
            <div className="rowflex" style={{ marginTop: 16 }}>
              <Button type="submit" className="btn">
                <Plus className="ic" data-icon="inline-start" /> শিক্ষক সংরক্ষণ
                করুন
              </Button>
              <Button
                type="button"
                className="btn gho"
                onClick={() => setShowTeacherForm(false)}
              >
                বাতিল
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === "staff" && (
        <div className="card" id="people-add-form">
          <div className="chead">
            <div>
              <h3 className="ct">নতুন কর্মচারী যোগ করুন</h3>
              <p className="cs">কর্মচারীর নাম, পদবি ও মোবাইল দিন</p>
            </div>
          </div>
          <form onSubmit={submitStaff} className="rowflex">
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="lbl" htmlFor="sf-name">
                নাম <span className="req">*</span>
              </label>
              <Input
                id="sf-name"
                className="inp"
                value={staffForm.nameBn}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, nameBn: e.target.value })
                }
                placeholder="কর্মচারীর নাম"
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl" htmlFor="sf-designation">
                পদবি
              </label>
              <Input
                id="sf-designation"
                className="inp"
                value={staffForm.designation}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, designation: e.target.value })
                }
                placeholder="পদবি"
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl" htmlFor="sf-mobile">
                মোবাইল
              </label>
              <Input
                id="sf-mobile"
                className="inp"
                value={staffForm.mobile}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, mobile: e.target.value })
                }
                placeholder="মোবাইল নম্বর"
              />
            </div>
            <Button type="submit" className="btn">
              <Plus className="ic" data-icon="inline-start" /> যোগ করুন
            </Button>
          </form>
        </div>
      )}

      {tab === "subjectAssignments" && (
        <div className="card" id="people-add-form">
          <div className="chead">
            <div>
              <h3 className="ct">নতুন বিষয় বরাদ্দ</h3>
              <p className="cs">শিক্ষক, বিষয় ও শ্রেণি নির্বাচন করুন</p>
            </div>
          </div>
          <form onSubmit={submitAssignment}>
            <div className="fgrid">
              <div>
                <label className="lbl" htmlFor="af-teacher">
                  শিক্ষক <span className="req">*</span>
                </label>
                <Select
                  id="af-teacher"
                  className="sel"
                  value={assignForm.teacherId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, teacherId: e.target.value })
                  }
                  required
                >
                  <option value="">শিক্ষক নির্বাচন করুন</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameBn ?? t.nameEn ?? t.teacherCode ?? "শিক্ষক"}
                      {t.teacherCode ? ` (${t.teacherCode})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="lbl" htmlFor="af-subject">
                  বিষয় <span className="req">*</span>
                </label>
                <Select
                  id="af-subject"
                  className="sel"
                  value={assignForm.subjectId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, subjectId: e.target.value })
                  }
                  required
                >
                  <option value="">বিষয় নির্বাচন করুন</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn ?? s.name ?? "বিষয়"}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="lbl" htmlFor="af-class">
                  শ্রেণি <span className="req">*</span>
                </label>
                <Select
                  id="af-class"
                  className="sel"
                  value={assignForm.classId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      classId: e.target.value,
                      sectionId: "",
                    })
                  }
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
                <label className="lbl" htmlFor="af-section">
                  শাখা
                </label>
                <Select
                  id="af-section"
                  className="sel"
                  value={assignForm.sectionId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, sectionId: e.target.value })
                  }
                >
                  <option value="">সব শাখা</option>
                  {assignSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn ?? s.name ?? "শাখা"}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="rowflex" style={{ marginTop: 16 }}>
              <Button type="submit" className="btn">
                <Plus className="ic" data-icon="inline-start" /> বরাদ্দ সংরক্ষণ
                করুন
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="card flush">
        <div
          className="chead"
          style={{ padding: "18px 18px 14px", marginBottom: 0 }}
        >
          <div>
            <h3 className="ct">{meta.listTitle}</h3>
            <p className="cs">সকল নিবন্ধিত রেকর্ড</p>
          </div>
          <span className="sp" />
          <div className="search" style={{ width: 240, position: "relative" }}>
            <Search
              className="ic"
              style={{
                position: "absolute",
                left: 10,
                top: 9,
                color: "var(--sub)",
              }}
            />
            <Input
              className="inp"
              style={{ paddingLeft: 34, height: 36 }}
              placeholder={
                tab === "students"
                  ? "নাম, রেজিস্ট্রেশন বা মোবাইল খুঁজুন"
                  : "নাম খুঁজুন"
              }
              aria-label="খুঁজুন"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Badge variant="success">{bn(recordCount)}টি রেকর্ড</Badge>
        </div>

        {tab === "students" &&
          (filteredStudents.length === 0 ? (
            <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
              কোনো রেকর্ড নেই।
            </p>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>নাম</th>
                    <th>শ্রেণি</th>
                    <th>শাখা</th>
                    <th>রোল</th>
                    <th>অভিভাবক</th>
                    <th>মোবাইল</th>
                    <th>অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((row) => {
                    const name = row.nameBn ?? row.nameEn ?? "শিক্ষার্থী";
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="person">
                            <span className="av">{Array.from(name)[0]}</span>
                            <div>
                              <Link
                                className="nm"
                                href={`/dashboard/people/students/${row.id}`}
                                style={{
                                  color: "var(--p700)",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                }}
                              >
                                {name}
                              </Link>
                              <div className="ds">
                                রেজিস্ট্রেশন:{" "}
                                <span className="num">
                                  {row.registrationNumber
                                    ? bn(row.registrationNumber)
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{row.classNameBn ?? "—"}</td>
                        <td>{row.sectionNameBn ?? "—"}</td>
                        <td className="num">
                          {row.roll != null && row.roll !== ""
                            ? bn(row.roll)
                            : "—"}
                        </td>
                        <td>{row.fatherNameBn ?? "—"}</td>
                        <td className="num">{row.guardianMobile ?? "—"}</td>
                        <td>
                          {row.isActive === false ? (
                            <span className="chip r">নিষ্ক্রিয়</span>
                          ) : (
                            <span className="chip g">সক্রিয়</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "teachers" &&
          (filteredTeachers.length === 0 ? (
            <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
              কোনো রেকর্ড নেই।
            </p>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>নাম</th>
                    <th>পদবি</th>
                    <th>যোগ্যতা</th>
                    <th>মোবাইল</th>
                    <th>মাসিক বেতন</th>
                    <th>অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((row) => {
                    const name = row.nameBn ?? row.nameEn ?? "শিক্ষক";
                    const inactive =
                      (row as { isActive?: boolean }).isActive === false;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="person">
                            <span className="av">{Array.from(name)[0]}</span>
                            <div>
                              <div className="nm">{name}</div>
                              <div className="ds">
                                {row.teacherCode ?? ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{row.designation ?? "—"}</td>
                        <td>{row.qualification ?? "—"}</td>
                        <td className="num">{row.mobile ?? "—"}</td>
                        <td className="num">
                          {typeof row.monthlySalary === "number"
                            ? takaLabel(row.monthlySalary)
                            : "—"}
                        </td>
                        <td>
                          {inactive ? (
                            <span className="chip r">নিষ্ক্রিয়</span>
                          ) : (
                            <span className="chip g">সক্রিয়</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "staff" &&
          (filteredStaff.length === 0 ? (
            <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
              কোনো রেকর্ড নেই।
            </p>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>নাম</th>
                    <th>পদবি</th>
                    <th>মোবাইল</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((row) => {
                    const name = row.nameBn ?? "কর্মচারী";
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="person">
                            <span className="av">{Array.from(name)[0]}</span>
                            <div>
                              <div className="nm">{name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{row.designation ?? "—"}</td>
                        <td className="num">{row.mobile ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "subjectAssignments" &&
          (filteredAssignments.length === 0 ? (
            <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
              কোনো রেকর্ড নেই।
            </p>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>শিক্ষক</th>
                    <th>বিষয়</th>
                    <th>শ্রেণি</th>
                    <th>শাখা</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((row) => {
                    const name = row.teacherNameBn ?? "শিক্ষক";
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="person">
                            <span className="av">{Array.from(name)[0]}</span>
                            <div>
                              <div className="nm">{name}</div>
                              <div className="ds">{row.teacherCode ?? ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>{row.subjectNameBn ?? "—"}</td>
                        <td>{row.classNameBn ?? "—"}</td>
                        <td>{row.sectionNameBn ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}
