"use client";

import { useState } from "react";
import { Bell, LayoutDashboard, Menu, Settings, Users } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

type Props = { id: string; schoolId: string; displayNameBn: string; role: "ADMIN" | "TEACHER" };

export function AdminDashboard({ id, schoolId, displayNameBn, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = role === "ADMIN"
    ? [{ label: "ড্যাশবোর্ড", icon: LayoutDashboard }, { label: "শিক্ষার্থী ও শিক্ষক", icon: Users }, { label: "বিদ্যালয়ের সেটিংস", icon: Settings }]
    : [{ label: "ড্যাশবোর্ড", icon: LayoutDashboard }, { label: "আমার ক্লাস", icon: Users }];
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 bg-primary-900 p-4 text-white transition-transform md:static md:translate-x-0`}>
        <div className="mb-8 border-b border-white/15 px-3 pb-5"><p className="text-lg font-bold">আদর্শ মডেল উচ্চ বিদ্যালয়</p><p className="text-xs text-primary-100">প্রশাসন প্যানেল</p></div>
        <nav className="space-y-1" aria-label="প্রধান নেভিগেশন">{nav.map(({ label, icon: Icon }, index) => <button key={label} type="button" className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm ${index === 0 ? "bg-primary-600 font-semibold" : "text-primary-100 hover:bg-primary-800"}`}><Icon className="size-5" />{label}</button>)}{role === "ADMIN" && <><a href="/content" className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-primary-100 hover:bg-primary-800"><Settings className="size-5" />ওয়েবসাইট কনটেন্ট</a><a href="/settings" className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-primary-100 hover:bg-primary-800"><Settings className="size-5" />বিদ্যালয়ের সেটিংস</a></>}</nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:px-8"><div className="flex items-center gap-3"><Button type="button" variant="outline" size="icon-sm" className="md:hidden" onClick={() => setSidebarOpen((value) => !value)}><Menu className="size-4" /></Button><div><h1 className="text-lg font-bold text-primary-800">ড্যাশবোর্ড</h1><p className="text-sm text-neutral-600">স্বাগতম, {displayNameBn}</p></div></div><div className="flex items-center gap-3"><Bell className="size-5 text-neutral-600" /><SignOutButton /></div></header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 p-4 md:p-8"><div className="rounded-lg bg-primary-800 p-6 text-white"><p className="text-sm text-primary-100">{role === "ADMIN" ? "প্রশাসক" : "শিক্ষক"}</p><h2 className="mt-1 text-2xl font-bold">বিদ্যালয়ের কার্যক্রম এক নজরে</h2><p className="mt-2 text-sm text-primary-100">শিক্ষার্থী, উপস্থিতি, ফলাফল ও অর্থ ব্যবস্থাপনা এখান থেকে পরিচালনা করুন।</p></div><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="মোট শিক্ষার্থী" value="—" /><Stat label="মোট শিক্ষক" value="—" /><Stat label="আজকের উপস্থিতি" value="—" /><Stat label="এই মাসের সংগ্রহ" value="৳ —" /></section><section className="grid gap-6 lg:grid-cols-2"><div className="rounded-lg border border-neutral-200 bg-white p-6"><h3 className="font-bold text-primary-800">সাম্প্রতিক বিজ্ঞপ্তি</h3><p className="mt-4 text-sm text-neutral-600">কোনো বিজ্ঞপ্তি এখনো প্রকাশিত হয়নি।</p></div><div className="rounded-lg border border-neutral-200 bg-white p-6"><h3 className="font-bold text-primary-800">অ্যাকাউন্ট তথ্য</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-neutral-600">ইউজার আইডি</dt><dd className="truncate font-medium">{id}</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-600">প্রতিষ্ঠান আইডি</dt><dd className="truncate font-medium">{schoolId}</dd></div></dl></div></section></main>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-neutral-200 bg-white p-5"><p className="text-sm text-neutral-600">{label}</p><p className="mt-2 text-2xl font-bold text-primary-800">{value}</p></div>; }
