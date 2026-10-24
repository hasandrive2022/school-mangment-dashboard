"use client";

import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { apiGet } from "@/lib/admin-api";
import { formatTaka } from "@/lib/format";

type Row = Record<string, unknown>;

const PROFILE_LABELS: Record<string, string> = {
  displayNameBn: "নাম",
  teacherCode: "শিক্ষক কোড",
  username: "ইউজারনেম",
  email: "ইমেইল",
  designation: "পদবি",
  qualification: "যোগ্যতা",
  mobile: "মোবাইল",
  nid: "জাতীয় পরিচয়পত্র",
  joiningDate: "যোগদানের তারিখ",
  monthlySalary: "মাসিক বেতন",
  nameEn: "নাম (ইংরেজি)",
};

function flattenProfile(data: unknown): Array<[string, unknown]> {
  if (!data || typeof data !== "object") return [];
  const record = data as Row;
  const merged: Row = {
    ...((record.teacher as Row) ?? {}),
    ...((record.user as Row) ?? {}),
    ...record,
  };
  return Object.entries(PROFILE_LABELS)
    .filter(([key]) => merged[key] !== undefined && merged[key] !== null && merged[key] !== "")
    .map(([key, label]): [string, unknown] => [
      label,
      // monthlySalary is stored as integer paisa — render it as taka
      // through the one canonical helper, never as a raw number.
      key === "monthlySalary" && typeof merged[key] === "number"
        ? formatTaka(merged[key])
        : merged[key],
    ]);
}

export function TeacherScreen({ screen }: { screen: "t-salary" | "t-profile" }) {
  const [profile, setProfile] = useState<Array<[string, unknown]> | null>(null);
  const [salaries, setSalaries] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (screen === "t-profile") {
      void apiGet<{ data?: unknown }>("/api/backend/teacher/portal/profile")
        .then((payload) => setProfile(flattenProfile(payload.data)))
        .catch(() => setError("প্রোফাইল লোড করা যায়নি"));
    } else {
      void apiGet<{ data?: Row[] }>("/api/backend/teacher/finance/salary")
        .then((payload) => setSalaries(payload.data ?? []))
        .catch(() => setError("বেতনের তথ্য লোড করা যায়নি"));
    }
  }, [screen]);

  if (screen === "t-profile") {
    return (
      <div className="dstack">
        <div className="chead">
          <div>
            <h2 className="dpage-title">আমার প্রোফাইল</h2>
            <p className="cs">আপনার শিক্ষক প্রোফাইলের তথ্য</p>
          </div>
        </div>
        <div className="card">
          {error ? (
            <p className="alert r">{error}</p>
          ) : profile === null ? (
            <ListSkeleton rows={5} />
          ) : profile.length === 0 ? (
            <p className="admin-empty">প্রোফাইলের তথ্য পাওয়া যায়নি।</p>
          ) : (
            <dl className="admission-details">
              {profile.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">আমার বেতন</h2>
          <p className="cs">মাসভিত্তিক বেতন পরিশোধের রেকর্ড</p>
        </div>
      </div>
      <div className="card flush">
        {error ? (
          <p className="alert r" style={{ margin: 18 }}>{error}</p>
        ) : salaries === null ? (
          <ListSkeleton rows={4} />
        ) : salaries.length === 0 ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>কোনো বেতন রেকর্ড নেই।</p>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>মাস</th>
                  <th className="r">মূল বেতন</th>
                  <th className="r">ভাতা</th>
                  <th className="r">কর্তন</th>
                  <th className="r">নেট</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    <td>{String(row.salaryMonth ?? "—")}</td>
                    <td className="r num">{formatTaka(Number(row.basic ?? 0))}</td>
                    <td className="r num">{formatTaka(Number(row.allowances ?? 0))}</td>
                    <td className="r num">{formatTaka(Number(row.deductions ?? 0))}</td>
                    <td className="r num"><b>{formatTaka(Number(row.net ?? 0))}</b></td>
                    <td><span className="chip g">{String(row.status ?? "")}</span></td>
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
