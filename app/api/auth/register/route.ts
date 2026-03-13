import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  password:z.string().min(8),
  orgName: z.string().min(2),
  domain:  z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, orgName, domain } = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const baseSlug = slugify(orgName);
    let slug = baseSlug;
    let i = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug, domain: domain || null },
      });
      return tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: "owner",
          orgId: org.id,
        },
      });
    });

    const token = await signToken({
      userId: user.id,
      orgId:  user.orgId,
      email:  user.email,
      role:   user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({ ok: true, userId: user.id, orgId: user.orgId }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
