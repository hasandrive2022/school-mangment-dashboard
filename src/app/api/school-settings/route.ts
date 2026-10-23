import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

async function forward(request: NextRequest, method: "GET" | "PATCH") {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json({ error: "অনুমতি প্রয়োজন" }, { status: 401 });
  const configuredBackendUrl =
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1";
  const backendUrl = configuredBackendUrl.replace(/\/+$/, "");
  try {
    const response = await fetch(`${backendUrl}/schools/settings`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "PATCH" ? await request.text() : undefined,
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => ({
      error: "ব্যাকএন্ড থেকে সঠিক সাড়া পাওয়া যায়নি",
    }));
    return NextResponse.json(payload, {
      status: response.ok
        ? response.status
        : response.status >= 500
          ? 502
          : response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "ব্যাকএন্ড সংযোগ করা যাচ্ছে না" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}
export async function PATCH(request: NextRequest) {
  return forward(request, "PATCH");
}
