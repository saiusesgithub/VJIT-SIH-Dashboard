import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifyAdminSessionToken(session)) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl, request.method === "GET" || request.method === "HEAD" ? 307 : 303);
  if (session) {
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      expires: new Date(0),
      maxAge: 0,
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
