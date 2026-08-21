import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JudgeShell } from "@/components/judge/judge-shell";
import { JUDGE_SESSION_COOKIE, verifyJudgeSessionToken } from "@/lib/judge-session";
import { getJudgeSessionData } from "@/lib/repositories/judge-repository";

export const dynamic = "force-dynamic";

export default async function ProtectedJudgeLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(JUDGE_SESSION_COOKIE)?.value;
  const session = await verifyJudgeSessionToken(token);
  if (!session) redirect("/judge/login");
  const identity = await getJudgeSessionData(session);
  if (!identity) redirect("/judge/login");
  return <JudgeShell identity={identity}>{children}</JudgeShell>;
}
