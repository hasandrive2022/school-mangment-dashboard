import { type NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isPublicAuthPage = pathname === "/login" || pathname === "/forgot-password";

  if (pathname === "/login") {
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (isPublicAuthPage) return NextResponse.next();

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookie());
    return res;
  }

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
