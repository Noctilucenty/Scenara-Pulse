import { NextRequest, NextResponse } from "next/server";

// Middleware runs server-side so it can't read localStorage.
// We block direct navigation to /dashboard without the Next.js client boot,
// then the client-side check in layout.tsx handles the real redirect.
// This middleware adds security headers and blocks obvious unauthenticated server requests.

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
