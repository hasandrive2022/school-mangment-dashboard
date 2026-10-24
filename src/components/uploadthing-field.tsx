"use client";

import { useRef, useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { Button } from "@/components/ui/button";

const { useUploadThing } = generateReactHelpers<UploadRouter>();
type Endpoint = keyof UploadRouter;

export function UploadThingField({
  endpoint,
  value,
  onChange,
  label = "ছবি আপলোড করুন",
}: {
  endpoint: Endpoint;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (files) => {
      const url = files[0]?.url ?? "";
      if (!url) {
        setError("আপলোডের পর ছবির ঠিকানা পাওয়া যায়নি।");
        return;
      }
      setError("");
      onChange(url);
    },
    onUploadError: (uploadError) => {
      setError(uploadError.message || "ছবি আপলোড করা যায়নি। JPG, PNG বা WebP ছবি দিন।");
    },
  });

  return (
    <div className="dstack" style={{ gap: 8 }}>
      <div className="rowflex" style={{ gap: 10 }}>
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "আপলোড হচ্ছে…" : fileName || label}
        </Button>
        {value && <span className="hint">আপলোড সম্পন্ন</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setFileName(file.name);
          setError("");
          void startUpload([file]);
        }}
      />
      {error && <p className="hint" style={{ color: "var(--danger, #C62828)" }}>{error}</p>}
    </div>
  );
}
