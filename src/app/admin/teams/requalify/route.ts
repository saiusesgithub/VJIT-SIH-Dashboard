import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, verifySuperAdminSessionToken } from "@/lib/admin-auth";
import { requalifyEliminatedTeam } from "@/lib/repositories/admin-management-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !(await verifySuperAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return new Response("Request too large", { status: 413 });
  const form = await request.formData();
  const teamId = String(form.get("teamId") ?? "");
  const result = await requalifyEliminatedTeam({ teamId, venueId: String(form.get("venueId") ?? "") });
  const target = /^[a-z0-9-]{1,100}$/i.test(teamId) ? `/admin/teams/${teamId}` : "/admin";
  return NextResponse.redirect(new URL(`${target}?requalification=${result.ok ? "restored" : "error"}`, request.url), 303);
}
