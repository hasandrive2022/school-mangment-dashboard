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
type School = {
  nameBn: string;
  nameEn: string;
  eiin: string;
  foundedYear?: string;
  address: string;
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
    logoUrl: "",
    themeColor: "#0F3151",
  });
  const [message, setMessage] = useState("");
  const { startUpload, isUploading } = useUploadThing("schoolBranding", {
    onClientUploadComplete: (files) =>
      setSchool((current) => ({ ...current, logoUrl: files[0]?.url ?? "" })),
  });
  useEffect(() => {
    void fetch("/api/school-settings")
      .then((r) => r.json())
      .then((p: { data?: School }) => {
        if (p.data) setSchool(p.data);
      });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/school-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(school),
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
                <label>
                  লোগো/সিল আপলোড
                  <Input className="inp"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void startUpload([file]);
                    }}
                  />
                  {school.logoUrl && (
                    <small className="settings-success">
                      UploadThing-এ সংরক্ষিত
                    </small>
                  )}
                </label>
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
                      <span>আ</span>
                    )}
                  </div>
                  <b>{school.nameBn || "বিদ্যালয়ের নাম"}</b>
                  <small>{school.nameEn || "School name"}</small>
                  <span>EIIN {school.eiin || "—"}</span>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="lbl">{label}</span>
      <Input
        className="inp"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
