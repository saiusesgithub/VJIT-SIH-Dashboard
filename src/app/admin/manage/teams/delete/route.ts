import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, verifySuperAdminSessionToken } from "@/lib/admin-auth";
import { deleteTeam } from "@/lib/repositories/admin-management-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !(await verifySuperAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const result = await deleteTeam({ teamId: String(form.get("teamId") ?? ""), confirmation: String(form.get("confirmation") ?? "") });
  const url = new URL("/admin/manage", request.url);
  url.searchParams.set("delete", result.ok ? "deleted" : result.reason);
  return NextResponse.redirect(url, 303);
}
