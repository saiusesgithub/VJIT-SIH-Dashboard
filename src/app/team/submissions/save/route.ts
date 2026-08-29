import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { saveTeamSubmissions, submissionTypes } from "@/lib/repositories/team-repository";
import { TEAM_SESSION_COOKIE, verifyTeamSessionToken } from "@/lib/team-session";
export async function POST(request: NextRequest) { if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 }); const session = await verifyTeamSessionToken(request.cookies.get(TEAM_SESSION_COOKIE)?.value); if (!session) return NextResponse.redirect(new URL("/team/login", request.url), 303); const form = await request.formData(); const values = Object.fromEntries(submissionTypes.map((type) => [type, String(form.get(type) ?? "")])); const result = await saveTeamSubmissions(session, values); return NextResponse.redirect(new URL(`/team/submissions?status=${result.ok ? "saved" : "invalid"}`, request.url), 303); }
