import type { Metadata } from "next";
import { GraduationCap, Info } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Secure administrator authentication",
};

export default function LoginPage() {
  return (
    <main className="login-wrap full">
      <div className="login-card">
        <div className="logo">
          <GraduationCap className="ic lg" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--p800)" }}>
            বিদ্যালয় ব্যবস্থাপনা প্যানেল
          </div>
          <div style={{ marginTop: 14, fontSize: 16, fontWeight: 700 }}>
            অ্যাডমিন / শিক্ষক লগিন
          </div>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            এটি অ্যাডমিন ও শিক্ষকদের যৌথ লগিন প্যানেল। ছাত্ররা পোর্টালে শুধু
            রেজিস্ট্রেশন নম্বর দিয়ে ঢোকে — এখানে নয়।
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <LoginForm />
        </div>
        <div className="alert b" style={{ fontSize: 13.5, marginTop: 16 }}>
          <Info className="ic sm" />
          <span>
            ভূমিকা অনুযায়ী মেনু বদলায় — অ্যাডমিন সবকিছু দেখেন, শিক্ষক শুধু
            নিজের হাজিরা, নম্বর, বেতন ও প্রোফাইল দেখেন।
          </span>
        </div>
      </div>
    </main>
  );
}
