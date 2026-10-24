import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

async function forward(
  request: NextRequest,
  resource: string,
  id: string,
  itemId: string,
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json({ error: "অনুমতি প্রয়োজন" }, { status: 401 });
  const base =
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1";
  const response = await fetch(
    `${base}/content/${resource}/${id}/items/${itemId}`,
    {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    },
  );
  return NextResponse.json(
    await response.json().catch(() => ({ error: "সার্ভার সাড়া দেয়নি" })),
    { status: response.status },
  );
}
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ resource: string; id: string; itemId: string }>;
  },
) {
  const p = await context.params;
  return forward(request, p.resource, p.id, p.itemId);
}
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ resource: string; id: string; itemId: string }>;
  },
) {
  const p = await context.params;
  return forward(request, p.resource, p.id, p.itemId);
}
