import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { JUDGE_SESSION_COOKIE, sanitizeJudgeRedirect, verifyJudgeSessionToken } from "@/lib/judge-session";
import { getJudgeSessionData } from "@/lib/repositories/judge-repository";

export const metadata: Metadata = { title: "Judge access", robots: { index: false, follow: false } };

export default async function JudgeLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const returnTo = sanitizeJudgeRedirect(params.returnTo);
  const token = (await cookies()).get(JUDGE_SESSION_COOKIE)?.value;
  const session = await verifyJudgeSessionToken(token);
  if (session && await getJudgeSessionData(session)) redirect(returnTo);
  const error = params.error === "incorrect" ? "Incorrect PIN. Please try again." : params.error === "unavailable" ? "Judge access is temporarily unavailable." : null;

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
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">Enter your assigned PIN</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">Your PIN opens the teams assigned to your venue.</p>
          <form action="/judge/login/submit" method="post" className="mt-6">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label htmlFor="judge-pin" className="text-xs font-medium text-zinc-700">Judge PIN</label>
            <input id="judge-pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" autoFocus required maxLength={128} className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base tracking-[0.25em] text-zinc-950 outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Enter PIN" aria-describedby={error ? "judge-login-error" : "judge-access-note"} />
            {error ? <p id="judge-login-error" role="alert" className="mt-2.5 text-sm font-medium text-red-600">{error}</p> : null}
            <button type="submit" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2">Continue <ArrowRight className="size-4" /></button>
          </form>
        </section>
        <p id="judge-access-note" className="mt-4 text-center text-xs leading-5 text-zinc-400">Restricted to assigned judges and mentors.</p>
      </div>
    </main>
  );
}
