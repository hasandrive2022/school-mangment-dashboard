import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "প্রশাসন প্যানেল",
    template: "%s · প্রশাসন প্যানেল",
  },
  description: "বিদ্যালয় ব্যবস্থাপনা প্রশাসন ও শিক্ষক প্যানেল",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
