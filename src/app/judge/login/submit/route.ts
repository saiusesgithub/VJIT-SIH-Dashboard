import { type NextRequest, NextResponse } from "next/server";
import { failedLoginDelay, isSameOriginRequest } from "@/lib/admin-auth";
import { createJudgeSessionToken, JUDGE_SESSION_COOKIE, JUDGE_SESSION_DURATION_SECONDS, judgeSessionCookieOptions, sanitizeJudgeRedirect } from "@/lib/judge-session";
import { authenticateJudgeByPin } from "@/lib/repositories/judge-repository";

function loginRedirect(request: NextRequest, returnTo: string, error: "incorrect" | "unavailable") {
  const url = new URL("/judge/login", request.url);
  url.searchParams.set("returnTo", returnTo);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return new Response("Request too large", { status: 413 });
  try {
    const formData = await request.formData();
    const returnTo = sanitizeJudgeRedirect(formData.get("returnTo"));
    const pin = formData.get("pin");
    const identity = typeof pin === "string" ? await authenticateJudgeByPin(pin) : null;
    if (!identity) {
      await failedLoginDelay();
      return loginRedirect(request, returnTo, "incorrect");
    }
    const token = await createJudgeSessionToken(identity);
    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    response.cookies.set(JUDGE_SESSION_COOKIE, token, judgeSessionCookieOptions(new Date(Date.now() + JUDGE_SESSION_DURATION_SECONDS * 1000)));
    return response;
  } catch {
    await failedLoginDelay();
    return loginRedirect(request, "/judge", "unavailable");
  }
}
