import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ড্যাশবোর্ড",
  description: "বিদ্যালয় ব্যবস্থাপনা ড্যাশবোর্ড",
};

export const instant = false;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "TEACHER"))
    redirect("/login");
  return (
    <AdminDashboard
      id={session.sub}
      schoolId={session.schoolId}
      displayNameBn={session.displayNameBn}
      role={session.role}
    />
  );
}
