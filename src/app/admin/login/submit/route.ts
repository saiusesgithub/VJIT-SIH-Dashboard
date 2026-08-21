import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_SECONDS,
  adminSessionCookieOptions,
  createAdminSessionToken,
  failedLoginDelay,
  isSameOriginRequest,
  sanitizeAdminRedirect,
  validateAdminPin,
} from "@/lib/admin-auth";

function loginRedirect(request: NextRequest, returnTo: string, error: "incorrect" | "unavailable") {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("returnTo", returnTo);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) return new Response("Request too large", { status: 413 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    await failedLoginDelay();
    return loginRedirect(request, "/admin", "incorrect");
  }

  const returnTo = sanitizeAdminRedirect(formData.get("returnTo"));
  const pin = formData.get("pin");
  if (typeof pin !== "string" || !(await validateAdminPin(pin))) {
    await failedLoginDelay();
    return loginRedirect(request, returnTo, "incorrect");
  }

  try {
    const token = await createAdminSessionToken();
    const expires = new Date(Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000);
    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions(expires));
    return response;
  } catch {
    await failedLoginDelay();
    return loginRedirect(request, returnTo, "unavailable");
  }
}
