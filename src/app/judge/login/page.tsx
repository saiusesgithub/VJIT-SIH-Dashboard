import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { JUDGE_SESSION_COOKIE, sanitizeJudgeRedirect, verifyJudgeSessionToken } from "@/lib/judge-session";
import { getJudgeSessionData } from "@/lib/repositories/judge-repository";
import { JudgeLoginForm } from "./judge-login-form";

export const metadata: Metadata = { title: "Judge access", robots: { index: false, follow: false } };

export default async function JudgeLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const returnTo = sanitizeJudgeRedirect(params.returnTo);
  const token = (await cookies()).get(JUDGE_SESSION_COOKIE)?.value;
  const session = await verifyJudgeSessionToken(token);
  if (session && await getJudgeSessionData(session)) redirect(returnTo);
  const error = params.error === "incorrect" ? "Incorrect credentials. Please try again." : params.error === "unavailable" ? "Judge access is temporarily unavailable." : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="grid size-10 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2.5" aria-hidden="true"><span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-white" /></div>
          <div><p className="text-sm font-semibold tracking-tight text-zinc-950">VJIT SIH</p><p className="text-xs text-zinc-500">Internal Hackathon</p></div>
        </div>
        <section className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-7">
          <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"><KeyRound className="size-4 text-zinc-600" /></div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Judge access</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">Sign in to review teams</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">Use your assigned phone number and password.</p>
          <JudgeLoginForm returnTo={returnTo} error={error} />
        </section>
        <p id="judge-access-note" className="mt-4 text-center text-xs leading-5 text-zinc-400">Restricted to assigned judges and mentors.</p>
      </div>
    </main>
  );
}
