import Link from "next/link";

export default function NotFound() {
  return (
    <main className="admin-error-page">
      <div className="admin-error-card">
        <div className="admin-error-code">৪০৪</div>
        <p>পৃষ্ঠা পাওয়া যায়নি</p>
        <h1>এই Admin route-টি নেই</h1>
        <Link className="error-button" href="/dashboard">
          ড্যাশবোর্ডে ফিরুন
        </Link>
      </div>
    </main>
  );
}
