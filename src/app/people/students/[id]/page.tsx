"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bn, bnDate, bnNum, takaLabel } from "@/lib/format";
import { UploadThingField } from "@/components/uploadthing-field";

type StudentRow = {
  id: string;
  sessionId?: string;
  classId?: string;
  sectionId?: string | null;
  roll?: number | string | null;
  nameEn?: string;
  fatherNameBn?: string;
  motherNameBn?: string;
  guardianMobile?: string;
  dateOfBirth?: string;
  gender?: string;
  religion?: string;
  bloodGroup?: string;
  presentAddress?: string;
  permanentAddress?: string;
  photoUrl?: string;
  isActive?: boolean;
  nameBn?: string;
  registrationNumber?: string;
  classNameBn?: string;
  sectionNameBn?: string;
  sessionName?: string;
};

type DueRow = {
  id: string;
  studentId: string;
  amount: number;
  paidAmount: number;
  dueDate?: string;
  status: string;
  eventNameBn?: string;
};

type AcademicRow = {
  id: string;
  nameBn?: string;
  name?: string;
  classId?: string;
  classNameBn?: string;
};

const profileTabs = [
  ["info", "তথ্য"],
  ["fees", "ফি ও বকেয়া"],
  ["edit", "সম্পাদনা"],
] as const;
type ProfileTab = (typeof profileTabs)[number][0];

function statusChip(status: string) {
  if (status === "PAID")
    return <span className="chip g">পরিশোধিত</span>;
  if (status === "PARTIAL")
    return <span className="chip w">আংশিক</span>;
  return <span className="chip r">বকেয়া</span>;
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("info");
  const [dues, setDues] = useState<DueRow[]>([]);
  const [classes, setClasses] = useState<AcademicRow[]>([]);
  const [sections, setSections] = useState<AcademicRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState({
    displayNameBn: "",
    nameEn: "",
    classId: "",
    sectionId: "",
    roll: "",
    fatherNameBn: "",
    motherNameBn: "",
    guardianMobile: "",
    presentAddress: "",
    permanentAddress: "",
    photoUrl: "",
    isActive: true,
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/backend/people/students");
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const payload = (await res.json()) as { data?: StudentRow[] };
      const row = (payload.data ?? []).find((s) => s.id === id);
      if (!row) {
        setNotFound(true);
        return;
      }
      setStudent(row);
      setEditForm({
        displayNameBn: row.nameBn ?? "",
        nameEn: row.nameEn ?? "",
        classId: row.classId ?? "",
        sectionId: row.sectionId ?? "",
        roll: row.roll != null ? String(row.roll) : "",
        fatherNameBn: row.fatherNameBn ?? "",
        motherNameBn: row.motherNameBn ?? "",
        guardianMobile: row.guardianMobile ?? "",
        presentAddress: row.presentAddress ?? "",
        permanentAddress: row.permanentAddress ?? "",
        photoUrl: row.photoUrl ?? "",
        isActive: row.isActive !== false,
      });
    })();
  }, [id]);

  useEffect(() => {
    void (async () => {
      const [duesRes, cRes, secRes] = await Promise.all([
        fetch("/api/backend/finance/dues"),
        fetch("/api/backend/academics/classes"),
        fetch("/api/backend/academics/sections"),
      ]);
      if (duesRes.ok) {
        const p = (await duesRes.json()) as { data?: DueRow[] };
        setDues((p.data ?? []).filter((d) => d.studentId === id));
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
  }, [id]);

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const value: Record<string, unknown> = {
      displayNameBn: editForm.displayNameBn,
      isActive: editForm.isActive,
    };
    if (editForm.nameEn) value.nameEn = editForm.nameEn;
    if (editForm.classId) value.classId = editForm.classId;
    if (editForm.sectionId) value.sectionId = editForm.sectionId;
    if (editForm.roll) value.roll = Number(editForm.roll);
    if (editForm.fatherNameBn) value.fatherNameBn = editForm.fatherNameBn;
    if (editForm.motherNameBn) value.motherNameBn = editForm.motherNameBn;
    if (editForm.guardianMobile) value.guardianMobile = editForm.guardianMobile;
    if (editForm.presentAddress) value.presentAddress = editForm.presentAddress;
    if (editForm.permanentAddress)
      value.permanentAddress = editForm.permanentAddress;
    if (editForm.photoUrl) value.photoUrl = editForm.photoUrl;
    const response = await fetch(`/api/backend/people/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: StudentRow;
      message?: string;
    } | null;
    if (!response.ok) {
      setError(payload?.message ?? "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      return;
    }
    if (payload?.data) {
      setStudent((prev) => ({ ...(prev ?? ({} as StudentRow)), ...payload.data }));
    } else {
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              nameBn: editForm.displayNameBn,
              isActive: editForm.isActive,
            }
          : prev,
      );
    }
    setMessage("তথ্য সফলভাবে সংরক্ষণ হয়েছে।");
  }

  if (notFound) {
    return (
      <div className="dstack">
        <div className="card">
          <p className="admin-empty">শিক্ষার্থী পাওয়া যায়নি।</p>
          <Link className="btn gho sm" href="/dashboard/people">
            <ArrowLeft className="ic" data-icon="inline-start" /> তালিকায়
            ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="dstack">
        <div className="card">
          <p className="admin-empty">লোড হচ্ছে…</p>
        </div>
      </div>
    );
  }

  const name = student.nameBn ?? student.nameEn ?? "শিক্ষার্থী";
  const totalAmount = dues.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const totalPaid = dues.reduce(
    (sum, d) => sum + Number(d.paidAmount || 0),
    0,
  );
  const totalDue = dues
    .filter((d) => d.status !== "PAID")
    .reduce(
      (sum, d) => sum + (Number(d.amount || 0) - Number(d.paidAmount || 0)),
      0,
    );
  const editSections = editForm.classId
    ? sections.filter((s) => !s.classId || s.classId === editForm.classId)
    : sections;

  const infoRows: Array<[string, string]> = [
    ["নাম (বাংলা)", student.nameBn ?? "—"],
    ["নাম (ইংরেজি)", student.nameEn ?? "—"],
    ["রেজিস্ট্রেশন নম্বর", student.registrationNumber ? bn(student.registrationNumber) : "—"],
    ["সেশন", student.sessionName ?? "—"],
    ["শ্রেণি", student.classNameBn ?? "—"],
    ["শাখা", student.sectionNameBn ?? "—"],
    ["রোল", student.roll != null && student.roll !== "" ? bn(student.roll) : "—"],
    ["জন্ম তারিখ", bnDate(student.dateOfBirth)],
    ["লিঙ্গ", student.gender ?? "—"],
    ["ধর্ম", student.religion ?? "—"],
    ["রক্তের গ্রুপ", student.bloodGroup ?? "—"],
    ["পিতার নাম", student.fatherNameBn ?? "—"],
    ["মাতার নাম", student.motherNameBn ?? "—"],
    ["অভিভাবকের মোবাইল", student.guardianMobile ?? "—"],
    ["বর্তমান ঠিকানা", student.presentAddress ?? "—"],
    ["স্থায়ী ঠিকানা", student.permanentAddress ?? "—"],
  ];

  return (
    <div className="dstack">
      <div className="chead">
        <Link className="btn gho sm" href="/dashboard/people">
          <ArrowLeft className="ic" data-icon="inline-start" /> তালিকায় ফিরুন
        </Link>
      </div>

      <div className="card">
        <div className="rowflex" style={{ alignItems: "flex-start", gap: 18 }}>
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoUrl}
              alt={name}
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                objectFit: "cover",
                flex: "0 0 76px",
              }}
            />
          ) : (
            <span className="av big">{Array.from(name)[0]}</span>
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{ fontSize: 21, fontWeight: 700, color: "var(--p800)" }}
            >
              {name}
            </div>
            <div className="small muted">
              {[student.nameEn, student.classNameBn, student.sectionNameBn]
                .filter(Boolean)
                .join(" · ")}
              {student.roll != null && student.roll !== ""
                ? ` · রোল ${bn(student.roll)}`
                : ""}
              {student.sessionName ? ` · সেশন ${student.sessionName}` : ""}
            </div>
            <div className="rowflex" style={{ marginTop: 9 }}>
              <span className="chip b">
                রেজি:{" "}
                {student.registrationNumber
                  ? bn(student.registrationNumber)
                  : "—"}
              </span>
              {student.classNameBn && (
                <span className="chip gr">{student.classNameBn}</span>
              )}
              {student.sectionNameBn && (
                <span className="chip gr">শাখা {student.sectionNameBn}</span>
              )}
              {student.isActive === false ? (
                <span className="chip r">নিষ্ক্রিয়</span>
              ) : (
                <span className="chip g">সক্রিয়</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {profileTabs.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="sm"
            className={tab === key ? "on" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {message && <p className="alert g">{message}</p>}
      {error && <p className="alert r">{error}</p>}

      {tab === "info" && (
        <div className="card">
          <div className="chead">
            <h3 className="ct">শিক্ষার্থীর তথ্য</h3>
          </div>
          {infoRows.map(([label, value]) => (
            <div className="listrow" key={label}>
              <div className="grow muted" style={{ maxWidth: 240 }}>
                {label}
              </div>
              <b>{value}</b>
            </div>
          ))}
        </div>
      )}

      {tab === "fees" && (
        <>
          <div className="g3">
            <div className="card stat">
              <div>
                <div className="v num">{takaLabel(totalAmount)}</div>
                <div className="l">মোট ধার্য</div>
              </div>
            </div>
            <div className="card stat">
              <div>
                <div className="v num" style={{ color: "var(--green)" }}>
                  {takaLabel(totalPaid)}
                </div>
                <div className="l">মোট পরিশোধিত</div>
              </div>
            </div>
            <div className="card stat">
              <div>
                <div
                  className="v num"
                  style={{ color: totalDue > 0 ? "var(--warn)" : undefined }}
                >
                  {takaLabel(totalDue)}
                </div>
                <div className="l">মোট বকেয়া</div>
              </div>
            </div>
          </div>
          <div className="card flush">
            <div className="chead" style={{ padding: "16px 18px 0" }}>
              <h3 className="ct">ফি ইভেন্ট অনুযায়ী হিসাব</h3>
              <span className="sp" />
              <span className="chip b">{bnNum(dues.length)}টি রেকর্ড</span>
            </div>
            {dues.length === 0 ? (
              <p className="admin-empty" style={{ margin: "0 18px 18px" }}>
                কোনো ফি রেকর্ড নেই।
              </p>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>ইভেন্ট</th>
                      <th className="r">মোট</th>
                      <th className="r">পরিশোধিত</th>
                      <th className="r">বাকি</th>
                      <th>শেষ তারিখ</th>
                      <th>অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.map((row) => {
                      const remaining =
                        Number(row.amount || 0) - Number(row.paidAmount || 0);
                      return (
                        <tr key={row.id}>
                          <td className="b">{row.eventNameBn ?? "ফি ইভেন্ট"}</td>
                          <td className="r num">{takaLabel(row.amount)}</td>
                          <td className="r num">
                            {takaLabel(row.paidAmount)}
                          </td>
                          <td className="r num">{takaLabel(remaining)}</td>
                          <td className="num">{bnDate(row.dueDate)}</td>
                          <td>{statusChip(row.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "edit" && (
        <div className="card">
          <div className="chead">
            <h3 className="ct">তথ্য সম্পাদনা</h3>
          </div>
          <form onSubmit={submitEdit}>
            <div className="f3">
              <div>
                <label className="lbl" htmlFor="ef-name">
                  নাম (বাংলা) <span className="req">*</span>
                </label>
                <Input
                  id="ef-name"
                  className="inp"
                  value={editForm.displayNameBn}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayNameBn: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-nameEn">
                  নাম (ইংরেজি)
                </label>
                <Input
                  id="ef-nameEn"
                  className="inp"
                  value={editForm.nameEn}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nameEn: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-roll">
                  রোল নম্বর
                </label>
                <Input
                  id="ef-roll"
                  className="inp"
                  type="number"
                  min="1"
                  value={editForm.roll}
                  onChange={(e) =>
                    setEditForm({ ...editForm, roll: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-class">
                  শ্রেণি
                </label>
                <Select
                  id="ef-class"
                  className="sel"
                  value={editForm.classId}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      classId: e.target.value,
                      sectionId: "",
                    })
                  }
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
                <label className="lbl" htmlFor="ef-section">
                  শাখা
                </label>
                <Select
                  id="ef-section"
                  className="sel"
                  value={editForm.sectionId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sectionId: e.target.value })
                  }
                >
                  <option value="">শাখা নির্বাচন করুন</option>
                  {editSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn ?? s.name ?? "শাখা"}
                      {s.classNameBn ? ` (${s.classNameBn})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="lbl">শিক্ষার্থীর ছবি</label>
                <UploadThingField
                  endpoint="profileImage"
                  value={editForm.photoUrl}
                  onChange={(photoUrl) => setEditForm({ ...editForm, photoUrl })}
                  label="শিক্ষার্থীর ছবি আপলোড করুন"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-father">
                  পিতার নাম
                </label>
                <Input
                  id="ef-father"
                  className="inp"
                  value={editForm.fatherNameBn}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fatherNameBn: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-mother">
                  মাতার নাম
                </label>
                <Input
                  id="ef-mother"
                  className="inp"
                  value={editForm.motherNameBn}
                  onChange={(e) =>
                    setEditForm({ ...editForm, motherNameBn: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-mobile">
                  অভিভাবকের মোবাইল
                </label>
                <Input
                  id="ef-mobile"
                  className="inp"
                  value={editForm.guardianMobile}
                  onChange={(e) =>
                    setEditForm({ ...editForm, guardianMobile: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-present">
                  বর্তমান ঠিকানা
                </label>
                <Input
                  id="ef-present"
                  className="inp"
                  value={editForm.presentAddress}
                  onChange={(e) =>
                    setEditForm({ ...editForm, presentAddress: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="lbl" htmlFor="ef-permanent">
                  স্থায়ী ঠিকানা
                </label>
                <Input
                  id="ef-permanent"
                  className="inp"
                  value={editForm.permanentAddress}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      permanentAddress: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <span className="lbl">অবস্থা</span>
                <label className="rowflex" style={{ gap: 10 }}>
                  <span className="sw">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isActive: e.target.checked })
                      }
                    />
                    <span className="tr" />
                  </span>
                  <span>{editForm.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                </label>
              </div>
            </div>
            <div className="rowflex" style={{ marginTop: 16 }}>
              <Button type="submit" className="btn">
                সংরক্ষণ করুন
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
