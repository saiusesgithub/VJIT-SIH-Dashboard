import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { getTeamSessionData } from "@/lib/repositories/team-repository";
import { sanitizeTeamRedirect, TEAM_SESSION_COOKIE, verifyTeamSessionToken } from "@/lib/team-session";

export const metadata: Metadata = { title: "Team access" };
export default async function TeamLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams; const returnTo = sanitizeTeamRedirect(params.returnTo);
  const session = await verifyTeamSessionToken((await cookies()).get(TEAM_SESSION_COOKIE)?.value);
  if (session && await getTeamSessionData(session)) redirect(returnTo);
  const error = params.error === "invalid" ? "Invalid team access code. Please try again." : params.error === "unavailable" ? "Team portal is temporarily unavailable." : null;
  return <main className="grid min-h-dvh place-items-center bg-stone-50 px-4 py-10"><div className="w-full max-w-sm">
    <div className="mb-7 flex items-center justify-center gap-3"><div className="grid size-10 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2.5"><span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-white" /></div><div><p className="text-sm font-semibold">VJIT SIH</p><p className="text-xs text-zinc-500">Internal Hackathon</p></div></div>
    <section className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-7"><div className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"><KeyRound className="size-4 text-zinc-600" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Team Portal</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Enter your team access code</h1><p className="mt-1.5 text-sm leading-6 text-zinc-500">Use the unique code shared with your registered team.</p>
      <form action="/team/login/submit" method="post" className="mt-6"><input type="hidden" name="returnTo" value={returnTo} /><label htmlFor="team-code" className="text-xs font-medium text-zinc-700">Access code</label><input id="team-code" name="code" type="password" autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={32} autoFocus placeholder="DEV-T001" className="mt-2 h-12 w-full rounded-lg border border-zinc-300 px-3 font-mono text-base uppercase tracking-[0.12em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{error ? <p role="alert" className="mt-2.5 text-sm font-medium text-red-600">{error}</p> : null}<button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800">Continue <ArrowRight className="size-4" /></button></form>
    </section><p className="mt-4 text-center text-xs leading-5 text-zinc-400">This code was shared with your registered team.</p>
  </div></main>;
}
