import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect all routes under /(app) — the route group that wraps
     * the dashboard. Exclude /auth, /api/auth, and static files.
     */
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
