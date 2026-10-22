import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionCookieBase } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "অনুরোধটি সঠিক নয়" }, { status: 400 });
  const value = body as Record<string, unknown>;
  const identifier =
    typeof value.identifier === "string" ? value.identifier.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (!identifier || !password)
    return NextResponse.json(
      { error: "ইউজারনেম ও পাসওয়ার্ড দিন" },
      { status: 400 },
    );
  const backendUrl =
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1";
  const backendResponse = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  });
  const payload: unknown = await backendResponse.json().catch(() => null);
  if (
    !backendResponse.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload)
  )
    return NextResponse.json(
      { error: "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়" },
      { status: 401 },
    );
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
