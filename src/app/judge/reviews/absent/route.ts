import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";
import { markReviewAbsent } from "@/lib/repositories/judge-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifyJudgeSessionToken(request.cookies.get(JUDGE_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  try {
    const body = await request.json() as { teamId?: unknown; roundId?: unknown };
    if (typeof body.teamId !== "string" || typeof body.roundId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const result = await markReviewAbsent(session, body.teamId, body.roundId);
    if (!result.ok) return NextResponse.json({ error: result.code === "not_owner" ? "This review has already been submitted by another judge." : "Unable to mark this review absent." }, { status: result.code === "not_found" ? 404 : 403 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to mark team absent." }, { status: 500 });
  }
}
