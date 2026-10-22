import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  const session = bearerToken
    ? await verifySessionToken(bearerToken)
    : await getSession();

  if (!session) {
    const response = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookie());
    return response;
  }

  return NextResponse.json({ user: session });
}
