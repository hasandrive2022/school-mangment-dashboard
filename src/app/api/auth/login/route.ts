import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionCookieBase } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "অনুরোধটি সঠিক নয়" }, { status: 400 });
  const value = body as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (!email || !password)
    return NextResponse.json(
      { error: "ইমেইল ও পাসওয়ার্ড দিন" },
      { status: 400 },
    );
  const backendUrl = (
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1"
  ).replace(/\/+$/, "");
  let backendResponse: Response;
  let payload: unknown;
  try {
    backendResponse = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    payload = await backendResponse.json().catch(() => null);
  } catch {
    return NextResponse.json(
      { error: "ব্যাকএন্ডে সংযোগ করা যাচ্ছে না। পরে আবার চেষ্টা করুন।" },
      { status: 502 },
    );
  }
  if (!backendResponse.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? (payload.message as unknown)
        : null;
    return NextResponse.json(
      {
        error:
          typeof message === "string"
            ? message
            : backendResponse.status >= 500
              ? "ব্যাকএন্ড সাময়িকভাবে unavailable।"
            : "ইমেইল বা পাসওয়ার্ড সঠিক নয়",
      },
      { status: backendResponse.status >= 500 ? 502 : backendResponse.status },
    );
  }
  if (!payload || typeof payload !== "object" || !("data" in payload))
    return NextResponse.json({ error: "লগইন সাড়া সঠিক নয়" }, { status: 502 });
  const data = payload.data as { accessToken?: unknown; user?: unknown };
  if (typeof data.accessToken !== "string")
    return NextResponse.json({ error: "লগইন সাড়া সঠিক নয়" }, { status: 502 });
  const response = NextResponse.json({ ok: true, user: data.user });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    data.accessToken,
    sessionCookieBase(),
  );
  return response;
}
