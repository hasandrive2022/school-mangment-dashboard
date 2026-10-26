import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = (
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1"
  ).replace(/\/+$/, "");
  const response = await fetch(`${backendUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
    cache: "no-store",
  });
  return NextResponse.json(
    await response.json().catch(() => ({ error: "সার্ভার সাড়া দেয়নি" })),
    { status: response.status },
  );
}
