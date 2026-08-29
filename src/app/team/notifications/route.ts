import { NextResponse, type NextRequest } from "next/server";
import { getTeamSessionData } from "@/lib/repositories/team-repository";
import { TEAM_SESSION_COOKIE, verifyTeamSessionToken } from "@/lib/team-session";

export async function GET(request: NextRequest) {
  const session = await verifyTeamSessionToken(request.cookies.get(TEAM_SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const team = await getTeamSessionData(session);
  if (!team) return new Response("Not found", { status: 404 });
  return NextResponse.json({ notificationVersions: team.notificationVersions }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
