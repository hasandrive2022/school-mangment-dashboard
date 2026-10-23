/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type App = {
  id: string;
  trackingId: string;
  status: string;
  reviewNote: string | null;
  photoUrl?: string | null;
  applicant: Record<string, string>;
};

export default function AdmissionsPage() {
  const [rows, setRows] = useState<App[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<App | null>(null);
  const [message, setMessage] = useState("");
  async function load() {
    const [applications, settings] = await Promise.all([
      fetch("/api/backend/admissions"),
      fetch("/api/backend/admissions/settings"),
    ]);
    const applicationPayload = (await applications.json()) as { data?: App[] };
    const settingsPayload = (await settings.json()) as {
      data?: { isOpen?: boolean };
    };
    const nextRows = applicationPayload.data ?? [];
    setRows(nextRows);
    setSelected((current) =>
      current
        ? (nextRows.find((row) => row.id === current.id) ?? null)
        : (nextRows[0] ?? null),
    );
    setOpen(Boolean(settingsPayload.data?.isOpen));
  }
  useEffect(() => {
    void load();
  }, []);
  async function toggle(value: boolean) {
    setOpen(value);
    await fetch("/api/backend/admissions/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: value, fields: [] }),
    });
  }
  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/backend/admissions/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        note:
          status === "REJECTED" ? "প্রয়োজনীয় শর্ত পূরণ হয়নি" : "অনুমোদিত",
      }),
    });
    setMessage(
      response.ok ? "আবেদনের status পরিবর্তন হয়েছে" : "পরিবর্তন করা যায়নি",
    );
    await load();
  }
  return (
    <div className="dstack">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-800">ভর্তি আবেদন</h1>
            <p className="mt-1 text-sm text-neutral-600">
              আবেদন যাচাই, ছবি দেখা ও অনুমোদন
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
            আবেদন খোলা{" "}
            <Switch
              checked={open}
              onCheckedChange={(value) => void toggle(value)}
            />
          </label>
        </div>
        <div className="admission-review-grid mt-6">
          {" "}
          <section className="space-y-3">
            {rows.length ? (
              rows.map((row) => (
                <button
                  type="button"
                  className={`admission-row ${selected?.id === row.id ? "selected" : ""}`}
                  key={row.id}
                  onClick={() => setSelected(row)}
                >
                  <span>
                    <b>{row.trackingId}</b>
                    <small>
                      {row.applicant?.nameBn ??
                        row.applicant?.nameEn ??
                        "আবেদনকারী"}
                    </small>
                  </span>
                  <Badge
                    variant={
                      row.status === "APPROVED"
                        ? "success"
                        : row.status === "REJECTED"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {row.status}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="card admin-empty">কোনো আবেদন নেই।</div>
            )}
          </section>
          <section className="card admission-detail">
            {selected ? (
              <>
                <div className="flex items-start gap-4 border-b pb-5">
                  {selected.photoUrl ? (
                    <Image
                      className="admission-photo"
                      src={selected.photoUrl}
                      alt="আবেদনকারীর ছবি"
                      width={96}
                      height={96}
                      unoptimized
                    />
                  ) : (
                    <div className="admission-photo photo-empty">ছবি নেই</div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-500">Tracking ID</p>
                    <h2 className="text-xl font-bold text-primary-800">
                      {selected.trackingId}
                    </h2>
                    <p className="mt-1 text-neutral-700">
                      {selected.applicant?.nameBn ??
                        selected.applicant?.nameEn ??
                        "আবেদনকারী"}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={
                        selected.status === "APPROVED"
                          ? "success"
                          : selected.status === "REJECTED"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {selected.status}
                    </Badge>
                  </div>
                </div>
                <dl className="admission-details">
                  {Object.entries(selected.applicant ?? {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ),
                  )}
                </dl>
                {selected.status === "PENDING" && (
                  <div className="flex gap-2 border-t pt-5">
                    <Button
                      className="btn grn"
                      onClick={() => void review(selected.id, "APPROVED")}
                    >
                      অনুমোদন
                    </Button>
                    <Button
                      variant="destructive"
                      className="btn dgr"
                      onClick={() => void review(selected.id, "REJECTED")}
                    >
                      বাতিল
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-neutral-600">
                বিস্তারিত দেখতে আবেদন নির্বাচন করুন।
              </div>
            )}
          </section>
        </div>
        {message && <p className="alert g">{message}</p>}
    </div>
  );
}
