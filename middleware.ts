import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "webprint-admin-secret-2024";

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(ADMIN_SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const tokenBytes = new Uint8Array(
      (token.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16))
    );
    return await crypto.subtle.verify("HMAC", key, tokenBytes, encoder.encode("webprint-admin-authenticated"));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";
  const isResetPage = pathname === "/admin/reset-password";

  const sessionCookie = req.cookies.get("admin_session");
  const isAuthenticated = sessionCookie ? await verifyAdminToken(sessionCookie.value) : false;

  // Redirect authenticated users away from login page only
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Allow login and reset-password pages without auth
  if (isLoginPage || isResetPage) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
