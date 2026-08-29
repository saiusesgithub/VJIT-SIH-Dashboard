import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getJudgeDashboard } from "@/lib/repositories/judge-repository";
import { requireJudgeSession } from "@/lib/require-judge-session";

export const metadata: Metadata = { title: "Judge teams" };

export default async function JudgeHomePage() {
  const session = await requireJudgeSession();
  const data = await getJudgeDashboard(session);
  if (!data) return null;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Assigned venue</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{data.identity.venueName}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><MapPin className="size-3.5" /> {data.identity.roomNumber} · {data.problemRange}</p></div>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Hackathon live</span>
        </div>
        <p className="mt-4 border-t border-zinc-100 pt-4 text-sm font-medium text-zinc-800">{data.identity.judgeName}</p><p className="mt-0.5 text-xs text-zinc-500">{data.identity.designation} · {data.identity.department}</p>
      </section>

      {data.announcements.length ? <section aria-labelledby="judge-announcements"><h2 id="judge-announcements" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900"><Bell className="size-4 text-zinc-500" /> Announcements</h2><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{data.announcements.map((item) => <article key={item.id} className="p-4"><p className="text-sm font-semibold text-zinc-900">{item.title}</p><p className="mt-1 text-sm leading-6 text-zinc-600">{item.message}</p><p className="mt-2 text-[11px] text-zinc-400">{formatDateTime(item.publishedAt)}</p></article>)}</div></section> : null}

      <section aria-labelledby="round-progress-title"><h2 id="round-progress-title" className="mb-2 text-sm font-semibold text-zinc-900">Review progress</h2><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {data.rounds.map((round) => <div key={round.id} className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-zinc-900">Review {round.number}</p><p className="mt-0.5 text-xs text-zinc-500">{round.completed} / {round.total} completed{round.inProgress ? ` · ${round.inProgress} in progress` : ""}</p></div><span className="text-xs font-semibold tabular-nums text-zinc-600">{round.total ? Math.round(round.completed / round.total * 100) : 0}%</span></div><ProgressBar value={round.total ? round.completed / round.total * 100 : 0} className="mt-3" /></div>)}
      </div></section>

      <section aria-labelledby="teams-title"><div className="mb-2 flex items-center justify-between"><h2 id="teams-title" className="text-sm font-semibold text-zinc-900">Assigned teams</h2><span className="text-xs text-zinc-500">{data.teams.length} teams</span></div><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {data.teams.map((team) => <Link key={team.id} href={`/judge/teams/${team.id}`} className="group block p-4 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs font-semibold text-zinc-700">{team.code}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-zinc-950">{team.name}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{team.problemCode} · {team.problemTitle}</p></div><ArrowRight className="mt-1 size-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600" /></div><div className="mt-3 flex flex-wrap gap-1.5">{team.reviews.map((review) => <div key={review.roundId} className="flex items-center gap-1"><span className="text-[10px] font-semibold text-zinc-400">R{review.roundNumber}</span><StatusBadge status={review.status} compact /></div>)}</div></Link>)}
      </div></section>
    </div>
  );
}
