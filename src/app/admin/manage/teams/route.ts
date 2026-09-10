import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, verifyAdminSessionToken } from "@/lib/admin-auth";
import { createTeam } from "@/lib/repositories/admin-management-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !(await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return new Response("Forbidden", { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) return new Response("Request too large", { status: 413 });

  const form = await request.formData();
  let result: Awaited<ReturnType<typeof createTeam>>;
  try {
    result = await createTeam(Object.fromEntries([...form].map(([key, value]) => [key, String(value)])));
  } catch {
    result = { ok: false, reason: "unavailable" };
  }
  const url = new URL("/admin/manage", request.url);
  url.searchParams.set("team", result.ok ? "created" : result.reason);
  return NextResponse.redirect(url, 303);
}
