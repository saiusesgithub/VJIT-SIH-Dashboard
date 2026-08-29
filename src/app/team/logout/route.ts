import { NextResponse } from "next/server";
import { TEAM_SESSION_COOKIE, teamSessionCookieOptions } from "@/lib/team-session";
export async function POST(request: Request) { const response = NextResponse.redirect(new URL("/team/login", request.url), 303); response.cookies.set(TEAM_SESSION_COOKIE, "", { ...teamSessionCookieOptions(new Date(0)), maxAge: 0 }); response.headers.set("Clear-Site-Data", '"cache"'); return response; }
