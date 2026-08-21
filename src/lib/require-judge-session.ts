import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";

export const requireJudgeSession = cache(async () => {
  const token = (await cookies()).get(JUDGE_SESSION_COOKIE)?.value;
  const session = await verifyJudgeSessionToken(token);
  if (!session) redirect("/judge/login");
  return session;
});
