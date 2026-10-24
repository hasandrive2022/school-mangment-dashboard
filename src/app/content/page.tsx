/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-api";
import { ArrowDown, ArrowUp, Pencil, X } from "lucide-react";

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
  ["videos", "ভিডিও"],
  ["downloads", "ডাউনলোড"],
  ["holidays", "ছুটি"],
  ["committee", "কমিটি"],
  ["importantLinks", "গুরুত্বপূর্ণ লিংক"],
  ["quotes", "উক্তি"],
  ["messages", "বাণী"],
  ["banners", "ব্যানার"],
  ["contactMessages", "যোগাযোগের বার্তা"],
  ["complaints", "অভিযোগ"],
] as const;

type TabKey = (typeof tabs)[number][0];

const INBOX_TABS: TabKey[] = ["contactMessages", "complaints"];
const CHILD_TABS: TabKey[] = ["menus", "serviceBoxes", "galleries"];

const STATUS_OPTIONS: Record<string, Array<[string, string]>> = {
  contactMessages: [
    ["unread", "অপঠিত"],
    ["read", "পড়া হয়েছে"],
    ["resolved", "সমাধান হয়েছে"],
  ],
  complaints: [
    ["received", "গৃহীত"],
    ["in_review", "পর্যালোচনাধীন"],
    ["resolved", "সমাধান হয়েছে"],
    ["rejected", "বাতিল"],
  ],
};

const { useUploadThing } = generateReactHelpers<UploadRouter>();

function itemTitle(item: Item): string {
  return String(
    item.titleBn ??
      item.nameBn ??
      item.name ??
      item.labelBn ??
      item.subject ??
      item.key ??
      item.id,
  );
}

function itemBody(item: Item): string {
  const raw = item.details ?? item.body ?? item.description ?? item.message ?? item.textBn ?? "";
  return String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function visibilityKey(item: Item): "isEnabled" | "isPublished" | "isActive" | null {
  if ("isEnabled" in item) return "isEnabled";
  if ("isPublished" in item) return "isPublished";
  if ("isActive" in item) return "isActive";
  return null;
}

export default function ContentManagementPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (requested && tabs.some(([key]) => key === requested))
        return requested as TabKey;
    }
    return "homepageBlocks";
  });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "general",
    published: false,
    enabled: true,
  });
  const [message, setMessage] = useState("");
  const [children, setChildren] = useState<Item[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Item | null>(null);
  const [childForm, setChildForm] = useState({ label: "", url: "" });

  const isInbox = INBOX_TABS.includes(tab);
  const hasChildren = CHILD_TABS.includes(tab);
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
    setLoading(true);
    setLoadError("");
    try {
      const payload = await apiGet<{ data?: Item[] }>(`/api/content/${tab}`);
      let rows = payload.data ?? [];
      if (tab === "homepageBlocks") {
        rows = [...rows].sort(
          (a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0),
        );
      }
      setItems(rows);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "ডেটা লোড করা যায়নি",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setEditing(null);
    setSelectedParent(null);
    setChildren([]);
    void load();
  }, [tab]);

  async function loadChildren(parent: Item) {
    setSelectedParent(parent);
    setChildrenLoading(true);
    try {
      const payload = await apiGet<{ data?: Item[] }>(
        `/api/content/${tab}/${parent.id}/items`,
      );
      setChildren(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "আইটেম লোড করা যায়নি");
      setChildren([]);
    } finally {
      setChildrenLoading(false);
    }
  }

  function buildValue(): Record<string, unknown> {
    // Fix 1 (Round 7): on the banners + galleries tabs the image is
    // OPTIONAL — an empty image field must save as `null` (the column is
    // now nullable), never as an empty string, and must never block a save.
    const imageOptional = tab === "banners" || tab === "galleries";
    return {
      titleBn: form.title,
      body: form.body,
      details: form.body,
      description: form.body,
      category: form.category,
      isPublished: form.published,
      isEnabled: form.enabled,
      isActive: form.enabled,
      key: `block-${Date.now()}`,
      orderIndex: items.length,
      name: form.title,
      nameBn: form.title,
      fileUrl: form.body,
      imageUrl: imageOptional ? form.body.trim() || null : form.body,
      coverUrl: form.body,
      videoUrl: form.body,
      url: form.body,
      labelBn: form.title,
      textBn: form.body,
      startsAt: new Date().toISOString(),
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (editing) {
        const value = buildValue();
        // Never overwrite identity/order fields of an existing block on edit.
        delete value.key;
        delete value.orderIndex;
        await apiPatch(`/api/content/${tab}/${editing.id}`, { value }, "সংরক্ষণ করা যায়নি");
        setMessage("হালনাগাদ হয়েছে");
        toast.success("রেকর্ড হালনাগাদ হয়েছে");
      } else {
        await apiPost(`/api/content/${tab}`, { value: buildValue() }, "সংরক্ষণ করা যায়নি");
        setMessage("সংরক্ষণ হয়েছে");
        toast.success("নতুন রেকর্ড সংরক্ষণ হয়েছে");
      }
      setEditing(null);
      setForm({ title: "", body: "", category: "general", published: false, enabled: true });
      await load();
    } catch (error) {
      const text = error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি";
      setMessage(text);
      toast.error(text);
    }
  }

  function startEdit(item: Item) {
    setEditing(item);
    setForm({
      title: itemTitle(item),
      body: String(item.details ?? item.body ?? item.description ?? item.textBn ?? item.url ?? item.fileUrl ?? item.imageUrl ?? item.coverUrl ?? ""),
      category: String(item.category ?? "general"),
      published: Boolean(item.isPublished ?? true),
      enabled: Boolean(item.isEnabled ?? item.isActive ?? true),
    });
    setMessage("");
  }

  async function update(item: Item, value: Record<string, unknown>) {
    try {
      await apiPatch(`/api/content/${tab}/${item.id}`, { value }, "হালনাগাদ করা যায়নি");
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...value } : row)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "হালনাগাদ করা যায়নি");
    }
  }

  async function moveBlock(item: Item, direction: -1 | 1) {
    const index = items.findIndex((row) => row.id === item.id);
    const swapWith = items[index + direction];
    if (!swapWith) return;
    try {
      await apiPatch(`/api/content/${tab}/${item.id}`, {
        value: { orderIndex: Number(swapWith.orderIndex ?? index + direction) },
      });
      await apiPatch(`/api/content/${tab}/${swapWith.id}`, {
        value: { orderIndex: Number(item.orderIndex ?? index) },
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ক্রম বদলানো যায়নি");
    }
  }

  async function createChild(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedParent) return;
    try {
      await apiPost(
        `/api/content/${tab}/${selectedParent.id}/items`,
        {
          value: {
            labelBn: childForm.label,
            titleBn: childForm.label,
            nameBn: childForm.label,
            captionBn: childForm.label,
            // Gallery photos may have no image (Fix 1, Round 7): save
            // null instead of an empty string; menus/service-box links
            // keep their existing url semantics.
            url: tab === "galleries" ? childForm.url.trim() || null : childForm.url,
            imageUrl: tab === "galleries" ? childForm.url.trim() || null : childForm.url,
            orderIndex: children.length,
            isEnabled: true,
            isActive: true,
          },
        },
        "আইটেম যোগ করা যায়নি",
      );
      setChildForm({ label: "", url: "" });
      toast.success("আইটেম যোগ হয়েছে");
      await loadChildren(selectedParent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "আইটেম যোগ করা যায়নি");
    }
  }

  const needsRichText = ["pages", "notices", "news", "events", "quotes", "messages"].includes(tab);
  const isNotice = tab === "notices";

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">ওয়েবসাইট কনটেন্ট</h2>
          <p className="cs">হোমপেজ ব্লক, মেনু, সেবা বক্স, পেজ, বিজ্ঞপ্তি ও অন্যান্য কনটেন্ট — সব পরিবর্তন পাবলিক সাইটে সরাসরি প্রতিফলিত হয়।</p>
        </div>
        <span className="sp" />
        <span className="chip b">{tabs.find(([key]) => key === tab)?.[1]}</span>
      </div>
      <div className="tabs" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {tabs.map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            type="button"
            variant="ghost"
            className={tab === key ? "on" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {!isInbox && (
        <form onSubmit={submit} className="card grid gap-3 md:grid-cols-4">
          <Input className="inp"
            placeholder="শিরোনাম"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
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
          ) : isNotice ? (
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-primary-800">
                বিবরণ
              </label>
              <Textarea className="inp"
                placeholder="বিজ্ঞপ্তির বিস্তারিত বিবরণ লিখুন"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                rows={4}
              />
            </div>
          ) : (
            <Input className="inp"
              placeholder={
                tab === "banners" || tab === "galleries"
                  ? "ছবির URL (ঐচ্ছিক — খালি রাখলেও সংরক্ষণ হবে)"
                  : "বিবরণ/URL"
              }
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          )}
          {uploadKind && (
            <Input className="inp"
              type="file"
              disabled={isUploading}
              accept={uploadKind === "galleryImage" ? "image/jpeg,image/png,image/webp" : undefined}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void startUpload([file]);
              }}
            />
          )}
          <Input className="inp"
            placeholder="বিভাগ"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.published}
              onCheckedChange={(value) => setForm({ ...form, published: value })}
            />{" "}
            প্রকাশিত
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.enabled}
              onCheckedChange={(value) => setForm({ ...form, enabled: value })}
            />{" "}
            চালু
          </label>
          <Button type="submit" className="btn" disabled={isUploading}>
            {editing ? "হালনাগাদ করুন" : "নতুন রেকর্ড"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="btn gho"
              onClick={() => {
                setEditing(null);
                setForm({ title: "", body: "", category: "general", published: false, enabled: true });
              }}
            >
              <X className="ic" data-icon="inline-start" /> সম্পাদনা বাতিল
            </Button>
          )}
          {message && <p className="alert g md:col-span-4">{message}</p>}
        </form>
      )}

      <section className="card flush" style={{ padding: "6px 18px" }}>
        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError ? (
          <div style={{ padding: "14px 0" }}>
            <p className="alert r">{loadError}</p>
            <Button type="button" className="btn gho sm" style={{ marginTop: 10 }} onClick={() => void load()}>
              আবার চেষ্টা করুন
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p style={{ padding: "12px 0" }}>কোনো রেকর্ড নেই।</p>
        ) : (
          items.map((item, index) => {
            const visKey = visibilityKey(item);
            const body = itemBody(item);
            return (
              <div className="listrow" key={item.id}>
                {(tab === "banners" || tab === "galleries") &&
                  (typeof item.imageUrl === "string" && item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={itemTitle(item)}
                      width={64}
                      height={44}
                      unoptimized
                      style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    />
                  ) : (
                    // No image (imageUrl: null) — designed placeholder
                    // panel with the title's initial, never a broken img.
                    <span
                      className="av"
                      aria-hidden
                      style={{ width: 64, height: 44, borderRadius: 8, flexShrink: 0, fontSize: 18 }}
                    >
                      {Array.from(itemTitle(item))[0] ?? "ছ"}
                    </span>
                  ))}
                <span className="grow">
                  <span style={{ display: "block" }}>{itemTitle(item)}</span>
                  {body && (
                    <small className="muted" style={{ display: "block" }}>
                      {body.slice(0, 140)}
                      {body.length > 140 ? "…" : ""}
                    </small>
                  )}
                  {isInbox && (
                    <small className="muted" style={{ display: "block" }}>
                      {String(item.name ?? "")}
                      {item.mobile ? ` · ${String(item.mobile)}` : ""}
                      {item.email ? ` · ${String(item.email)}` : ""}
                    </small>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {tab === "homepageBlocks" && (
                    <>
                      <Button type="button" variant="outline" size="icon" className="ibtn" aria-label="উপরে নিন" disabled={index === 0} onClick={() => void moveBlock(item, -1)}>
                        <ArrowUp className="ic" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="ibtn" aria-label="নিচে নিন" disabled={index === items.length - 1} onClick={() => void moveBlock(item, 1)}>
                        <ArrowDown className="ic" />
                      </Button>
                    </>
                  )}
                  {isInbox ? (
                    <Select className="sel"
                      style={{ width: 170 }}
                      value={String(item.status ?? STATUS_OPTIONS[tab][0][0])}
                      onChange={(event) => void update(item, { status: event.target.value })}
                      aria-label="অবস্থা পরিবর্তন"
                    >
                      {STATUS_OPTIONS[tab].map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  ) : visKey ? (
                    <>
                      <Switch
                        checked={Boolean(item[visKey])}
                        onCheckedChange={(value) => void update(item, { [visKey]: value })}
                      />
                      <Badge variant={item[visKey] ? "success" : "secondary"}>
                        {item[visKey] ? "চালু" : "বন্ধ"}
                      </Badge>
                    </>
                  ) : null}
                  {hasChildren && (
                    <Button type="button" variant="outline" size="sm" className="btn gho sm" onClick={() => void loadChildren(item)}>
                      আইটেম
                    </Button>
                  )}
                  {!isInbox && (
                    <Button type="button" variant="outline" size="sm" className="btn gho sm" onClick={() => startEdit(item)}>
                      <Pencil className="ic" data-icon="inline-start" /> সম্পাদনা
                    </Button>
                  )}
                  <DeleteButton
                    itemLabel={itemTitle(item)}
                    onDelete={() => apiDelete(`/api/content/${tab}/${item.id}`).then(() => undefined)}
                    onDeleted={load}
                  />
                </div>
              </div>
            );
          })
        )}
      </section>

      {hasChildren && selectedParent && (
        <section className="card">
          <div className="chead">
            <div>
              <h3 className="ct">“{itemTitle(selectedParent)}” — আইটেমসমূহ</h3>
              <p className="cs">{tab === "menus" ? "মেনু আইটেম" : tab === "serviceBoxes" ? "সেবা বক্সের লিংক" : "গ্যালারির ছবি"}</p>
            </div>
            <span className="sp" />
            <Button type="button" variant="outline" className="btn gho sm" onClick={() => setSelectedParent(null)}>
              বন্ধ করুন
            </Button>
          </div>
          <form onSubmit={createChild} className="rowflex" style={{ marginBottom: 12 }}>
            <Input className="inp" style={{ flex: 1, minWidth: 180 }} placeholder="লেবেল/শিরোনাম" value={childForm.label} onChange={(e) => setChildForm({ ...childForm, label: e.target.value })} required />
            <Input className="inp" style={{ flex: 1, minWidth: 180 }} placeholder={tab === "galleries" ? "ছবির URL (ঐচ্ছিক)" : "লিংক URL"} value={childForm.url} onChange={(e) => setChildForm({ ...childForm, url: e.target.value })} />
            <Button type="submit" className="btn sm">আইটেম যোগ করুন</Button>
          </form>
          {childrenLoading ? (
            <ListSkeleton rows={3} />
          ) : children.length === 0 ? (
            <p className="admin-empty">কোনো আইটেম নেই।</p>
          ) : (
            children.map((child) => (
              <div className="listrow" key={child.id}>
                {tab === "galleries" &&
                  (typeof (child.imageUrl ?? child.url) === "string" && (child.imageUrl ?? child.url) ? (
                    <Image
                      src={String(child.imageUrl ?? child.url)}
                      alt={String(child.labelBn ?? child.titleBn ?? child.nameBn ?? child.captionBn ?? "গ্যালারির ছবি")}
                      width={56}
                      height={40}
                      unoptimized
                      style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      className="av"
                      aria-hidden
                      style={{ width: 56, height: 40, borderRadius: 8, flexShrink: 0, fontSize: 16 }}
                    >
                      {Array.from(String(child.labelBn ?? child.titleBn ?? child.nameBn ?? child.captionBn ?? "ছ"))[0] ?? "ছ"}
                    </span>
                  ))}
                <span className="grow">
                  {String(child.labelBn ?? child.titleBn ?? child.nameBn ?? child.captionBn ?? child.id)}
                  {child.url || child.imageUrl ? (
                    <small className="muted" style={{ display: "block" }}>{String(child.url ?? child.imageUrl)}</small>
                  ) : null}
                </span>
                <DeleteButton
                  itemLabel={String(child.labelBn ?? child.titleBn ?? child.nameBn ?? child.captionBn ?? "আইটেম")}
                  onDelete={() =>
                    apiDelete(`/api/content/${tab}/${selectedParent.id}/items/${child.id}`).then(() => undefined)
                  }
                  onDeleted={() => loadChildren(selectedParent)}
                />
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
