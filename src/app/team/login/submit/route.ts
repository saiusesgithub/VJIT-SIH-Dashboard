import { type NextRequest, NextResponse } from "next/server";
import { failedLoginDelay, isSameOriginRequest } from "@/lib/admin-auth";
import { authenticateTeamByAccessCode } from "@/lib/repositories/team-repository";
import { createTeamSessionToken, sanitizeTeamRedirect, TEAM_SESSION_COOKIE, TEAM_SESSION_DURATION_SECONDS, teamSessionCookieOptions } from "@/lib/team-session";

function failure(request: NextRequest, returnTo: string, error: "invalid" | "unavailable") { const url = new URL("/team/login", request.url); url.searchParams.set("returnTo", returnTo); url.searchParams.set("error", error); return NextResponse.redirect(url, 303); }
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return new Response("Request too large", { status: 413 });
  try { const form = await request.formData(); const returnTo = sanitizeTeamRedirect(form.get("returnTo")); const code = form.get("code"); const team = typeof code === "string" ? await authenticateTeamByAccessCode(code) : null; if (!team) { await failedLoginDelay(); return failure(request, returnTo, "invalid"); } const token = await createTeamSessionToken(team.id); const response = NextResponse.redirect(new URL(returnTo, request.url), 303); response.cookies.set(TEAM_SESSION_COOKIE, token, teamSessionCookieOptions(new Date(Date.now() + TEAM_SESSION_DURATION_SECONDS * 1000))); return response; } catch { await failedLoginDelay(); return failure(request, "/team", "unavailable"); }
}
