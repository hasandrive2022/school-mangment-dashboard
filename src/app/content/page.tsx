/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { bn, bnDate, bnNum } from "@/lib/format";

type Item = Record<string, unknown> & { id: string };
type GalleryItem = { id: string; imageUrl?: string; captionBn?: string };
type ClassOption = { id: string; nameBn: string };
const tabs = [
  ["homepageBlocks", "হোমপেজ ব্লক"],
  ["menus", "মেনু"],
  ["serviceBoxes", "সেবা বক্স"],
  ["pages", "তথ্য পেজ"],
  ["notices", "বিজ্ঞপ্তি"],
  ["news", "খবর"],
  ["events", "ইভেন্ট"],
  ["holidays", "ছুটির তালিকা"],
  ["galleries", "গ্যালারি"],
  ["videos", "ভিডিও গ্যালারি"],
  ["downloads", "ডাউনলোড"],
  ["importantLinks", "গুরুত্বপূর্ণ লিংক"],
  ["quotes", "উক্তি"],
  ["messages", "বাণী"],
  ["committee", "পরিচালনা পরিষদ"],
  ["contactMessages", "যোগাযোগের বার্তা"],
  ["complaints", "অভিযোগ"],
  ["banners", "ব্যানার"],
] as const;
const { useUploadThing } = generateReactHelpers<UploadRouter>();

const emptyForm = {
  title: "",
  body: "",
  category: "general",
  published: false,
  enabled: true,
  role: "",
  photoUrl: "",
  videoUrl: "",
  thumbnailUrl: "",
  fromDate: "",
  toDate: "",
  orderIndex: "",
  audience: "public",
  audienceClass: "",
  slug: "",
  pinned: false,
  publishAt: "",
  expiresAt: "",
  attachmentUrl: "",
};

/** ISO timestamp → value for <input type="datetime-local">. */
function toLocalInput(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** YouTube video id from a watch / share / embed / shorts URL. */
function youtubeId(url: string): string | null {
  const match =
    /[?&]v=([\w-]{6,})/.exec(url) ??
    /youtu\.be\/([\w-]{6,})/.exec(url) ??
    /\/(?:embed|shorts)\/([\w-]{6,})/.exec(url);
  return match ? match[1] : null;
}

/** Inclusive day count between two YYYY-MM-DD dates (matches the backend). */
function dayCount(fromDate: string, toDate: string): number | null {
  const from = Date.parse(fromDate);
  const to = Date.parse(toDate);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86400000) + 1;
}

export default function ContentManagementPage() {
  const [tab, setTab] = useState<string>(tabs[0][0]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [expandedGalleryId, setExpandedGalleryId] = useState<string | null>(null);
  const [albumItemsById, setAlbumItemsById] = useState<
    Record<string, GalleryItem[]>
  >({});
  const uploadKind =
    tab === "galleries" ||
    tab === "banners" ||
    tab === "committee" ||
    tab === "videos"
      ? "galleryImage"
      : tab === "downloads"
        ? "downloadFile"
        : tab === "notices"
          ? "noticeAttachment"
          : null;
  const { startUpload, isUploading } = useUploadThing(
    uploadKind ?? "galleryImage",
    {
      onClientUploadComplete: (files) => {
        const url = files[0]?.url ?? "";
        if (tab === "committee" || tab === "messages")
          setForm((c) => ({ ...c, photoUrl: url }));
        else if (tab === "videos") setForm((c) => ({ ...c, thumbnailUrl: url }));
        else if (tab === "notices")
          setForm((c) => ({ ...c, attachmentUrl: url }));
        else setForm((c) => ({ ...c, body: url }));
      },
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
  useEffect(() => {
    if (tab !== "notices" || classes.length > 0) return;
    void (async () => {
      const payload = (await (
        await fetch("/api/backend/academics/classes")
      ).json()) as { data?: ClassOption[] };
      setClasses(payload.data ?? []);
    })();
  }, [tab]);
  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFileName("");
  }
  /** Value object for the three dedicated managers (committee/videos/holidays). */
  function dedicatedValue(): Record<string, unknown> | null {
    if (tab === "committee")
      return {
        nameBn: form.title,
        roleBn: form.role,
        photoUrl: form.photoUrl || null,
        orderIndex:
          form.orderIndex === "" ? items.length : Number(form.orderIndex),
        isPublished: form.published,
      };
    if (tab === "videos")
      return {
        titleBn: form.title,
        videoUrl: form.videoUrl,
        thumbnailUrl: form.thumbnailUrl || null,
        isPublished: form.published,
        publishedAt: form.published ? new Date().toISOString() : null,
      };
    if (tab === "holidays")
      return {
        titleBn: form.title,
        fromDate: form.fromDate,
        toDate: form.toDate,
        isPublished: form.published,
      };
    if (tab === "messages")
      return {
        personNameBn: form.title,
        designationBn: form.role,
        photoUrl: form.photoUrl || null,
        body: form.body,
        orderIndex: items.length,
        isEnabled: form.enabled,
      };
    return null;
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const dedicated = dedicatedValue();
    if (dedicated && editingId && "orderIndex" in dedicated) {
      // Keep an edited record's existing order unless its form set one.
      const current = items.find((row) => row.id === editingId);
      if (current && typeof current.orderIndex === "number" && tab !== "committee")
        dedicated.orderIndex = current.orderIndex;
    }
    let value: Record<string, unknown>;
    if (dedicated) {
      value = dedicated;
    } else if (editingId) {
      // Edit mode: only write back the keys this row already has, so a
      // title fix never clobbers unrelated columns of the record.
      const item = items.find((row) => row.id === editingId);
      value = {};
      if (item) {
        const titleKeys: Record<string, string> = {
          titleBn: form.title,
          name: form.title,
          labelBn: form.title,
          personNameBn: form.title,
          textBn: form.body,
        };
        for (const [key, val] of Object.entries(titleKeys))
          if (key in item) value[key] = val;
        for (const key of [
          "details",
          "body",
          "fileUrl",
          "imageUrl",
          "coverUrl",
          "url",
        ])
          if (key in item) value[key] = form.body;
        if ("category" in item) value.category = form.category;
        if ("isPublished" in item) value.isPublished = form.published;
        if ("isEnabled" in item) value.isEnabled = form.enabled;
        if ("isActive" in item) value.isActive = form.enabled;
        if (tab === "pages") value.slug = form.slug;
        if (tab === "notices") {
          value.audience = form.audience;
          value.audienceClass = form.audienceClass || null;
          value.isPinned = form.pinned;
          value.attachmentUrl = form.attachmentUrl || null;
          value.publishAt = form.publishAt
            ? new Date(form.publishAt).toISOString()
            : null;
          value.expiresAt = form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : null;
        }
      }
    } else {
      value = {
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
        isActive: form.enabled,
      };
      if (tab === "pages") value.slug = form.slug;
      if (tab === "notices") {
        value.audience = form.audience;
        value.audienceClass = form.audienceClass || null;
        value.isPinned = form.pinned;
        value.attachmentUrl = form.attachmentUrl || null;
        value.publishAt = form.publishAt
          ? new Date(form.publishAt).toISOString()
          : null;
        value.expiresAt = form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null;
      }
    }
    const response = await fetch(
      editingId ? `/api/content/${tab}/${editingId}` : `/api/content/${tab}`,
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      },
    );
    setMessage(response.ok ? "সংরক্ষণ হয়েছে" : "সংরক্ষণ করা যায়নি");
    if (response.ok) {
      resetForm();
      await load();
    }
  }
  function startEdit(item: Item) {
    setEditingId(item.id);
    setMessage("");
    if (tab === "committee") {
      setForm({
        ...emptyForm,
        title: String(item.nameBn ?? ""),
        role: String(item.roleBn ?? ""),
        photoUrl: String(item.photoUrl ?? ""),
        orderIndex:
          typeof item.orderIndex === "number" ? String(item.orderIndex) : "",
        published: Boolean(item.isPublished),
      });
    } else if (tab === "videos") {
      setForm({
        ...emptyForm,
        title: String(item.titleBn ?? ""),
        videoUrl: String(item.videoUrl ?? ""),
        thumbnailUrl: String(item.thumbnailUrl ?? ""),
        published: Boolean(item.isPublished),
      });
    } else if (tab === "holidays") {
      setForm({
        ...emptyForm,
        title: String(item.titleBn ?? ""),
        fromDate: String(item.fromDate ?? "").slice(0, 10),
        toDate: String(item.toDate ?? "").slice(0, 10),
        published: Boolean(item.isPublished),
      });
    } else {
      setForm({
        ...emptyForm,
        slug: String(item.slug ?? ""),
        role: String(item.designationBn ?? ""),
        photoUrl: String(item.photoUrl ?? ""),
        pinned: Boolean(item.isPinned),
        publishAt: toLocalInput(item.publishAt),
        expiresAt: toLocalInput(item.expiresAt),
        title: String(
          item.titleBn ?? item.name ?? item.labelBn ?? item.personNameBn ?? "",
        ),
        body: String(
          item.details ??
            item.body ??
            item.fileUrl ??
            item.imageUrl ??
            item.coverUrl ??
            item.url ??
            item.textBn ??
            "",
        ),
        category: String(item.category ?? "general"),
        published: Boolean(item.isPublished),
        enabled:
          "isEnabled" in item
            ? Boolean(item.isEnabled)
            : "isActive" in item
              ? Boolean(item.isActive)
              : true,
        audience: String(item.audience ?? "public"),
        audienceClass: String(item.audienceClass ?? ""),
        attachmentUrl: String(item.attachmentUrl ?? ""),
      });
    }
  }
  async function remove(item: Item) {
    const label = String(
      item.titleBn ?? item.nameBn ?? item.name ?? item.labelBn ?? "এই রেকর্ডটি",
    );
    if (!window.confirm(`"${label}" মুছে ফেলতে চান?`)) return;
    const response = await fetch(`/api/content/${tab}/${item.id}`, {
      method: "DELETE",
    });
    setMessage(response.ok ? "মুছে ফেলা হয়েছে" : "মুছে ফেলা যায়নি");
    if (response.ok) {
      if (editingId === item.id) resetForm();
      await load();
    }
  }
  async function move(item: Item, direction: -1 | 1) {
    const index = items.findIndex((row) => row.id === item.id);
    const other = items[index + direction];
    if (!other) return;
    const currentOrder =
      typeof item.orderIndex === "number" ? item.orderIndex : index;
    const otherOrder =
      typeof other.orderIndex === "number" ? other.orderIndex : index + direction;
    await update(item, { orderIndex: otherOrder });
    await update(other, { orderIndex: currentOrder });
    await load();
  }
  async function toggleAlbum(item: Item) {
    if (expandedGalleryId === item.id) {
      setExpandedGalleryId(null);
      return;
    }
    setExpandedGalleryId(item.id);
    if (!albumItemsById[item.id]) {
      const payload = (await (
        await fetch(`/api/content/galleries/${item.id}/items`)
      ).json()) as { data?: GalleryItem[] };
      setAlbumItemsById((current) => ({
        ...current,
        [item.id]: payload.data ?? [],
      }));
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
  // ---- Child items (menu items / service-box links / gallery photos) ----
  type ChildItem = Record<string, unknown> & { id: string };
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);
  const [childrenById, setChildrenById] = useState<
    Record<string, ChildItem[]>
  >({});
  const [childForm, setChildForm] = useState({
    label: "",
    href: "",
    caption: "",
    imageUrl: "",
  });
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childFileName, setChildFileName] = useState("");
  const { startUpload: startChildUpload, isUploading: isChildUploading } =
    useUploadThing("galleryImage", {
      onClientUploadComplete: (files) =>
        setChildForm((c) => ({ ...c, imageUrl: files[0]?.url ?? "" })),
    });
  function resetChildForm() {
    setChildForm({ label: "", href: "", caption: "", imageUrl: "" });
    setEditingChildId(null);
    setChildFileName("");
  }
  async function loadChildren(parentId: string) {
    const payload = (await (
      await fetch(`/api/content/${tab}/${parentId}/items`)
    ).json()) as { data?: ChildItem[] };
    setChildrenById((current) => ({
      ...current,
      [parentId]: payload.data ?? [],
    }));
  }
  async function reloadAlbum(item: Item) {
    const payload = (await (
      await fetch(`/api/content/galleries/${item.id}/items`)
    ).json()) as { data?: GalleryItem[] };
    setAlbumItemsById((current) => ({
      ...current,
      [item.id]: payload.data ?? [],
    }));
  }
  function toggleChildren(item: Item) {
    if (expandedParentId === item.id) {
      setExpandedParentId(null);
      return;
    }
    setExpandedParentId(item.id);
    resetChildForm();
    if (!childrenById[item.id]) void loadChildren(item.id);
  }
  async function refreshChildren(parent: Item) {
    if (tab === "galleries") await reloadAlbum(parent);
    else await loadChildren(parent.id);
  }
  async function saveChild(parent: Item, event: React.FormEvent) {
    event.preventDefault();
    const siblings =
      tab === "galleries"
        ? (albumItemsById[parent.id] ?? [])
        : (childrenById[parent.id] ?? []);
    const base: Record<string, unknown> =
      tab === "galleries"
        ? { imageUrl: childForm.imageUrl, captionBn: childForm.caption }
        : { labelBn: childForm.label, href: childForm.href };
    const value = editingChildId
      ? base
      : { ...base, orderIndex: siblings.length };
    const response = await fetch(
      editingChildId
        ? `/api/content/${tab}/${parent.id}/items/${editingChildId}`
        : `/api/content/${tab}/${parent.id}/items`,
      {
        method: editingChildId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      },
    );
    setMessage(response.ok ? "সংরক্ষণ হয়েছে" : "সংরক্ষণ করা যায়নি");
    if (response.ok) {
      resetChildForm();
      await refreshChildren(parent);
    }
  }
  function startEditChild(child: ChildItem) {
    setEditingChildId(child.id);
    setChildForm({
      label: String(child.labelBn ?? ""),
      href: String(child.href ?? ""),
      caption: String(child.captionBn ?? ""),
      imageUrl: String(child.imageUrl ?? ""),
    });
  }
  async function removeChild(parent: Item, child: ChildItem) {
    if (!window.confirm("এই আইটেমটি মুছে ফেলতে চান?")) return;
    const response = await fetch(
      `/api/content/${tab}/${parent.id}/items/${child.id}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      if (editingChildId === child.id) resetChildForm();
      await refreshChildren(parent);
    }
  }
  async function moveChild(
    parent: Item,
    list: ChildItem[],
    child: ChildItem,
    direction: -1 | 1,
  ) {
    const index = list.findIndex((row) => row.id === child.id);
    const other = list[index + direction];
    if (!other) return;
    const currentOrder =
      typeof child.orderIndex === "number" ? child.orderIndex : index;
    const otherOrder =
      typeof other.orderIndex === "number" ? other.orderIndex : index + direction;
    const patch = (id: string, orderIndex: number) =>
      fetch(`/api/content/${tab}/${parent.id}/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: { orderIndex } }),
      });
    await patch(child.id, otherOrder);
    await patch(other.id, currentOrder);
    await refreshChildren(parent);
  }
  const needsRichText = [
    "pages",
    "notices",
    "news",
    "events",
    "quotes",
    "messages",
  ].includes(tab);
  const isDedicated = ["committee", "videos", "holidays"].includes(tab);
  const isInbox = ["contactMessages", "complaints"].includes(tab);
  const titleLabel =
    tab === "committee"
      ? "সদস্যের নাম"
      : tab === "holidays"
        ? "ছুটির নাম"
        : "শিরোনাম";
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
              onClick={() => {
                setTab(key);
                resetForm();
                resetChildForm();
                setExpandedGalleryId(null);
                setExpandedParentId(null);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        {isInbox ? (
          <section className="card">
            <p>
              {tab === "contactMessages"
                ? "পাবলিক সাইটের যোগাযোগ ফর্ম থেকে আসা বার্তা এখানে দেখা যায়। পড়া হলে চিহ্নিত করুন, অপ্রয়োজনীয় হলে মুছে ফেলুন।"
                : "তথ্য অধিকার ও অভিযোগ পেজ থেকে আসা অভিযোগ এখানে দেখা যায়। নিষ্পত্তি হলে সমাধান হয়েছে চিহ্নিত করুন।"}
            </p>
            {message && <p className="alert g">{message}</p>}
          </section>
        ) : (
        <form
          onSubmit={create}
          className="card grid gap-3 md:grid-cols-4"
        >
          <Input className="inp"
            placeholder={titleLabel}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
          {tab === "pages" && (
            <Input className="inp"
              placeholder="স্লাগ (ইংরেজি, যেমন: about)"
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
            />
          )}
          {(tab === "committee" || tab === "messages") && (
            <>
              <Input className="inp"
                placeholder={
                  tab === "messages"
                    ? "পদবি (যেমন: প্রধান শিক্ষক, সভাপতি)"
                    : "পদবি (যেমন: সভাপতি, সদস্য সচিব)"
                }
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
              />
              {tab === "committee" && (
                <Input className="inp"
                  placeholder="ক্রম"
                  type="number"
                  min={0}
                  value={form.orderIndex}
                  onChange={(event) =>
                    setForm({ ...form, orderIndex: event.target.value })
                  }
                />
              )}
            </>
          )}
          {tab === "videos" && (
            <>
              <Input className="inp"
                placeholder="ইউটিউব ভিডিওর লিংক"
                value={form.videoUrl}
                onChange={(event) => {
                  const url = event.target.value;
                  const id = youtubeId(url);
                  setForm({
                    ...form,
                    videoUrl: url,
                    thumbnailUrl: id
                      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                      : form.thumbnailUrl,
                  });
                }}
              />
              {form.thumbnailUrl && (
                <div className="md:col-span-2">
                  <Image
                    src={form.thumbnailUrl}
                    alt="ভিডিওর থাম্বনেইল"
                    width={160}
                    height={90}
                    unoptimized
                    style={{ borderRadius: 8, objectFit: "cover" }}
                  />
                </div>
              )}
            </>
          )}
          {tab === "holidays" && (
            <>
              <label className="text-sm">
                শুরুর তারিখ
                <Input className="inp"
                  type="date"
                  value={form.fromDate}
                  onChange={(event) =>
                    setForm({ ...form, fromDate: event.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                শেষের তারিখ
                <Input className="inp"
                  type="date"
                  value={form.toDate}
                  onChange={(event) =>
                    setForm({ ...form, toDate: event.target.value })
                  }
                />
              </label>
              {form.fromDate && form.toDate && (
                <p className="hint md:col-span-2">
                  মোট {bnNum(dayCount(form.fromDate, form.toDate) ?? 0)} দিনের ছুটি
                  — দিন সংখ্যা নিজে থেকেই হিসাব হয়।
                </p>
              )}
            </>
          )}
          {!isDedicated &&
            (needsRichText ? (
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
              <Input className="inp"
                placeholder="বিবরণ/URL"
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
              />
            ))}
          {uploadKind && (
            <div className="md:col-span-2">
              <label
                className="upbox"
                style={{
                  display: "block",
                  cursor: isUploading ? "wait" : "pointer",
                }}
              >
                {isUploading
                  ? "আপলোড হচ্ছে…"
                  : fileName
                    ? `নির্বাচিত ফাইল: ${fileName}`
                    : tab === "notices"
                      ? "বিজ্ঞপ্তির সংযুক্তি আপলোড করতে এখানে চাপুন"
                      : tab === "committee"
                        ? "সদস্যের ছবি আপলোড করতে এখানে চাপুন"
                        : tab === "messages"
                          ? "বক্তার ছবি আপলোড করতে এখানে চাপুন"
                          : tab === "videos"
                          ? "থাম্বনেইল আপলোড করতে এখানে চাপুন (না দিলে ইউটিউব থেকে আসবে)"
                          : "ফাইল আপলোড করতে এখানে চাপুন"}
                <input
                  type="file"
                  hidden
                  disabled={isUploading}
                  accept={
                    uploadKind === "galleryImage"
                      ? "image/jpeg,image/png,image/webp"
                      : undefined
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setFileName(file.name);
                      void startUpload([file]);
                    }
                  }}
                />
              </label>
              {fileName && !isUploading && (
                <p className="hint">
                  {tab === "committee" || tab === "messages"
                    ? "আপলোড সম্পন্ন — ছবিটি যুক্ত হয়েছে।"
                    : tab === "notices"
                      ? "আপলোড সম্পন্ন — ফাইলটি সংযুক্তি হিসেবে যুক্ত হয়েছে।"
                      : tab === "videos"
                      ? "আপলোড সম্পন্ন — থাম্বনেইল হিসেবে বসে গেছে।"
                      : "আপলোড সম্পন্ন — লিংকটি বিবরণ ঘরে বসে গেছে।"}
                </p>
              )}
            </div>
          )}
          {tab === "notices" && form.attachmentUrl && (
            <p className="hint md:col-span-2">
              সংযুক্তি যুক্ত আছে —{" "}
              <a href={form.attachmentUrl} target="_blank" rel="noreferrer">
                ফাইলটি দেখুন
              </a>{" "}
              <Button
                type="button"
                variant="ghost"
                className="btn gho sm"
                onClick={() => setForm({ ...form, attachmentUrl: "" })}
              >
                সংযুক্তি সরান
              </Button>
            </p>
          )}
          {(tab === "committee" || tab === "messages") && form.photoUrl && (
            <div className="md:col-span-2">
              <Image
                src={form.photoUrl}
                alt="ছবি"
                width={72}
                height={72}
                unoptimized
                style={{ borderRadius: 8, objectFit: "cover" }}
              />
            </div>
          )}
          {!isDedicated && (
            <Input className="inp"
              placeholder="বিভাগ"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
            />
          )}
          {tab === "notices" && (
            <>
              <label className="text-sm">
                কাদের জন্য
                <select
                  className="inp"
                  value={form.audience}
                  onChange={(event) =>
                    setForm({ ...form, audience: event.target.value })
                  }
                >
                  <option value="public">সবার জন্য (পাবলিক)</option>
                  <option value="student">শুধু শিক্ষার্থীদের জন্য</option>
                  <option value="teacher">শুধু শিক্ষকদের জন্য</option>
                </select>
              </label>
              {form.audience !== "teacher" && (
                <label className="text-sm">
                  নির্দিষ্ট শ্রেণি (ঐচ্ছিক)
                  <select
                    className="inp"
                    value={form.audienceClass}
                    onChange={(event) =>
                      setForm({ ...form, audienceClass: event.target.value })
                    }
                  >
                    <option value="">সব শ্রেণি</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.nameBn}>
                        {cls.nameBn}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          {tab === "notices" && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.pinned}
                  onCheckedChange={(value) =>
                    setForm({ ...form, pinned: value })
                  }
                />{" "}
                পিন করুন (সবার উপরে)
              </label>
              <label className="text-sm">
                প্রকাশের সময় (ঐচ্ছিক)
                <Input className="inp"
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(event) =>
                    setForm({ ...form, publishAt: event.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                মেয়াদ শেষ (ঐচ্ছিক)
                <Input className="inp"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    setForm({ ...form, expiresAt: event.target.value })
                  }
                />
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.published}
              onCheckedChange={(value) =>
                setForm({ ...form, published: value, enabled: value })
              }
            />{" "}
            প্রকাশিত
          </label>
          <Button type="submit" className="btn" disabled={isUploading}>
            {editingId ? "সংরক্ষণ করুন" : "নতুন রেকর্ড"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              className="btn gho"
              onClick={resetForm}
            >
              সম্পাদনা বাতিল
            </Button>
          )}
          {message && <p className="alert g md:col-span-4">{message}</p>}
        </form>
        )}
        <section className="card flush" style={{ padding: "6px 18px" }}>
          {items.length === 0 ? (
            <p>কোনো রেকর্ড নেই।</p>
          ) : (
            items.map((item, index) => {
              const embeddedItems =
                tab === "galleries"
                  ? ((item.items as GalleryItem[] | undefined) ?? [])
                  : [];
              const loadedItems = albumItemsById[item.id];
              const albumItems = loadedItems ?? embeddedItems;
              const coverUrl =
                tab === "galleries"
                  ? (embeddedItems[0]?.imageUrl ??
                    loadedItems?.[0]?.imageUrl ??
                    (typeof item.imageUrl === "string" ? item.imageUrl : undefined) ??
                    (typeof item.coverUrl === "string" ? item.coverUrl : undefined) ??
                    (typeof item.photoUrl === "string" ? item.photoUrl : undefined))
                  : undefined;
              const albumCount =
                loadedItems?.length ?? (item.items ? embeddedItems.length : undefined);
              const expanded = expandedGalleryId === item.id;
              const rowTitle = String(
                item.subject ??
                  item.titleBn ??
                  item.nameBn ??
                  item.name ??
                  item.labelBn ??
                  item.key ??
                  item.id,
              );
              const thumbUrl =
                tab === "committee"
                  ? (typeof item.photoUrl === "string" ? item.photoUrl : undefined)
                  : tab === "videos"
                    ? (typeof item.thumbnailUrl === "string"
                        ? item.thumbnailUrl
                        : undefined)
                    : coverUrl;
              const holidayDays =
                tab === "holidays"
                  ? dayCount(String(item.fromDate ?? ""), String(item.toDate ?? ""))
                  : null;
              return (
                <div key={item.id}>
                  <div className="listrow">
                    {(tab === "galleries" || tab === "committee" || tab === "videos") &&
                      (thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={rowTitle}
                          width={56}
                          height={56}
                          unoptimized
                          style={{
                            borderRadius: 8,
                            objectFit: "cover",
                            flex: "0 0 56px",
                          }}
                        />
                      ) : (
                        <span className="av" style={{ flexBasis: 56, width: 56, height: 56 }}>
                          {tab === "videos"
                            ? "ভি"
                            : tab === "committee"
                              ? bn(rowTitle.slice(0, 1))
                              : "গ্যা"}
                        </span>
                      ))}
                    <span className="grow">
                      {rowTitle}
                      {tab === "committee" && typeof item.roleBn === "string" && (
                        <span className="small muted" style={{ display: "block" }}>
                          {item.roleBn}
                        </span>
                      )}
                      {tab === "videos" && item.publishedAt != null && (
                        <span className="small muted" style={{ display: "block" }}>
                          প্রকাশ: {bnDate(String(item.publishedAt))}
                        </span>
                      )}
                      {tab === "holidays" && (
                        <span className="small muted" style={{ display: "block" }}>
                          {bnDate(String(item.fromDate ?? ""))} —{" "}
                          {bnDate(String(item.toDate ?? ""))}
                        </span>
                      )}
                      {isInbox && (
                        <span className="small muted" style={{ display: "block" }}>
                          {String(item.name ?? "")}
                          {typeof item.mobile === "string" && item.mobile
                            ? ` · ${bn(item.mobile)}`
                            : ""}
                          {item.createdAt != null
                            ? ` · ${bnDate(String(item.createdAt))}`
                            : ""}
                        </span>
                      )}
                      {isInbox && (
                        <span className="small" style={{ display: "block" }}>
                          {String(item.message ?? item.description ?? "")}
                        </span>
                      )}
                      {tab === "notices" && typeof item.audience === "string" && item.audience !== "public" && (
                        <span className="small muted" style={{ display: "block" }}>
                          {item.audience === "teacher"
                            ? "শুধু শিক্ষকদের জন্য"
                            : "শুধু শিক্ষার্থীদের জন্য"}
                          {typeof item.audienceClass === "string" && item.audienceClass
                            ? ` · ${item.audienceClass}`
                            : ""}
                        </span>
                      )}
                    </span>
                    {tab === "committee" && typeof item.orderIndex === "number" && (
                      <span className="chip b">ক্রম {bnNum(item.orderIndex + 1)}</span>
                    )}
                    {tab === "holidays" && holidayDays !== null && (
                      <span className="chip b">{bnNum(holidayDays)} দিন</span>
                    )}
                    {tab === "galleries" && albumCount !== undefined && (
                      <span className="chip b">{bnNum(albumCount)}টি ছবি</span>
                    )}
                    {typeof item.orderIndex === "number" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn gho sm"
                          disabled={index === 0}
                          onClick={() => void move(item, -1)}
                        >
                          উপরে
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn gho sm"
                          disabled={index === items.length - 1}
                          onClick={() => void move(item, 1)}
                        >
                          নিচে
                        </Button>
                      </>
                    )}
                    {(tab === "menus" || tab === "serviceBoxes") && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="btn gho sm"
                        onClick={() => toggleChildren(item)}
                      >
                        {expandedParentId === item.id
                          ? "লুকান"
                          : tab === "menus"
                            ? "আইটেমগুলো"
                            : "লিংকগুলো"}
                      </Button>
                    )}
                    {tab === "galleries" && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="btn gho sm"
                        onClick={() => void toggleAlbum(item)}
                      >
                        {expanded ? "ছবি লুকান" : "ছবিগুলো দেখুন"}
                      </Button>
                    )}
                    {!isInbox && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="btn gho sm"
                        onClick={() => startEdit(item)}
                      >
                        সম্পাদনা
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="btn gho sm"
                      onClick={() => void remove(item)}
                    >
                      মুছুন
                    </Button>
                    {isInbox && typeof item.status === "string" && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            item.status === "unread" || item.status === "received"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {tab === "contactMessages"
                            ? item.status === "unread"
                              ? "অপঠিত"
                              : "পঠিত"
                            : item.status === "received"
                              ? "গৃহীত"
                              : "সমাধান হয়েছে"}
                        </Badge>
                        {(item.status === "unread" || item.status === "received") && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn gho sm"
                            onClick={() =>
                              void update(item, {
                                status:
                                  tab === "contactMessages" ? "read" : "resolved",
                              })
                            }
                          >
                            {tab === "contactMessages"
                              ? "পড়া হয়েছে"
                              : "সমাধান হয়েছে"}
                          </Button>
                        )}
                      </div>
                    )}
                    {"isPublished" in item && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(item.isPublished)}
                          onCheckedChange={(value) =>
                            void update(item, { isPublished: value })
                          }
                        />
                        <Badge variant={item.isPublished ? "success" : "secondary"}>
                          {item.isPublished ? "প্রকাশিত" : "অপ্রকাশিত"}
                        </Badge>
                      </div>
                    )}
                    {"isEnabled" in item && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(item.isEnabled)}
                          onCheckedChange={(value) =>
                            void update(item, { isEnabled: value })
                          }
                        />
                        <Badge variant={item.isEnabled ? "success" : "secondary"}>
                          {item.isEnabled ? "চালু" : "বন্ধ"}
                        </Badge>
                      </div>
                    )}
                    {"isActive" in item && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(item.isActive)}
                          onCheckedChange={(value) =>
                            void update(item, { isActive: value })
                          }
                        />
                        <Badge variant={item.isActive ? "success" : "secondary"}>
                          {item.isActive ? "চালু" : "বন্ধ"}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {tab === "galleries" && expanded && (
                    <div style={{ padding: "4px 0 16px" }}>
                      {albumItems.length === 0 ? (
                        <p className="admin-empty">
                          এই অ্যালবামে এখনো কোনো ছবি নেই।
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(110px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {albumItems.map((photo) =>
                            photo.imageUrl ? (
                              <figure key={photo.id} style={{ margin: 0 }}>
                                <Image
                                  src={photo.imageUrl}
                                  alt={photo.captionBn ?? "গ্যালারির ছবি"}
                                  width={160}
                                  height={110}
                                  unoptimized
                                  style={{
                                    width: "100%",
                                    height: 110,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                  }}
                                />
                                {photo.captionBn && (
                                  <figcaption className="small muted">
                                    {photo.captionBn}
                                  </figcaption>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="btn gho sm"
                                    onClick={() =>
                                      startEditChild(photo as ChildItem)
                                    }
                                  >
                                    সম্পাদনা
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="btn gho sm"
                                    onClick={() =>
                                      void removeChild(item, photo as ChildItem)
                                    }
                                  >
                                    মুছুন
                                  </Button>
                                </div>
                              </figure>
                            ) : null,
                          )}
                        </div>
                      )}
                      <form
                        onSubmit={(event) => void saveChild(item, event)}
                        className="grid gap-3 md:grid-cols-4"
                        style={{ paddingTop: 12 }}
                      >
                        <label
                          className="upbox"
                          style={{
                            display: "block",
                            cursor: isChildUploading ? "wait" : "pointer",
                          }}
                        >
                          {isChildUploading
                            ? "আপলোড হচ্ছে…"
                            : childFileName
                              ? `নির্বাচিত ছবি: ${childFileName}`
                              : childForm.imageUrl
                                ? "ছবি আপলোড হয়েছে — বদলাতে চাপুন"
                                : "নতুন ছবি আপলোড করতে এখানে চাপুন"}
                          <input
                            type="file"
                            hidden
                            disabled={isChildUploading}
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                setChildFileName(file.name);
                                void startChildUpload([file]);
                              }
                            }}
                          />
                        </label>
                        <Input className="inp"
                          placeholder="ছবির ক্যাপশন (ঐচ্ছিক)"
                          value={childForm.caption}
                          onChange={(event) =>
                            setChildForm({
                              ...childForm,
                              caption: event.target.value,
                            })
                          }
                        />
                        <Button
                          type="submit"
                          className="btn"
                          disabled={isChildUploading || !childForm.imageUrl}
                        >
                          {editingChildId ? "সংরক্ষণ করুন" : "ছবি যোগ করুন"}
                        </Button>
                        {editingChildId && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn gho"
                            onClick={resetChildForm}
                          >
                            বাতিল
                          </Button>
                        )}
                      </form>
                    </div>
                  )}
                  {(tab === "menus" || tab === "serviceBoxes") &&
                    expandedParentId === item.id && (
                      <div style={{ padding: "4px 0 16px" }}>
                        {(childrenById[item.id] ?? []).length === 0 ? (
                          <p className="admin-empty">
                            {tab === "menus"
                              ? "এই মেনুতে এখনো কোনো আইটেম নেই।"
                              : "এই বাক্সে এখনো কোনো লিংক নেই।"}
                          </p>
                        ) : (
                          (childrenById[item.id] ?? []).map((child, ci, list) => (
                            <div key={child.id} className="listrow">
                              <span className="grow">
                                {String(child.labelBn ?? child.id)}
                                <span
                                  className="small muted"
                                  style={{ display: "block" }}
                                >
                                  {String(child.href ?? "")}
                                </span>
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                className="btn gho sm"
                                disabled={ci === 0}
                                onClick={() => void moveChild(item, list, child, -1)}
                              >
                                উপরে
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="btn gho sm"
                                disabled={ci === list.length - 1}
                                onClick={() => void moveChild(item, list, child, 1)}
                              >
                                নিচে
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="btn gho sm"
                                onClick={() => startEditChild(child)}
                              >
                                সম্পাদনা
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="btn gho sm"
                                onClick={() => void removeChild(item, child)}
                              >
                                মুছুন
                              </Button>
                            </div>
                          ))
                        )}
                        <form
                          onSubmit={(event) => void saveChild(item, event)}
                          className="grid gap-3 md:grid-cols-4"
                          style={{ paddingTop: 10 }}
                        >
                          <Input className="inp"
                            placeholder="লেবেল"
                            value={childForm.label}
                            onChange={(event) =>
                              setChildForm({
                                ...childForm,
                                label: event.target.value,
                              })
                            }
                          />
                          <Input className="inp"
                            placeholder="লিংক (যেমন: /about বা https://…)"
                            value={childForm.href}
                            onChange={(event) =>
                              setChildForm({
                                ...childForm,
                                href: event.target.value,
                              })
                            }
                          />
                          <Button type="submit" className="btn">
                            {editingChildId ? "সংরক্ষণ করুন" : "যোগ করুন"}
                          </Button>
                          {editingChildId && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="btn gho"
                              onClick={resetChildForm}
                            >
                              বাতিল
                            </Button>
                          )}
                        </form>
                      </div>
                    )}
                </div>
              );
            })
          )}
        </section>
    </div>
  );
}
