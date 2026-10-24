"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bn } from "@/lib/format";
type School = {
  nameBn: string;
  nameEn: string;
  eiin: string;
  foundedYear?: string;
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  themeColor: string;
};
const { useUploadThing } = generateReactHelpers<UploadRouter>();
export default function SettingsPage() {
  const router = useRouter();
  const [school, setSchool] = useState<School>({
    nameBn: "",
    nameEn: "",
    eiin: "",
    foundedYear: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    themeColor: "#0F3151",
  });
  const [message, setMessage] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const { startUpload, isUploading } = useUploadThing("schoolBranding", {
    onClientUploadComplete: (files) =>
      setSchool((current) => ({ ...current, logoUrl: files[0]?.url ?? "" })),
  });
  useEffect(() => {
    void fetch("/api/school-settings")
      .then((r) => r.json())
      .then((p: { data?: School | { school?: School } }) => {
        if (!p.data) return;
        // The settings endpoint returns { data: { school, settings } };
        // older flat shapes are accepted too.
        const loaded =
          "school" in p.data && p.data.school
            ? p.data.school
            : (p.data as School);
        setSchool((current) => ({ ...current, ...loaded }));
      });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/school-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameBn: school.nameBn,
        nameEn: school.nameEn,
        eiin: school.eiin,
        foundedYear: school.foundedYear || undefined,
        address: school.address,
        phone: school.phone || undefined,
        email: school.email || undefined,
        logoUrl: school.logoUrl || undefined,
        themeColor: school.themeColor,
      }),
    });
    setMessage(
      response.ok ? "সেটিংস সংরক্ষণ করা হয়েছে" : "সংরক্ষণ করা যায়নি",
    );
  }
  return (
    <div className="dstack">
        <Button variant="link" className="btn gho sm" style={{ alignSelf: "flex-start" }} onClick={() => router.push("/dashboard")}>
          ← ড্যাশবোর্ডে ফিরুন
        </Button>
        <div className="admin-page-heading">
          <div>
            <p>প্রতিষ্ঠান পরিচিতি</p>
            <h1>বিদ্যালয়ের সেটিংস</h1>
          </div>
          <Badge variant="success">লাইভ থিম</Badge>
        </div>
        <div className="settings-layout">
          <form onSubmit={save}>
            <Card className="card">
              <CardHeader>
                <CardTitle>বিদ্যালয়ের তথ্য</CardTitle>
                <p>
                  পাবলিক সাইট, header, footer ও print documents-এ ব্যবহৃত হবে।
                </p>
              </CardHeader>
              <CardContent className="settings-form">
                <Field
                  label="বাংলা নাম"
                  value={school.nameBn}
                  onChange={(value) => setSchool({ ...school, nameBn: value })}
                />
                <Field
                  label="ইংরেজি নাম"
                  value={school.nameEn}
                  onChange={(value) => setSchool({ ...school, nameEn: value })}
                />
                <Field
                  label="EIIN"
                  value={school.eiin}
                  onChange={(value) => setSchool({ ...school, eiin: value })}
                />
                <Field
                  label="প্রতিষ্ঠার বছর"
                  value={school.foundedYear ?? ""}
                  onChange={(value) =>
                    setSchool({ ...school, foundedYear: value })
                  }
                />
                <label className="settings-wide">
                  ঠিকানা
                  <Textarea className="inp"
                    value={school.address}
                    onChange={(event) =>
                      setSchool({ ...school, address: event.target.value })
                    }
                  />
                </label>
                <Field
                  label="ফোন"
                  type="tel"
                  value={school.phone ?? ""}
                  onChange={(value) => setSchool({ ...school, phone: value })}
                />
                <Field
                  label="ইমেইল"
                  type="email"
                  value={school.email ?? ""}
                  onChange={(value) => setSchool({ ...school, email: value })}
                />
                <div>
                  <span className="lbl">লোগো/সিল আপলোড</span>
                  <label
                    className="upbox"
                    style={{
                      display: "block",
                      cursor: isUploading ? "wait" : "pointer",
                    }}
                  >
                    {isUploading
                      ? "আপলোড হচ্ছে…"
                      : logoFileName
                        ? `নির্বাচিত ফাইল: ${logoFileName}`
                        : "লোগো আপলোড করতে এখানে চাপুন"}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setLogoFileName(file.name);
                          void startUpload([file]);
                        }
                      }}
                    />
                  </label>
                  {school.logoUrl && (
                    <small className="settings-success">
                      লোগো আপলোড সম্পন্ন — প্রিভিউতে দেখুন
                    </small>
                  )}
                </div>
                <Field
                  label="লোগো URL"
                  value={school.logoUrl ?? ""}
                  onChange={(value) => setSchool({ ...school, logoUrl: value })}
                />
                <label>
                  থিম রং
                  <Input
                    type="color"
                    value={school.themeColor}
                    onChange={(event) =>
                      setSchool({ ...school, themeColor: event.target.value })
                    }
                  />
                </label>
                <Button type="submit" className="btn" disabled={isUploading}>
                  সেটিংস সংরক্ষণ করুন
                </Button>
                {message && (
                  <p className="settings-wide settings-success">{message}</p>
                )}
              </CardContent>
            </Card>
          </form>
          <aside className="settings-aside">
            <Card className="card">
              <CardHeader>
                <CardTitle>ব্র্যান্ড প্রিভিউ</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="theme-preview"
                  style={{ borderTopColor: school.themeColor }}
                >
                  <div className="theme-logo">
                    {school.logoUrl ? (
                      <Image
                        src={school.logoUrl}
                        alt="বিদ্যালয়ের লোগো"
                        width={96}
                        height={96}
                        unoptimized
                      />
                    ) : (
                      <span>{Array.from(school.nameBn || "আ")[0]}</span>
                    )}
                  </div>
                  <b>{school.nameBn || "বিদ্যালয়ের নাম"}</b>
                  <small>{school.nameEn || "বিদ্যালয়ের ইংরেজি নাম"}</small>
                  <span>EIIN {school.eiin ? bn(school.eiin) : "—"}</span>
                  {school.phone && <small>ফোন: {bn(school.phone)}</small>}
                  {school.email && <small>{school.email}</small>}
                </div>
              </CardContent>
            </Card>
            <Card className="card mt-5">
              <CardHeader>
                <CardTitle>হোমপেজ সেটিংস</CardTitle>
              </CardHeader>
              <CardContent className="settings-links">
                <Button
                  variant="outline"
                  onClick={() => router.push("/content")}
                >
                  ব্লক, মেনু ও সার্ভিস বক্স
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admissions")}
                >
                  ভর্তি ফর্মের fields
                </Button>
                <small>পরিবর্তন করলে public portal-এ live প্রতিফলিত হবে।</small>
              </CardContent>
            </Card>
          </aside>
        </div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="lbl">{label}</span>
      <Input
        className="inp"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
