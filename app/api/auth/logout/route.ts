import { type NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

async function handleLogout(request: NextRequest) {
  await clearSessionCookie();
  const loginUrl = new URL("/login", request.url).toString();
  // 303 See Other: tells the browser to GET /login regardless of original method
  return new Response(null, {
    status:  303,
    headers: { Location: loginUrl },
  });
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
