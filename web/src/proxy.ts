import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { authProxyDecision } from "@/lib/auth-proxy";

export function proxy(request: NextRequest) {
  const decision = authProxyDecision(
    request.nextUrl.pathname,
    Boolean(getSessionCookie(request)),
  );
  if (decision === "next") return NextResponse.next();
  return NextResponse.redirect(new URL(decision.redirect, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
