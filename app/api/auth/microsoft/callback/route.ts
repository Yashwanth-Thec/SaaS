import { type NextRequest, NextResponse } from "next/server";
import {
  exchangeMicrosoftSSOCode,
  getMicrosoftProfile,
} from "@/lib/integrations/microsoft";
import { db } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";

/**
 * GET /api/auth/microsoft/callback
 * Completes the Microsoft SSO flow:
 *   1. Verify CSRF state cookie
 *   2. Exchange code for tokens
 *   3. Fetch user profile from Graph
 *   4. Find existing user by email or microsoftId — or auto-create user + org
 *   5. Set session cookie and redirect to dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base             = new URL(request.url).origin;

  const code     = searchParams.get("code");
  const state    = searchParams.get("state");
  const msError  = searchParams.get("error");

  if (msError || !code || !state) {
    return NextResponse.redirect(
      new URL(`/login?error=${msError ?? "sso_cancelled"}`, base)
    );
  }

  // ── CSRF check ──────────────────────────────────────────────────────────────
  const stateCookie = request.cookies.get("ms-oauth-state")?.value;
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", base));
  }

  try {
    // ── Exchange code for tokens ─────────────────────────────────────────────
    const tokens = await exchangeMicrosoftSSOCode(code);

    // ── Fetch profile ────────────────────────────────────────────────────────
    const profile = await getMicrosoftProfile(tokens.access_token);
    const email   = (profile.mail ?? profile.userPrincipalName).toLowerCase();
    const name    = profile.displayName || email.split("@")[0];

    // ── Find or create user ──────────────────────────────────────────────────
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { microsoftId: profile.id },
        ],
      },
    });

    if (user) {
      // Update microsoftId if it wasn't linked yet
      if (!user.microsoftId) {
        user = await db.user.update({
          where: { id: user.id },
          data:  { microsoftId: profile.id },
        });
      }
    } else {
      // Auto-create org + user from Microsoft profile
      const domain  = email.split("@")[1];
      const orgName = domain.split(".")[0]; // e.g. "acmecorp" from "acmecorp.com"
      const baseSlug = slugify(orgName);
      let   slug     = baseSlug;
      let   i        = 1;
      while (await db.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`;
      }

      user = await db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: orgName, slug, domain },
        });
        return tx.user.create({
          data: {
            name,
            email,
            microsoftId:  profile.id,
            passwordHash: null,
            role:         "owner",
            orgId:        org.id,
          },
        });
      });
    }

    // ── Issue session ────────────────────────────────────────────────────────
    const token = await signToken({
      userId: user.id,
      orgId:  user.orgId,
      email:  user.email,
      role:   user.role,
    });

    await setSessionCookie(token);

    const response = NextResponse.redirect(new URL("/dashboard", base));
    // Clear the CSRF cookie
    response.cookies.delete("ms-oauth-state");
    return response;
  } catch (err) {
    console.error("[auth/microsoft/callback]", err);
    return NextResponse.redirect(new URL("/login?error=sso_failed", base));
  }
}
