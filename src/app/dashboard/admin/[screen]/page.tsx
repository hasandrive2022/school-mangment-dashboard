import { ScreenWorkspace } from "@/components/admin/screen-workspace";

export default async function AdminScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  return <ScreenWorkspace screen={screen} />;
}
