"use client";

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
  Users,
  WalletCards,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useAdminSWR } from "@/lib/swr";

type Props = { children: React.ReactNode };
type Me = { user?: { role?: "ADMIN" | "TEACHER"; displayNameBn?: string } };
type SchoolSettings = { data?: { school?: { nameBn?: string } } };
const adminGroups = [
  { title: "ওভারভিউ", items: [["ড্যাশবোর্ড", "/dashboard", LayoutDashboard]] },
  {
    title: "একাডেমিক",
    items: [
      ["শিক্ষার্থী ও শিক্ষক", "/dashboard/people", Users],
      ["শিক্ষক পাসওয়ার্ড", "/people/teacher-password", Users],
      ["একাডেমিক কাঠামো", "/dashboard/academics", BookOpen],
      ["ক্লাস রুটিন", "/dashboard/routine", CalendarDays],
      ["উপস্থিতি রিপোর্ট", "/dashboard/attendance/reports", CalendarDays],
      ["পরীক্ষা ও ফলাফল", "/dashboard/results", GraduationCap],
    ],
  },
  {
    title: "অর্থ ও ভর্তি",
    items: [
      ["ফি ও সংগ্রহ", "/dashboard/finance", CreditCard],
      ["বেতন", "/dashboard/salary", ClipboardList],
      ["আয়–ব্যয়", "/dashboard/ledger", FileText],
      ["রিপোর্ট", "/dashboard/reports", FileText],
      ["ভর্তি আবেদন", "/dashboard/admissions", ClipboardList],
    ],
  },
  {
    title: "ওয়েবসাইট",
    items: [
      ["কনটেন্ট", "/dashboard/content", FileText],
      ["বিদ্যালয়ের সেটিংস", "/dashboard/settings", Settings],
      ["আমার পাসওয়ার্ড", "/settings/password", Settings],
    ],
  },
] as const;
const teacherGroups = [
  { title: "ওভারভিউ", items: [["ড্যাশবোর্ড", "/dashboard", LayoutDashboard]] },
  {
    title: "শিক্ষক কার্যক্রম",
    items: [
      ["উপস্থিতি গ্রহণ", "/dashboard/attendance", CalendarDays],
      ["নম্বর এন্ট্রি", "/dashboard/marks-entry", GraduationCap],
      ["আমার বেতন", "/dashboard/my-salary", WalletCards],
      ["আমার প্রোফাইল", "/dashboard/my-profile", Users],
    ],
  },
] as const;

const pageTitles: Array<[string, string]> = [
  ["/dashboard/people/students", "শিক্ষার্থী"],
  ["/people/students", "শিক্ষার্থী"],
  ["/dashboard/people", "শিক্ষার্থী ও শিক্ষক"],
  ["/people", "শিক্ষার্থী ও শিক্ষক"],
  ["/dashboard/academics", "একাডেমিক কাঠামো"],
  ["/academics", "একাডেমিক কাঠামো"],
  ["/dashboard/routine", "ক্লাস রুটিন"],
  ["/routine", "ক্লাস রুটিন"],
  ["/dashboard/attendance/reports", "উপস্থিতি রিপোর্ট"],
  ["/attendance/reports", "উপস্থিতি রিপোর্ট"],
  ["/dashboard/attendance", "উপস্থিতি গ্রহণ"],
  ["/attendance", "উপস্থিতি গ্রহণ"],
  ["/dashboard/marks-entry", "নম্বর এন্ট্রি"],
  ["/marks-entry", "নম্বর এন্ট্রি"],
  ["/dashboard/results", "পরীক্ষা ও ফলাফল"],
  ["/results", "পরীক্ষা ও ফলাফল"],
  ["/dashboard/finance", "ফি ও সংগ্রহ"],
  ["/finance", "ফি ও সংগ্রহ"],
  ["/dashboard/salary", "বেতন"],
  ["/salary", "বেতন"],
  ["/dashboard/ledger", "আয়–ব্যয়"],
  ["/ledger", "আয়–ব্যয়"],
  ["/dashboard/admissions", "ভর্তি আবেদন"],
  ["/admissions", "ভর্তি আবেদন"],
  ["/dashboard/reports", "রিপোর্ট"],
  ["/reports", "রিপোর্ট"],
  ["/dashboard/my-salary", "আমার বেতন"],
  ["/my-salary", "আমার বেতন"],
  ["/dashboard/my-profile", "আমার প্রোফাইল ও রুটিন"],
  ["/my-profile", "আমার প্রোফাইল ও রুটিন"],
  ["/dashboard/content", "ওয়েবসাইট কনটেন্ট"],
  ["/content", "ওয়েবসাইট কনটেন্ট"],
  ["/dashboard/settings", "বিদ্যালয়ের সেটিংস"],
  ["/settings", "বিদ্যালয়ের সেটিংস"],
  ["/settings/password", "আমার পাসওয়ার্ড"],
  ["/people/teacher-password", "শিক্ষকের পাসওয়ার্ড"],
  ["/demo-reset", "ডেমো ডেটা রিসেট"],
];

function titleFor(pathname: string) {
  return (
    pageTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "প্যানেল"
  );
}

export function AdminChrome({ children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isShellless = pathname === "/login";
  const { data: mePayload, isLoading: isMeLoading } = useAdminSWR<Me>(
    isShellless ? null : "/api/auth/me",
  );
  const { data: schoolPayload } = useAdminSWR<SchoolSettings>(
    isShellless ? null : "/api/school-settings",
  );
  const me = mePayload?.user;
  const schoolName = schoolPayload?.data?.school?.nameBn ?? "বিদ্যালয়";
  if (pathname === "/login")
    return <div className="dadmin">{children}</div>;
  if (isMeLoading || !me) {
    return (
      <div className="dadmin">
        <main className="admin-loading">
          <div className="loading-bar loading-title" />
          <div className="loading-grid">
            <div className="loading-card" />
            <div className="loading-card" />
            <div className="loading-card" />
          </div>
        </main>
        {children}
      </div>
    );
  }
  const role = me?.role ?? "ADMIN";
  const groups = role === "TEACHER" ? teacherGroups : adminGroups;
  const displayName = me?.displayNameBn || "স্বাগতম";
  return (
    <div className="dadmin">
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
                {group.items.map(([label, href, Icon]) => (
                  <Link
                    className={`mi${pathname === href ? " on" : ""}`}
                    href={href}
                    key={href}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="ic" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="who">
            <span className="av">{displayName.slice(0, 1)}</span>
            <div>
              <div className="wn">{displayName}</div>
              <div className="wr">
                {role === "TEACHER" ? "শিক্ষক" : "প্রশাসক"}
              </div>
            </div>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button type="button" className="ibtn dash-menu-btn" onClick={() => setSidebarOpen((value) => !value)} aria-label="মেনু খুলুন বা বন্ধ করুন">
              <Menu className="ic sm" />
            </button>
            <span className="pt">{titleFor(pathname)}</span>
            <span style={{ flex: 1 }} />
            <div className="tuser">
              <span className="av">{displayName.slice(0, 1)}</span>
              <div>
                <div className="nm">{displayName}</div>
                <div className="rl">
                  {role === "TEACHER" ? "শিক্ষক" : "প্রশাসক"} · {schoolName}
                </div>
              </div>
            </div>
            <span className="signout-wrap">
              <SignOutButton />
            </span>
          </header>
          <div className="content">{children}</div>
        </div>
      </div>
    </div>
  );
}
