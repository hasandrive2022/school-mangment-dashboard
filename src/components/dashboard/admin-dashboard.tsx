"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { formatTaka } from "@/lib/format";

type Props = {
  id: string;
  schoolId: string;
  displayNameBn: string;
  role: "ADMIN" | "TEACHER";
};

export function AdminDashboard({ id, schoolId, displayNameBn, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState("বিদ্যালয়");
  const [recentNotice, setRecentNotice] = useState<string | null>(null);
  const [noticeLoaded, setNoticeLoaded] = useState(false);
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [feeSummary, setFeeSummary] = useState({ paid: 0, partial: 0, due: 0 });
  const [feeLoaded, setFeeLoaded] = useState(false);
  const [statsError, setStatsError] = useState(false);
  useEffect(() => {
    if (role !== "ADMIN") {
      void fetch("/api/school-settings", { cache: "no-store" })
        .then(
          (response) =>
            response.json() as Promise<{
              data?: { school?: { nameBn?: string } };
            }>,
        )
        .then((payload) =>
          setSchoolName(payload.data?.school?.nameBn ?? "বিদ্যালয়"),
        )
        .catch(() => setStatsError(true));
      // Teacher dashboard notice feed (B9): the admin content endpoint is
      // ADMIN-only, so teachers read their own portal notices route.
      void fetch("/api/backend/teacher/portal/notices", { cache: "no-store" })
        .then((response) =>
          response.ok
            ? (response.json() as Promise<{
                data?: Array<{ titleBn?: string }>;
              }>)
            : Promise.resolve({ data: [] }),
        )
        .then((payload) =>
          setRecentNotice(payload.data?.[0]?.titleBn ?? null),
        )
        .catch(() => undefined)
        .finally(() => setNoticeLoaded(true));
      return;
    }
    void Promise.all([
      fetch("/api/backend/people/students", { cache: "no-store" }),
      fetch("/api/backend/people/teachers", { cache: "no-store" }),
      fetch("/api/school-settings", { cache: "no-store" }),
      fetch("/api/content/notices", { cache: "no-store" }),
    ])
      .then(
        async ([
          studentsResponse,
          teachersResponse,
          schoolResponse,
          noticesResponse,
        ]) => {
          if (!studentsResponse.ok || !teachersResponse.ok)
            throw new Error("Dashboard data unavailable");
          const [
            studentsPayload,
            teachersPayload,
            schoolPayload,
            noticesPayload,
          ] = await Promise.all([
            studentsResponse.json() as Promise<{ data?: unknown[] }>,
            teachersResponse.json() as Promise<{ data?: unknown[] }>,
            schoolResponse.json() as Promise<{
              data?: { school?: { nameBn?: string } };
            }>,
            noticesResponse.ok
              ? (noticesResponse.json() as Promise<{
                  data?: Array<{ titleBn?: string }>;
                }>)
              : Promise.resolve({ data: [] }),
          ]);
          setStudentCount(studentsPayload.data?.length ?? 0);
          setTeacherCount(teachersPayload.data?.length ?? 0);
          setSchoolName(schoolPayload.data?.school?.nameBn ?? "বিদ্যালয়");
          setRecentNotice(noticesPayload.data?.[0]?.titleBn ?? null);
          setNoticeLoaded(true);
          const ledgerResponse = await fetch("/api/backend/finance/ledger", {
            cache: "no-store",
          });
          if (ledgerResponse.ok) {
            const ledgerPayload = (await ledgerResponse.json()) as {
              totals?: { balance?: number };
            };
            setLedgerBalance(ledgerPayload.totals?.balance ?? null);
          }
          const duesResponse = await fetch("/api/backend/finance/dues", {
            cache: "no-store",
          });
          if (duesResponse.ok) {
            const duesPayload = (await duesResponse.json()) as {
              data?: Array<{ status?: string }>;
            };
            const dues = duesPayload.data ?? [];
            setFeeSummary({
              paid: dues.filter((row) => row.status === "PAID").length,
              partial: dues.filter((row) => row.status === "PARTIAL").length,
              due: dues.filter((row) => row.status === "DUE").length,
            });
          }
          setFeeLoaded(true);
        },
      )
      .catch(() => {
        setStatsError(true);
        setFeeLoaded(true);
        setNoticeLoaded(true);
      });
  }, [role]);
  const groups =
    role === "ADMIN"
      ? [
          {
            title: "ওভারভিউ",
            items: [
              {
                label: "ড্যাশবোর্ড",
                href: "/dashboard",
                icon: LayoutDashboard,
              },
            ],
          },
          {
            title: "একাডেমিক",
            items: [
              {
                label: "শিক্ষার্থী ও শিক্ষক",
                href: "/dashboard/people",
                icon: Users,
              },
              {
                label: "একাডেমিক কাঠামো",
                href: "/dashboard/academics",
                icon: BookOpen,
              },
              {
                label: "উপস্থিতি রিপোর্ট",
                href: "/dashboard/attendance/reports",
                icon: CalendarDays,
              },
              {
                label: "পরীক্ষা ও ফলাফল",
                href: "/dashboard/results",
                icon: GraduationCap,
              },
            ],
          },
          {
            title: "অর্থ ও ভর্তি",
            items: [
              {
                label: "ফি ও সংগ্রহ",
                href: "/dashboard/finance",
                icon: CreditCard,
              },
              {
                label: "বেতন",
                href: "/dashboard/salary",
                icon: ClipboardList,
              },
              {
                label: "আয়–ব্যয়",
                href: "/dashboard/ledger",
                icon: FileText,
              },
              {
                label: "ভর্তি আবেদন",
                href: "/dashboard/admissions",
                icon: ClipboardList,
              },
            ],
          },
          {
            title: "ওয়েবসাইট",
            items: [
              {
                label: "কনটেন্ট",
                href: "/dashboard/content",
                icon: FileText,
              },
              {
                label: "বিদ্যালয়ের সেটিংস",
                href: "/dashboard/settings",
                icon: Settings,
              },
            ],
          },
        ]
      : [
          {
            title: "ওভারভিউ",
            items: [
              {
                label: "ড্যাশবোর্ড",
                href: "/dashboard",
                icon: LayoutDashboard,
              },
            ],
          },
          {
            title: "শিক্ষক কার্যক্রম",
            items: [
              {
                label: "উপস্থিতি গ্রহণ",
                href: "/dashboard/attendance",
                icon: CalendarDays,
              },
              {
                label: "নম্বর এন্ট্রি",
                href: "/dashboard/marks-entry",
                icon: GraduationCap,
              },
            ],
          },
        ];
  const feeTotal = feeSummary.paid + feeSummary.partial + feeSummary.due;
  return (
    <div className="app full">
      <aside className={`side${sidebarOpen ? " open" : ""}`}>
        <div className="brand">
          <span className="logo">
            <GraduationCap className="ic lg" />
          </span>
          <div>
            <div className="bn">{schoolName}</div>
            <div className="be">
              {role === "TEACHER" ? "শিক্ষক প্যানেল" : "প্রশাসন প্যানেল"}
            </div>
          </div>
        </div>
        <nav aria-label="প্রধান নেভিগেশন">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="sg">{group.title}</p>
              {group.items.map(({ label, href, icon: Icon }, index) => (
                <Link
                  href={href}
                  key={label}
                  className={`mi${group.title === "ওভারভিউ" && index === 0 ? " on" : ""}`}
                >
                  <Icon className="ic" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="who">
          <span className="av">{displayNameBn.slice(0, 1)}</span>
          <div>
            <div className="wn">{displayNameBn}</div>
            <div className="wr">
              {role === "TEACHER" ? "শিক্ষক" : "প্রশাসক"}
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="ibtn dash-menu-btn"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="মেনু খুলুন/বন্ধ করুন"
          >
            <Menu className="ic sm" />
          </button>
          <span className="pt">ড্যাশবোর্ড</span>
          <span style={{ flex: 1 }} />
          <div className="tuser">
            <span className="av">{displayNameBn.slice(0, 1)}</span>
            <div>
              <div className="nm">{displayNameBn}</div>
              <div className="rl">
                {role === "TEACHER" ? "শিক্ষক" : "প্রশাসক"} · {schoolName}
              </div>
            </div>
          </div>
          <SignOutButton />
        </header>
        <div className="content">
          {role === "ADMIN" ? (
            <>
              <div className="g4">
                <Stat
                  label="মোট শিক্ষার্থী"
                  value={
                    statsError
                      ? "লোড হয়নি"
                      : studentCount === null
                        ? "লোড হচ্ছে…"
                        : String(studentCount)
                  }
                  icon={Users}
                />
                <Stat
                  label="মোট শিক্ষক"
                  value={
                    statsError
                      ? "লোড হয়নি"
                      : teacherCount === null
                        ? "লোড হচ্ছে…"
                        : String(teacherCount)
                  }
                  icon={User}
                />
                <Link
                  className="card stat statlink"
                  href="/dashboard/attendance/reports"
                >
                  <div>
                    <div className="v" style={{ fontSize: 19 }}>
                      রিপোর্ট খুলুন
                    </div>
                    <div className="l">আজকের উপস্থিতি</div>
                  </div>
                  <div className="ic-wrap g">
                    <CalendarDays className="ic lg" />
                  </div>
                </Link>
                <Stat
                  label="বর্তমান ব্যালেন্স"
                  value={
                    statsError
                      ? "লোড হয়নি"
                      : ledgerBalance === null
                        ? "লোড হচ্ছে…"
                        : formatTaka(ledgerBalance)
                  }
                  icon={Wallet}
                />
              </div>
              <div className="g32">
                <div className="card">
                  <div className="chead">
                    <h3 className="ct">ফি ডিউস ও পেমেন্ট</h3>
                    <span className="sp" />
                    <span className="chip b">সংগ্রহের অবস্থা</span>
                    <Link className="btn gho sm" href="/dashboard/finance">
                      বিস্তারিত
                    </Link>
                  </div>
                  {feeLoaded ? (
                    <>
                      <Bar
                        label="পরিশোধিত"
                        value={feeSummary.paid}
                        total={feeTotal}
                        tone="g"
                      />
                      <Bar
                        label="আংশিক"
                        value={feeSummary.partial}
                        total={feeTotal}
                        tone="w"
                      />
                      <Bar
                        label="বকেয়া"
                        value={feeSummary.due}
                        total={feeTotal}
                        tone="r"
                      />
                    </>
                  ) : (
                    <div aria-busy="true" aria-label="লোড হচ্ছে">
                      <div className="r6-skeleton-block r6-skeleton-line wide" style={{ marginBottom: 10 }} />
                      <div className="r6-skeleton-block r6-skeleton-line wide" style={{ marginBottom: 10 }} />
                      <div className="r6-skeleton-block r6-skeleton-line wide" />
                    </div>
                  )}
                </div>
                <div className="card">
                  <div className="chead">
                    <h3 className="ct">সাম্প্রতিক বিজ্ঞপ্তি</h3>
                    <span className="sp" />
                    <Link className="btn gho sm" href="/dashboard/content">
                      সব দেখুন
                    </Link>
                  </div>
                  <div className="listrow">
                    <span className="av">
                      <FileText className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        {noticeLoaded ? (recentNotice ?? "কোনো প্রকাশিত বিজ্ঞপ্তি নেই।") : "লোড হচ্ছে…"}
                      </div>
                      <div className="small muted">
                        সর্বশেষ প্রকাশিত বিজ্ঞপ্তি
                      </div>
                    </div>
                  </div>
                  <div className="listrow">
                    <span className="av w">
                      <CreditCard className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        বকেয়া শিক্ষার্থী
                      </div>
                      <div className="small muted">ফি সংগ্রহ বাকি আছে</div>
                    </div>
                    <strong className="num">
                      {feeLoaded ? feeSummary.due : "…"}
                    </strong>
                  </div>
                  <div className="listrow">
                    <span className="av g">
                      <BookOpen className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        আয়–ব্যয় রিপোর্ট
                      </div>
                      <div className="small muted">লেজার ব্যালেন্স</div>
                    </div>
                    <strong className="num">
                      {ledgerBalance === null ? "—" : formatTaka(ledgerBalance)}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="chead">
                  <h3 className="ct">অ্যাকাউন্ট তথ্য</h3>
                </div>
                <div className="listrow">
                  <div className="grow muted">ইউজার আইডি</div>
                  <b className="num">{id}</b>
                </div>
                <div className="listrow">
                  <div className="grow muted">প্রতিষ্ঠান আইডি</div>
                  <b className="num">{schoolId}</b>
                </div>
                <div className="listrow">
                  <div className="grow muted">প্রতিষ্ঠান</div>
                  <b>{schoolName}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="alert b">
                <BookOpen className="ic" />
                <span>
                  <b>স্বাগতম, {displayNameBn}।</b> বাম মেনু থেকে আজকের হাজিরা
                  নিন অথবা নম্বর এন্ট্রি করুন।
                </span>
                <span style={{ flex: 1 }} />
                <Link className="btn sm" href="/dashboard/attendance">
                  হাজিরা নিন
                </Link>
              </div>
              <div className="g2">
                <div className="card">
                  <div className="chead">
                    <h3 className="ct">আমার কার্যক্রম</h3>
                  </div>
                  <div className="listrow">
                    <span className="av">
                      <CalendarDays className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        উপস্থিতি গ্রহণ
                      </div>
                      <div className="small muted">
                        নিজের বরাদ্দকৃত ক্লাসের দৈনিক হাজিরা
                      </div>
                    </div>
                    <Link className="btn gho sm" href="/dashboard/attendance">
                      খুলুন
                    </Link>
                  </div>
                  <div className="listrow">
                    <span className="av">
                      <GraduationCap className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        নম্বর এন্ট্রি
                      </div>
                      <div className="small muted">
                        পরীক্ষার বিষয়ভিত্তিক নম্বর জমা দিন
                      </div>
                    </div>
                    <Link className="btn gho sm" href="/dashboard/marks-entry">
                      খুলুন
                    </Link>
                  </div>
                </div>
                <div className="card">
                  <div className="chead">
                    <h3 className="ct">সাম্প্রতিক বিজ্ঞপ্তি</h3>
                  </div>
                  <div className="listrow">
                    <span className="av">
                      <FileText className="ic sm" />
                    </span>
                    <div className="grow">
                      <div className="b" style={{ fontSize: 14.5 }}>
                        {noticeLoaded ? (recentNotice ?? "কোনো প্রকাশিত বিজ্ঞপ্তি নেই।") : "লোড হচ্ছে…"}
                      </div>
                      <div className="small muted">
                        সর্বশেষ প্রকাশিত বিজ্ঞপ্তি
                      </div>
                    </div>
                  </div>
                  <div className="chead" style={{ marginTop: 14 }}>
                    <h3 className="ct">অ্যাকাউন্ট তথ্য</h3>
                  </div>
                  <div className="listrow">
                    <div className="grow muted">ইউজার আইডি</div>
                    <b className="num">{id}</b>
                  </div>
                  <div className="listrow">
                    <div className="grow muted">প্রতিষ্ঠান</div>
                    <b>{schoolName}</b>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="card stat">
      <div>
        <div className="v num">{value}</div>
        <div className="l">{label}</div>
      </div>
      <div className={`ic-wrap${tone ? ` ${tone}` : ""}`}>
        <Icon className="ic lg" />
      </div>
    </div>
  );
}
function Bar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="listrow">
      <div className="grow">
        <div className="rowflex" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 14.5 }}>{label}</span>
          <b className="num">
            {value} · {pct}%
          </b>
        </div>
        <div className="bar" style={{ marginTop: 6 }}>
          <i
            className={tone === "w" ? "w" : tone}
            style={{ width: `${total ? Math.max(pct, value ? 5 : 0) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
