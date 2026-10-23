/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { bn, bnDate } from "@/lib/format";

type App = {
  id: string;
  trackingId: string;
  status: string;
  reviewNote: string | null;
  photoUrl?: string | null;
  admissionClassId?: string | null;
  createdAt?: string | null;
  applicant: Record<string, unknown>;
};
type ClassRow = { id: string; nameBn: string };

/** ISO timestamp → value for <input type="datetime-local">. */
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অপেক্ষমাণ",
  APPROVED: "অনুমোদিত",
  REJECTED: "বাতিল",
};

const FIELD_LABELS: Record<string, string> = {
  nameBn: "ছাত্রের নাম (বাংলা)",
  displayNameBn: "ছাত্রের নাম",
  nameEn: "ছাত্রের নাম (ইংরেজি)",
  studentNameBn: "ছাত্রের নাম",
  studentName: "ছাত্রের নাম",
  dob: "জন্ম তারিখ",
  dateOfBirth: "জন্ম তারিখ",
  birthDate: "জন্ম তারিখ",
  gender: "লিঙ্গ",
  religion: "ধর্ম",
  bloodGroup: "রক্তের গ্রুপ",
  fatherName: "পিতার নাম",
  fatherNameBn: "পিতার নাম",
  fatherOccupation: "পিতার পেশা",
  motherName: "মাতার নাম",
  motherNameBn: "মাতার নাম",
  motherOccupation: "মাতার পেশা",
  guardianName: "অভিভাবকের নাম",
  guardianRelation: "অভিভাবকের সম্পর্ক",
  guardianMobile: "অভিভাবকের মোবাইল",
  mobile: "মোবাইল নম্বর",
  phone: "মোবাইল নম্বর",
  email: "ইমেইল",
  address: "ঠিকানা",
  presentAddress: "বর্তমান ঠিকানা",
  permanentAddress: "স্থায়ী ঠিকানা",
  village: "গ্রাম",
  upazila: "উপজেলা",
  district: "জেলা",
  previousSchool: "পূর্ববর্তী প্রতিষ্ঠান",
  previousClass: "পূর্ববর্তী শ্রেণি",
  classNameBn: "যে শ্রেণিতে ভর্তি চায়",
  birthCertificateNo: "জন্ম নিবন্ধন নম্বর",
};

function statusChip(status: string) {
  if (status === "APPROVED") return <span className="chip g">অনুমোদিত</span>;
  if (status === "REJECTED") return <span className="chip r">বাতিল</span>;
  return <span className="chip w">অপেক্ষমাণ</span>;
}

function applicantName(app: App): string {
  const a = app.applicant ?? {};
  const value =
    (a.nameBn as string) ??
    (a.displayNameBn as string) ??
    (a.nameEn as string) ??
    (a.studentNameBn as string) ??
    "";
  return value || "আবেদনকারী";
}

function displayValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "dob" || key === "dateOfBirth" || key === "birthDate") {
    return bnDate(String(value));
  }
  if (typeof value === "object") return JSON.stringify(value);
  return bn(String(value));
}

export default function AdmissionsPage() {
  const [rows, setRows] = useState<App[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [open, setOpen] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [selected, setSelected] = useState<App | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);

  async function load() {
    const [applications, settings, classesRes] = await Promise.all([
      fetch("/api/backend/admissions"),
      fetch("/api/backend/admissions/settings"),
      fetch("/api/backend/academics/classes"),
    ]);
    const applicationPayload = (await applications.json()) as { data?: App[] };
    const settingsPayload = (await settings.json()) as {
      data?: { isOpen?: boolean; opensAt?: string | null; closesAt?: string | null };
    };
    const classesPayload = (await classesRes.json().catch(() => ({}))) as {
      data?: ClassRow[];
    };
    const nextRows = applicationPayload.data ?? [];
    setRows(nextRows);
    setClasses(classesPayload.data ?? []);
    setSelected((current) =>
      current
        ? (nextRows.find((row) => row.id === current.id) ?? null)
        : (nextRows[0] ?? null),
    );
    setOpen(Boolean(settingsPayload.data?.isOpen));
    setOpensAt(toLocalInput(settingsPayload.data?.opensAt));
    setClosesAt(toLocalInput(settingsPayload.data?.closesAt));
  }
  useEffect(() => {
    void load();
  }, []);

  async function toggle(value: boolean) {
    setOpen(value);
    // Only the flag is sent — the backend keeps the stored form fields,
    // seat counts and admission window untouched on a partial save.
    await fetch("/api/backend/admissions/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: value }),
    });
  }

  async function saveWindow() {
    const response = await fetch("/api/backend/admissions/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opensAt: opensAt ? new Date(opensAt).toISOString() : null,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      }),
    });
    setMessage(
      response.ok
        ? "ভর্তির সময়সীমা সংরক্ষণ হয়েছে।"
        : "সময়সীমা সংরক্ষণ করা যায়নি।",
    );
  }

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setReviewing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/backend/admissions/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note:
            status === "REJECTED" ? "প্রয়োজনীয় শর্ত পূরণ হয়নি" : "অনুমোদিত",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(
          payload?.message ??
            (status === "APPROVED"
              ? "অনুমোদন করা যায়নি — আবেদনে সেশন ও শ্রেণি আছে কিনা দেখুন।"
              : "বাতিল করা যায়নি।"),
        );
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        registrationNumber?: string;
      } | null;
      setMessage(
        status === "APPROVED"
          ? `আবেদন অনুমোদিত হয়েছে — শিক্ষার্থীর প্রোফাইল তৈরি হয়েছে${
              payload?.registrationNumber
                ? ` (রেজি নং: ${bn(payload.registrationNumber)})`
                : ""
            }।`
          : "আবেদন বাতিল করা হয়েছে।",
      );
      await load();
    } finally {
      setReviewing(false);
    }
  }

  const classNameOf = (app: App | null): string => {
    if (!app?.admissionClassId) return "";
    return classes.find((row) => row.id === app.admissionClassId)?.nameBn ?? "";
  };
  const pendingCount = rows.filter((row) => row.status === "PENDING").length;
  const selectedClass = classNameOf(selected);
  const applicantEntries = Object.entries(selected?.applicant ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">ভর্তি আবেদন</h2>
          <p className="cs">ওয়েবসাইটের ভর্তি ফর্ম থেকে জমা পড়া আবেদন যাচাই ও অনুমোদন।</p>
        </div>
        <span className="sp" />
        <span className="chip w">অপেক্ষমাণ {bn(pendingCount)}টি</span>
        <label className="rowflex" style={{ gap: 8 }}>
          <span className="small b">আবেদন খোলা</span>
          <Switch
            checked={open}
            onCheckedChange={(value) => void toggle(value)}
          />
        </label>
      </div>

      {message && <p className="alert g">{message}</p>}
      {error && <p className="alert r">{error}</p>}

      <div className="card grid gap-3 md:grid-cols-4">
        <div className="md:col-span-4">
          <h3 className="ct">ভর্তির সময়সীমা</h3>
          <p className="cs">
            শুরুর সময়ের আগে বা শেষ সময়ের পরে ওয়েবসাইটের ফর্মে আবেদন জমা নেওয়া
            হবে না। খালি রাখলে কোনো সময়সীমা থাকবে না।
          </p>
        </div>
        <label className="text-sm">
          আবেদন শুরু
          <Input
            className="inp"
            type="datetime-local"
            value={opensAt}
            onChange={(event) => setOpensAt(event.target.value)}
          />
        </label>
        <label className="text-sm">
          আবেদন শেষ
          <Input
            className="inp"
            type="datetime-local"
            value={closesAt}
            onChange={(event) => setClosesAt(event.target.value)}
          />
        </label>
        <div>
          <Button type="button" className="btn" onClick={() => void saveWindow()}>
            সময়সীমা সংরক্ষণ
          </Button>
        </div>
      </div>

      <div className="g32" style={{ alignItems: "start" }}>
        <div className="card flush">
          <div className="chead" style={{ padding: "16px 18px 0" }}>
            <h3 className="ct">আবেদনসমূহ</h3>
            <span className="sp" />
            <span className="chip b">মোট {bn(rows.length)}টি</span>
          </div>
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>আবেদনকারী</th>
                  <th>যে শ্রেণিতে আবেদন</th>
                  <th>আবেদনের তারিখ</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    style={{
                      cursor: "pointer",
                      background:
                        selected?.id === row.id ? "var(--p50)" : undefined,
                    }}
                  >
                    <td>
                      <span className="b">{applicantName(row)}</span>
                      <div className="small muted num">{bn(row.trackingId)}</div>
                    </td>
                    <td>{classNameOf(row) || "—"}</td>
                    <td className="num">{bnDate(row.createdAt)}</td>
                    <td>{statusChip(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="admin-empty">কোনো আবেদন নেই।</div>}
          <div className="hint" style={{ padding: "12px 18px 16px" }}>
            ওয়েবসাইটের ভর্তি ফর্ম থেকে জমা পড়া আবেদন এখানে আসে। ফর্মটি উপরের
            সুইচ থেকে খোলা/বন্ধ করা যায়।
          </div>
        </div>

        <div className="card">
          <div className="chead">
            <h3 className="ct">আবেদনের বিস্তারিত</h3>
            <span className="sp" />
            {selected && statusChip(selected.status)}
          </div>
          {selected ? (
            <>
              <div className="rowflex" style={{ alignItems: "flex-start" }}>
                {selected.photoUrl ? (
                  <Image
                    src={selected.photoUrl}
                    alt="আবেদনকারীর ছবি"
                    width={76}
                    height={76}
                    unoptimized
                    style={{ borderRadius: 8, objectFit: "cover" }}
                  />
                ) : (
                  <span className="av big">{applicantName(selected).slice(0, 1)}</span>
                )}
                <div>
                  <div className="b" style={{ fontSize: 16.5 }}>
                    {applicantName(selected)}
                  </div>
                  <div className="small muted num">
                    ট্র্যাকিং আইডি: {bn(selected.trackingId)}
                  </div>
                  <div className="small muted">
                    আবেদনের তারিখ: {bnDate(selected.createdAt)}
                  </div>
                  <div className="small muted">
                    অবস্থা: {STATUS_LABELS[selected.status] ?? selected.status}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  fontSize: 14.5,
                  marginTop: 16,
                }}
              >
                {selectedClass && (
                  <div
                    className="rowflex"
                    style={{ justifyContent: "space-between", gap: 6 }}
                  >
                    <span className="muted">যে শ্রেণিতে ভর্তি চায়</span>
                    <b>{selectedClass}</b>
                  </div>
                )}
                {applicantEntries.map(([key, value]) => (
                  <div
                    className="rowflex"
                    key={key}
                    style={{ justifyContent: "space-between", gap: 6 }}
                  >
                    <span className="muted">{FIELD_LABELS[key] ?? key}</span>
                    <b style={{ textAlign: "right" }}>
                      {displayValue(key, value)}
                    </b>
                  </div>
                ))}
                {!applicantEntries.length && !selectedClass && (
                  <p className="admin-empty">আবেদনকারীর অতিরিক্ত তথ্য নেই।</p>
                )}
                {selected.reviewNote && (
                  <div
                    className="rowflex"
                    style={{ justifyContent: "space-between", gap: 6 }}
                  >
                    <span className="muted">পর্যালোচনা নোট</span>
                    <b style={{ textAlign: "right" }}>{selected.reviewNote}</b>
                  </div>
                )}
              </div>

              {selected.status === "PENDING" && (
                <>
                  <div className="alert g" style={{ marginTop: 14 }}>
                    <span>
                      অনুমোদন করলেই ছাত্রের প্রোফাইল তৈরি হবে এবং স্বয়ংক্রিয়ভাবে
                      রেজিস্ট্রেশন নম্বর ইস্যু হবে।
                    </span>
                  </div>
                  <div className="rowflex" style={{ marginTop: 14 }}>
                    <Button
                      className="btn grn"
                      disabled={reviewing}
                      onClick={() => void review(selected.id, "APPROVED")}
                    >
                      অনুমোদন করুন
                    </Button>
                    <Button
                      className="btn dgr"
                      disabled={reviewing}
                      onClick={() => void review(selected.id, "REJECTED")}
                    >
                      বাতিল করুন
                    </Button>
                  </div>
                </>
              )}
              {selected.status !== "PENDING" && (
                <p className="small muted" style={{ marginTop: 14 }}>
                  এই আবেদনটি ইতিমধ্যে{" "}
                  {STATUS_LABELS[selected.status] ?? selected.status} করা হয়েছে।
                </p>
              )}
            </>
          ) : (
            <div className="admin-empty">
              বিস্তারিত দেখতে বাম থেকে একটি আবেদন নির্বাচন করুন।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
