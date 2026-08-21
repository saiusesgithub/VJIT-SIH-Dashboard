import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";
import { startReview } from "@/lib/repositories/judge-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const session = await verifyJudgeSessionToken(request.cookies.get(JUDGE_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  try {
    const body = await request.json() as { teamId?: unknown; roundId?: unknown };
    if (typeof body.teamId !== "string" || typeof body.roundId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const review = await startReview(session, body.teamId, body.roundId);
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ status: review.status, startedAt: review.startedAt?.toISOString() });
  } catch {
    return NextResponse.json({ error: "Unable to start review" }, { status: 500 });
  }
}
