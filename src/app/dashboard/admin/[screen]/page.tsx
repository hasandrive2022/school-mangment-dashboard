import { Suspense } from "react";
import { ScreenWorkspace } from "@/components/admin/screen-workspace";

export default function AdminScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  return (
    <Suspense fallback={<ScreenWorkspaceFallback />}>
      <AdminScreenContent params={params} />
    </Suspense>
  );
}

async function AdminScreenContent({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  return <ScreenWorkspace screen={screen} />;
}

function ScreenWorkspaceFallback() {
  return (
    <div className="dstack screen-workspace" aria-busy="true">
      <section className="screen-hero screen-hero-skeleton">
        <div className="screen-hero-copy">
          <span className="screen-icon loading-block" />
          <div>
            <div className="loading-bar loading-eyebrow" />
            <div className="loading-bar loading-heading" />
            <div className="loading-bar loading-copy" />
          </div>
        </div>
      </section>
      <div className="g4 screen-stats">
        <div className="card loading-card" />
        <div className="card loading-card" />
        <div className="card loading-card" />
        <div className="card loading-card" />
      </div>
      <section className="card loading-table" />
    </div>
  );
}
