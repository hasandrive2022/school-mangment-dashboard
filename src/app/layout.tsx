import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { Suspense } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { AdminChrome } from "@/components/layout/admin-chrome";
import "./globals.css";
import "./design-admin.css";

const bengaliFont = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bengali-loaded",
});

export const metadata: Metadata = {
  title: {
    default: "প্রশাসন প্যানেল",
    template: "%s · প্রশাসন প্যানেল",
  },
  description: "বিদ্যালয় ব্যবস্থাপনা প্রশাসন ও শিক্ষক প্যানেল",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`h-full antialiased ${bengaliFont.variable}`}>
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <Suspense fallback={<div className="dadmin" aria-hidden="true" />}>
            <AdminChrome>{children}</AdminChrome>
          </Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
