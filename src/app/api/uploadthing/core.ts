import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  galleryImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl ?? file.url })),
  schoolBranding: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl ?? file.url })),
  profileImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl ?? file.url })),
  downloadFile: f({
    blob: { maxFileSize: "16MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl ?? file.url })),
  noticeAttachment: f({
    blob: { maxFileSize: "16MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl ?? file.url })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
