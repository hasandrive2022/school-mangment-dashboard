import { redirect } from "next/navigation";
import { TeacherScreen } from "@/components/admin/teacher-screen";

/**
 * These legacy "/dashboard/admin/<screen>" links used to render a static
 * mock workspace (hard-coded rows, dead buttons, fake counts). Each screen
 * now routes to the real management page that owns that data; the two
 * teacher screens are served by real teacher-portal data.
 */
const REDIRECTS: Record<string, string> = {
  notices: "/dashboard/content?tab=notices",
  exams: "/dashboard/results",
  "fee-events": "/dashboard/finance",
  collection: "/dashboard/finance",
  salary: "/dashboard/salary",
  ledger: "/dashboard/ledger",
  admissions: "/dashboard/admissions",
  inbox: "/dashboard/content?tab=complaints",
  settings: "/dashboard/settings",
};

export default async function AdminScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (screen === "t-salary" || screen === "t-profile") {
    return <TeacherScreen screen={screen} />;
  }
  redirect(REDIRECTS[screen] ?? "/dashboard");
}
