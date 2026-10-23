"use client";

import Image from "next/image";
import { useAdminSWR } from "@/lib/swr";
import { bn, bnNum, takaLabel, bnDate, WEEKDAYS_BN } from "@/lib/format";

type ProfilePayload = {
  data?: {
    teacher: {
      id: string;
      teacherCode: string | null;
      designation: string | null;
      qualification: string | null;
      mobile: string | null;
      nid: string | null;
      joiningDate: string | null;
      monthlySalary: number | null;
      photoUrl: string | null;
      nameEn: string | null;
    };
    user: {
      displayNameBn: string;
      username: string | null;
      email: string | null;
    };
  } | null;
};
type RoutineRow = {
  id: string;
  dayOfWeek: number;
  period: number;
  room: string | null;
  subjectNameBn: string;
  classNameBn: string;
  sectionNameBn: string | null;
};

function maskNid(nid?: string | null): string {
  if (!nid) return "—";
  const trimmed = nid.trim();
  if (trimmed.length <= 4) return bn(trimmed);
  return bn(`${trimmed.slice(0, 4)}••••`);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rowflex" style={{ justifyContent: "space-between" }}>
      <span className="muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function MyProfilePage() {
  const { data: profilePayload, isLoading } =
    useAdminSWR<ProfilePayload>("/api/backend/teacher/portal/profile");
  const { data: routinePayload } = useAdminSWR<{ data?: RoutineRow[] }>(
    "/api/backend/teacher/portal/routine",
  );

  const profile = profilePayload?.data ?? null;
  const routine = routinePayload?.data ?? [];
  const days = [0, 1, 2, 3, 4]; // রবিবার–বৃহস্পতিবার

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">আমার প্রোফাইল ও রুটিন</h2>
          <p className="cs">
            নাম, পদবি ও বেতন শুধু অ্যাডমিন বদলাতে পারেন — কোনো তথ্য ভুল থাকলে
            প্রশাসকের সাথে যোগাযোগ করুন।
          </p>
        </div>
      </div>

      {!profile && !isLoading ? (
        <div className="card">
          <p className="admin-empty">
            প্রোফাইল পাওয়া যায়নি — প্রশাসকের সাথে যোগাযোগ করুন।
          </p>
        </div>
      ) : !profile ? (
        <div className="card">
          <p className="admin-empty">লোড হচ্ছে…</p>
        </div>
      ) : (
        <div className="g23">
          <div className="card">
            <div style={{ textAlign: "center", padding: "6px 0 4px" }}>
              {profile.teacher.photoUrl ? (
                <Image
                  src={profile.teacher.photoUrl}
                  alt="শিক্ষকের ছবি"
                  width={76}
                  height={76}
                  unoptimized
                  style={{ borderRadius: "50%", margin: "0 auto", objectFit: "cover" }}
                />
              ) : (
                <span className="av big" style={{ margin: "0 auto" }}>
                  {Array.from(profile.user.displayNameBn ?? "শি")[0]}
                </span>
              )}
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "var(--p800)",
                  marginTop: 10,
                }}
              >
                {profile.user.displayNameBn}
              </div>
              <div className="small muted">{profile.teacher.designation ?? "শিক্ষক"}</div>
              <div className="rowflex" style={{ justifyContent: "center", marginTop: 9 }}>
                {profile.teacher.teacherCode && (
                  <span className="chip b">
                    শিক্ষক কোড: {bn(profile.teacher.teacherCode)}
                  </span>
                )}
                <span className="chip g">সক্রিয়</span>
              </div>
            </div>
            <div className="divider" style={{ margin: "14px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 14.5 }}>
              <InfoRow label="যোগ্যতা" value={profile.teacher.qualification ?? "—"} />
              <InfoRow
                label="মোবাইল"
                value={<span className="num">{bn(profile.teacher.mobile ?? "—")}</span>}
              />
              <InfoRow
                label="এনআইডি"
                value={<span className="num">{maskNid(profile.teacher.nid)}</span>}
              />
              <InfoRow label="যোগদানের তারিখ" value={bnDate(profile.teacher.joiningDate)} />
              <InfoRow
                label="মাসিক বেতন"
                value={
                  <span className="num">
                    {profile.teacher.monthlySalary != null
                      ? takaLabel(profile.teacher.monthlySalary)
                      : "—"}
                  </span>
                }
              />
              <InfoRow label="ইউজারনেম" value={profile.user.username ?? "—"} />
              <InfoRow label="ইমেইল" value={profile.user.email ?? "—"} />
            </div>
          </div>

          <div className="card">
            <div className="chead">
              <h3 className="ct">সাপ্তাহিক রুটিন — আমার পিরিয়ডসমূহ</h3>
              <span className="sp" />
              <span className="chip b">
                মোট {bnNum(routine.length)} পিরিয়ড/সপ্তাহ
              </span>
            </div>
            <div className="tw">
              <table className="routine">
                <thead>
                  <tr>
                    {days.map((day) => (
                      <th key={day}>{WEEKDAYS_BN[day]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {days.map((day) => {
                      const slots = routine
                        .filter((row) => row.dayOfWeek === day)
                        .sort((a, b) => a.period - b.period);
                      return (
                        <td key={day} style={{ verticalAlign: "top", textAlign: "left" }}>
                          {slots.length === 0 ? (
                            <span className="muted">ক্লাস নেই</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  style={{
                                    background: "var(--p100)",
                                    color: "var(--p800)",
                                    borderRadius: 6,
                                    padding: "6px 8px",
                                  }}
                                >
                                  <b>পিরিয়ড {bn(slot.period)}</b>
                                  <div>{slot.subjectNameBn}</div>
                                  <div className="small">
                                    {slot.classNameBn}
                                    {slot.sectionNameBn ? ` (${slot.sectionNameBn})` : ""}
                                  </div>
                                  {slot.room && (
                                    <div className="small muted">কক্ষ: {bn(slot.room)}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              রুটিন অ্যাডমিন প্যানেল থেকে তৈরি হয় — বদল হলে এখানে
              স্বয়ংক্রিয়ভাবে দেখাবে।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
