"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

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
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [feeSummary, setFeeSummary] = useState({ paid: 0, partial: 0, due: 0 });
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
        },
      )
      .catch(() => setStatsError(true));
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
              { label: "শিক্ষার্থী ও শিক্ষক", href: "/people", icon: Users },
              { label: "একাডেমিক কাঠামো", href: "/academics", icon: BookOpen },
              {
                label: "উপস্থিতি রিপোর্ট",
                href: "/attendance/reports",
                icon: CalendarDays,
              },
              {
                label: "পরীক্ষা ও ফলাফল",
                href: "/results",
                icon: GraduationCap,
              },
            ],
          },
          {
            title: "অর্থ ও ভর্তি",
            items: [
              { label: "ফি ও সংগ্রহ", href: "/finance", icon: CreditCard },
              { label: "বেতন", href: "/salary", icon: ClipboardList },
              { label: "আয়–ব্যয়", href: "/ledger", icon: FileText },
              {
                label: "ভর্তি আবেদন",
                href: "/admissions",
                icon: ClipboardList,
              },
            ],
          },
          {
            title: "ওয়েবসাইট",
            items: [
              { label: "কনটেন্ট", href: "/content", icon: FileText },
              {
                label: "বিদ্যালয়ের সেটিংস",
                href: "/settings",
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
                href: "/attendance",
                icon: CalendarDays,
              },
              {
                label: "নম্বর এন্ট্রি",
                href: "/marks-entry",
                icon: GraduationCap,
              },
            ],
          },
        ];
  return (
    <div className="admin-shell flex min-h-screen bg-neutral-50">
      <aside
        className={`admin-sidebar ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 bg-primary-900 p-4 text-white transition-transform md:static md:translate-x-0`}
      >
        <div className="mb-8 border-b border-white/15 px-3 pb-5">
          <p className="text-lg font-bold">{schoolName}</p>
          <p className="text-xs text-primary-100">প্রশাসন প্যানেল</p>
        </div>
        <nav className="space-y-1" aria-label="প্রধান নেভিগেশন">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="admin-nav-group">{group.title}</p>
              {group.items.map(({ label, href, icon: Icon }, index) => (
                <a
                  href={href}
                  key={label}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${group.title === "ওভারভিউ" && index === 0 ? "bg-primary-600 font-semibold" : "text-primary-100 hover:bg-primary-800"}`}
                >
                  <Icon className="size-5" />
                  {label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="admin-content flex min-w-0 flex-1 flex-col">
        <header className="admin-topbar flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <Menu className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-primary-800">ড্যাশবোর্ড</h1>
              <p className="text-sm text-neutral-600">
                স্বাগতম, {displayNameBn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-neutral-600" />
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 p-4 md:p-8">
          <div className="rounded-lg bg-primary-800 p-6 text-white">
            <p className="text-sm text-primary-100">
              {role === "ADMIN" ? "প্রশাসক" : "শিক্ষক"}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              বিদ্যালয়ের কার্যক্রম এক নজরে
            </h2>
            <p className="mt-2 text-sm text-primary-100">
              {schoolName} এর লাইভ কার্যক্রম এখান থেকে পরিচালনা করুন।
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="মোট শিক্ষার্থী"
              value={
                statsError
                  ? "লোড হয়নি"
                  : studentCount === null
                    ? "লোড হচ্ছে…"
                    : String(studentCount)
              }
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
            />
            <Stat label="আজকের উপস্থিতি" value="রিপোর্ট খুলুন" />
            <Stat
              label="বর্তমান ব্যালেন্স"
              value={
                ledgerBalance === null ? "লোড হচ্ছে…" : `৳ ${ledgerBalance}`
              }
            />
          </section>
          {role === "ADMIN" && (
            <section className="dashboard-report-grid">
              <div className="dashboard-report-card">
                <div className="dashboard-report-heading">
                  <div>
                    <p>সংগ্রহের অবস্থা</p>
                    <h3>ফি ডিউস ও পেমেন্ট</h3>
                  </div>
                  <a href="/finance">বিস্তারিত →</a>
                </div>
                <div className="dashboard-bars">
                  <Bar
                    label="পরিশোধিত"
                    value={feeSummary.paid}
                    color="paid"
                    total={
                      feeSummary.paid + feeSummary.partial + feeSummary.due
                    }
                  />
                  <Bar
                    label="আংশিক"
                    value={feeSummary.partial}
                    color="partial"
                    total={
                      feeSummary.paid + feeSummary.partial + feeSummary.due
                    }
                  />
                  <Bar
                    label="বকেয়া"
                    value={feeSummary.due}
                    color="due"
                    total={
                      feeSummary.paid + feeSummary.partial + feeSummary.due
                    }
                  />
                </div>
              </div>
              <div className="dashboard-report-card">
                <div className="dashboard-report-heading">
                  <div>
                    <p>দ্রুত রিপোর্ট</p>
                    <h3>ডিফল্টার ও কার্যক্রম</h3>
                  </div>
                  <a href="/attendance/reports">রিপোর্ট →</a>
                </div>
                <div className="dashboard-report-list">
                  <a href="/finance">
                    <span>বকেয়া শিক্ষার্থী</span>
                    <strong>{feeSummary.due}</strong>
                  </a>
                  <a href="/attendance/reports">
                    <span>উপস্থিতি রিপোর্ট</span>
                    <strong>দেখুন</strong>
                  </a>
                  <a href="/ledger">
                    <span>আয়–ব্যয় রিপোর্ট</span>
                    <strong>
                      {ledgerBalance === null ? "—" : `৳ ${ledgerBalance}`}
                    </strong>
                  </a>
                </div>
              </div>
            </section>
          )}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h3 className="font-bold text-primary-800">
                সাম্প্রতিক বিজ্ঞপ্তি
              </h3>
              <p className="mt-4 text-sm text-neutral-600">
                {recentNotice ?? "কোনো প্রকাশিত বিজ্ঞপ্তি নেই।"}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h3 className="font-bold text-primary-800">অ্যাকাউন্ট তথ্য</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">ইউজার আইডি</dt>
                  <dd className="truncate font-medium">{id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">প্রতিষ্ঠান আইডি</dt>
                  <dd className="truncate font-medium">{schoolId}</dd>
                </div>
              </dl>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-primary-800">{value}</p>
    </div>
  );
}
function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div className="dashboard-bar">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <i
        className={color}
        style={{
          width: `${total ? Math.max((value / total) * 100, value ? 5 : 0) : 0}%`,
        }}
      />
    </div>
  );
}
