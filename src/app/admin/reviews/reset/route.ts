import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, verifyAdminSessionToken } from "@/lib/admin-auth";
import { resetReviewToPending } from "@/lib/repositories/review-admin-repository";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !(await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const reviewId = String(form.get("reviewId") ?? "");
  const teamId = String(form.get("teamId") ?? "");
  const ok = await resetReviewToPending(reviewId);
  const target = /^[a-z0-9-]{1,128}$/i.test(teamId) ? `/admin/teams/${teamId}` : "/admin";
  return NextResponse.redirect(new URL(`${target}?review=${ok ? "reset" : "error"}`, request.url), 303);
}
