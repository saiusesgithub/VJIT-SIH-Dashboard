import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { JUDGE_SESSION_COOKIE } from "@/lib/judge-session";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  const response = NextResponse.redirect(new URL("/judge/login", request.url), 303);
  response.cookies.set(JUDGE_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/judge", expires: new Date(0), maxAge: 0 });
  return response;
}
