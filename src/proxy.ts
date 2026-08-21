import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isJudgeRoute = pathname === "/judge" || pathname.startsWith("/judge/");
  const isPublicLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/")
    || pathname === "/judge/login" || pathname.startsWith("/judge/login/");
  if (isPublicLogin) return NextResponse.next();

  const cookieName = isJudgeRoute ? JUDGE_SESSION_COOKIE : ADMIN_SESSION_COOKIE;
  const session = request.cookies.get(cookieName)?.value;
  const valid = isJudgeRoute ? Boolean(await verifyJudgeSessionToken(session)) : await verifyAdminSessionToken(session);
  if (valid) return NextResponse.next();

  const loginUrl = new URL(isJudgeRoute ? "/judge/login" : "/admin/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl, request.method === "GET" || request.method === "HEAD" ? 307 : 303);
  if (session) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: isJudgeRoute ? "/judge" : "/admin",
      expires: new Date(0),
      maxAge: 0,
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/judge/:path*"],
};
