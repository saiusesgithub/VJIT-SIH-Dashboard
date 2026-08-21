import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";
import { submitReview } from "@/lib/repositories/judge-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 32768) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const session = await verifyJudgeSessionToken(request.cookies.get(JUDGE_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  try {
    const body = await request.json() as { teamId?: unknown; roundId?: unknown; scores?: unknown; remarks?: unknown; improvements?: unknown };
    if (typeof body.teamId !== "string" || typeof body.roundId !== "string" || !Array.isArray(body.scores) || typeof body.remarks !== "string" || typeof body.improvements !== "string") return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
    const scores = body.scores.map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { rubricId?: unknown; score?: unknown };
      return typeof candidate.rubricId === "string" && typeof candidate.score === "number" ? { rubricId: candidate.rubricId, score: candidate.score } : null;
    });
    if (scores.some((score) => !score)) return NextResponse.json({ error: "Invalid score data" }, { status: 400 });
    const result = await submitReview(session, body.teamId, body.roundId, { scores: scores as Array<{ rubricId: string; score: number }>, remarks: body.remarks, improvements: body.improvements });
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : result.code === "locked" ? 409 : 400;
      return NextResponse.json({ error: result.code === "locked" ? "This review has already been submitted." : "Review data is invalid." }, { status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Submission failed. Your review is still saved on this device." }, { status: 500 });
  }
}
