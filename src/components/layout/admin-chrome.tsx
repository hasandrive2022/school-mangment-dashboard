"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
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
      ["ভর্তি আবেদন", "/dashboard/admissions", ClipboardList],
    ],
  },
  {
    title: "ওয়েবসাইট",
    items: [
      ["কনটেন্ট", "/dashboard/content", FileText],
      ["বিদ্যালয়ের সেটিংস", "/dashboard/settings", Settings],
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
    ],
  },
] as const;

export function AdminChrome({ children }: Props) {
  const pathname = usePathname();
  const isShellless = pathname === "/login" || pathname === "/dashboard";
  const { data: mePayload } = useAdminSWR<Me>(
    isShellless ? null : "/api/auth/me",
  );
  const { data: schoolPayload } = useAdminSWR<SchoolSettings>(
    isShellless ? null : "/api/school-settings",
  );
  const me = mePayload?.user;
  const schoolName = schoolPayload?.data?.school?.nameBn ?? "বিদ্যালয়";
  if (pathname === "/login" || pathname === "/dashboard") return children;
  const role = me?.role ?? "ADMIN";
  const groups = role === "TEACHER" ? teacherGroups : adminGroups;
  return (
    <div className="admin-chrome">
      <aside className="admin-chrome-sidebar">
        <div className="admin-chrome-brand">
          <span>আ</span>
          <div>
            <b>{schoolName}</b>
            <small>
              {role === "TEACHER" ? "শিক্ষক প্যানেল" : "প্রশাসন প্যানেল"}
            </small>
          </div>
        </div>
        <nav aria-label="প্রধান নেভিগেশন">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="admin-nav-group">{group.title}</p>
              {group.items.map(([label, href, Icon]) => (
                <a
                  className={pathname === href ? "active" : ""}
                  href={href}
                  key={href}
                >
                  <Icon className="size-4" />
                  {label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="admin-chrome-main">
        <header className="admin-chrome-topbar">
          <div>
            <b>{schoolName}</b>
            <small>{me?.displayNameBn || "স্বাগতম"}</small>
          </div>
          <SignOutButton />
        </header>
        {children}
      </div>
    </div>
  );
}
