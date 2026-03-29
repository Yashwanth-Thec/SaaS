import { type NextRequest, NextResponse } from "next/server";
import { buildMicrosoftSSOUrl, isMicrosoftConfigured } from "@/lib/integrations/microsoft";

/**
 * GET /api/auth/microsoft
 * Initiates the Microsoft SSO flow.
 * Generates a CSRF nonce, stores it in a short-lived cookie, then
 * redirects to Microsoft's OAuth consent screen.
 */
export async function GET(request: NextRequest) {
  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=microsoft_not_configured", request.url)
    );
  }

  const nonce   = crypto.randomUUID();
  const authUrl = buildMicrosoftSSOUrl(nonce);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ms-oauth-state", nonce, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 10, // 10 minutes
    path:     "/",
  });

  return response;
}
