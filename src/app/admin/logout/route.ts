import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });

  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
