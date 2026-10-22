import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "অনুমতি প্রয়োজন" }, { status: 401 });
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api/v1";
  const response = await fetch(`${backendUrl}/auth/change-password`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: await request.text(), cache: "no-store" });
  const payload: unknown = await response.json().catch(() => ({ error: "সার্ভার সাড়া দেয়নি" }));
  return NextResponse.json(payload, { status: response.status });
}
