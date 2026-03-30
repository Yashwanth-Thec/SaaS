import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/pending"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("scrub-session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("scrub-session");
    return response;
  }

  // Gate: org must be active before accessing the app
  // (skip for /admin so owner can always reach it)
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    const orgStatus = req.cookies.get("scrub-org-status")?.value;
    // If cookie missing or not active, do a lightweight check via header set at login
    // The actual status is enforced in AppLayout — middleware keeps it fast
    if (orgStatus && orgStatus !== "active") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
  }

  // Attach session info to headers for server components
  const headers = new Headers(req.headers);
  headers.set("x-user-id", session.userId);
  headers.set("x-org-id", session.orgId);
  headers.set("x-user-role", session.role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
