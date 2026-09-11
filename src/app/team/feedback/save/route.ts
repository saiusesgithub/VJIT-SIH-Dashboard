import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { saveTeamFeedback } from "@/lib/repositories/team-repository";
import { requireTeamSession } from "@/lib/require-team-session";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  const session = await requireTeamSession();
  const form = await request.formData();
  const number = (name: string) => Number(form.get(name));
  const result = await saveTeamFeedback(session, {
    preGuidelines: number("preGuidelines"), preCommunication: number("preCommunication"),
    supportCoordination: number("supportCoordination"), supportMentors: number("supportMentors"),
    infraResources: number("infraResources"), infraWorkspace: number("infraWorkspace"),
    evaluationClarity: number("evaluationClarity"), evaluationFairness: number("evaluationFairness"),
    keyLearnings: String(form.get("keyLearnings") ?? ""), overallFeedback: String(form.get("overallFeedback") ?? ""),
  });
  const url = new URL("/team/feedback", request.url);
  url.searchParams.set("status", result.ok ? "saved" : "error");
  if (!result.ok) url.searchParams.set("message", result.error);
  return NextResponse.redirect(url, 303);
}
