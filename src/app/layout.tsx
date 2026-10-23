import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { AdminChrome } from "@/components/layout/admin-chrome";
import "./globals.css";
import "./design-admin.css";

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
    <html lang="bn" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <AdminChrome>{children}</AdminChrome>
        </AppProviders>
      </body>
    </html>
  );
}
