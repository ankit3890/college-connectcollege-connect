// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  // Log for debugging (remove in production if needed)
  console.log(`[Middleware] Path: ${req.nextUrl.pathname}, Token present: ${!!token}`);

  // Only redirect to login if accessing /profile and no token
  if (!token && req.nextUrl.pathname.startsWith("/profile")) {
    console.log("[Middleware] No token found, redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*"],
};
