import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ resource: string; id: string; itemId: string }>;
  },
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json({ error: "অনুমতি প্রয়োজন" }, { status: 401 });
  const p = await context.params;
  const base =
    process.env.BACKEND_API_URL ??
    "https://school-mangment-backend.vercel.app/api/v1";
  const response = await fetch(
    `${base}/content/${p.resource}/${p.id}/items/${p.itemId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    },
  );
  return NextResponse.json(
    await response.json().catch(() => ({ error: "সার্ভার সাড়া দেয়নি" })),
    { status: response.status },
  );
}
