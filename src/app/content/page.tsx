/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

type Item = Record<string, unknown> & { id: string };
const tabs = [
  ["homepageBlocks", "হোমপেজ ব্লক"],
  ["menus", "মেনু"],
  ["serviceBoxes", "সেবা বক্স"],
  ["pages", "তথ্য পেজ"],
  ["notices", "বিজ্ঞপ্তি"],
  ["news", "খবর"],
  ["events", "ইভেন্ট"],
  ["galleries", "গ্যালারি"],
  ["downloads", "ডাউনলোড"],
  ["importantLinks", "গুরুত্বপূর্ণ লিংক"],
  ["quotes", "উক্তি"],
  ["messages", "বাণী"],
  ["banners", "ব্যানার"],
] as const;
const { useUploadThing } = generateReactHelpers<UploadRouter>();

export default function ContentManagementPage() {
  const [tab, setTab] = useState<string>(tabs[0][0]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "general",
    published: false,
    enabled: true,
  });
  const [message, setMessage] = useState("");
  const uploadKind =
    tab === "galleries" || tab === "banners"
      ? "galleryImage"
      : tab === "downloads"
        ? "downloadFile"
        : tab === "notices"
          ? "noticeAttachment"
          : null;
  const { startUpload, isUploading } = useUploadThing(
    uploadKind ?? "galleryImage",
    {
      onClientUploadComplete: (files) =>
        setForm((current) => ({ ...current, body: files[0]?.url ?? "" })),
    },
  );
  async function load() {
    const payload = (await (await fetch(`/api/content/${tab}`)).json()) as {
      data?: Item[];
    };
    setItems(payload.data ?? []);
  }
  useEffect(() => {
    void load();
  }, [tab]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const value: Record<string, unknown> = {
      titleBn: form.title,
      body: form.body,
      details: form.body,
      category: form.category,
      isPublished: form.published,
      isEnabled: form.enabled,
      key: `block-${Date.now()}`,
      orderIndex: items.length,
      name: form.title,
      fileUrl: form.body,
      imageUrl: form.body,
      coverUrl: form.body,
      url: form.body,
      labelBn: form.title,
      textBn: form.body,
      startsAt: new Date().toISOString(),
    };
    const response = await fetch(`/api/content/${tab}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setMessage(response.ok ? "সংরক্ষণ হয়েছে" : "সংরক্ষণ করা যায়নি");
    if (response.ok) {
      setForm({
        title: "",
        body: "",
        category: "general",
        published: false,
        enabled: true,
      });
      await load();
    }
  }
  async function update(item: Item, value: Record<string, unknown>) {
    const response = await fetch(`/api/content/${tab}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...value } : row)),
      );
  }
  const needsRichText = [
    "pages",
    "notices",
    "news",
    "events",
    "quotes",
    "messages",
  ].includes(tab);
  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl font-bold text-primary-800">
          ওয়েবসাইট কনটেন্ট
        </h1>
        <div className="my-6 flex gap-2 overflow-x-auto border-b pb-2">
          {tabs.map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              type="button"
              variant={tab === key ? "default" : "ghost"}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <form
          onSubmit={create}
          className="mb-6 grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-4"
        >
          <Input
            placeholder="শিরোনাম"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
          {needsRichText ? (
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-primary-800">
                বিবরণ
              </label>
              <RichTextEditor
                value={form.body}
                onChange={(body) => setForm({ ...form, body })}
              />
            </div>
          ) : (
            <Input
              placeholder="বিবরণ/URL"
              value={form.body}
              onChange={(event) =>
                setForm({ ...form, body: event.target.value })
              }
            />
          )}
          {uploadKind && (
            <Input
              type="file"
              disabled={isUploading}
              accept={
                uploadKind === "galleryImage"
                  ? "image/jpeg,image/png,image/webp"
                  : undefined
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void startUpload([file]);
              }}
            />
          )}
          <Input
            placeholder="বিভাগ"
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.published}
              onCheckedChange={(value) =>
                setForm({ ...form, published: value })
              }
            />{" "}
            প্রকাশিত
          </label>
          <Button type="submit" disabled={isUploading}>
            নতুন রেকর্ড
          </Button>
          {message && <p className="text-accent-600">{message}</p>}
        </form>
        <section className="rounded-lg border bg-white p-5">
          {items.length === 0 ? (
            <p>কোনো রেকর্ড নেই।</p>
          ) : (
            items.map((item) => (
              <div
                className="flex items-center justify-between border-b py-3"
                key={item.id}
              >
                <span>
                  {String(
                    item.titleBn ??
                      item.name ??
                      item.labelBn ??
                      item.key ??
                      item.id,
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {("isEnabled" in item || tab === "homepageBlocks") && (
                    <>
                      <Switch
                        checked={Boolean(item.isEnabled)}
                        onCheckedChange={(value) =>
                          void update(item, { isEnabled: value })
                        }
                      />
                      <Badge variant={item.isEnabled ? "success" : "secondary"}>
                        {item.isEnabled ? "চালু" : "বন্ধ"}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
