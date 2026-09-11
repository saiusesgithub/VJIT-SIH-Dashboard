import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, ClipboardCheck, MapPin, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { getJudgeActivityDetail } from "@/lib/repositories/judge-activity-repository";

export async function generateMetadata({ params }: { params: Promise<{ judgeId: string }> }): Promise<Metadata> {
  const data = await getJudgeActivityDetail((await params).judgeId);
  return { title: data ? `${data.judge.name} activity` : "Judge activity" };
}

export default async function JudgeActivityPage({ params }: { params: Promise<{ judgeId: string }> }) {
  const data = await getJudgeActivityDetail((await params).judgeId);
  if (!data) notFound();
  const reviewCount = data.teams.reduce((sum, team) => sum + team.reviews.length, 0);

  return (
    <div className="space-y-6">
      <header><Link href="/admin/judges" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"><ArrowLeft className="size-3.5" /> Back to judges</Link><div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-medium text-blue-700">Submitted review history</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{data.judge.name}</h1><p className="mt-1 text-sm text-zinc-500">{data.judge.designation} · {data.judge.department}{data.judge.phone ? ` · ${data.judge.phone}` : ""}</p></div><dl className="grid grid-cols-2 divide-x divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white text-center"><div className="px-5 py-3"><dt className="text-[11px] text-zinc-500">Teams evaluated</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{data.teams.length}</dd></div><div className="px-5 py-3"><dt className="text-[11px] text-zinc-500">Completed reviews</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{reviewCount}</dd></div></dl></div></header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900"><Building2 className="size-4 text-zinc-500" /> Current room assignments</h2><div className="mt-3 flex flex-wrap gap-2">{data.judge.venueAssignments.length ? data.judge.venueAssignments.map((venue) => <span key={venue.id} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600"><MapPin className="size-3.5 text-zinc-400" />{venue.name} · {venue.room}<span className="text-zinc-400">({venue.role === "EXTERNAL" ? "External" : "Internal"})</span></span>) : <p className="text-xs text-zinc-500">No current room assignment.</p>}</div></section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="border-b border-zinc-200 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900"><ClipboardCheck className="size-4 text-zinc-500" /> Teams evaluated</h2><p className="mt-0.5 text-xs text-zinc-500">Only completed reviews where this judge account is recorded as the evaluator.</p></div><div className="divide-y divide-zinc-100">{data.teams.map((team) => <article key={team.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Link href={`/admin/teams/${team.id}`} className="group inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-700 hover:underline">{team.code}<span className="font-sans text-zinc-900">· {team.name}</span></Link><p className="mt-1 text-xs text-zinc-500">{team.problem.code} · {team.problem.title}</p><p className="mt-1 text-xs text-zinc-400">{team.venue.name} · {team.venue.room}</p></div><Link href={`/admin/teams/${team.id}`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Open team</Link></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{team.reviews.sort((left, right) => left.roundNumber - right.roundNumber).map((review) => <div key={review.id} className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">R{review.roundNumber}</p><p className="mt-1 text-xs font-medium text-zinc-800">{review.roundName}</p><p className="mt-2 text-lg font-semibold tabular-nums text-zinc-950">{review.totalScore}</p><p className="mt-1 text-[11px] text-zinc-500">Submitted {formatDateTime(review.submittedAt ?? undefined)}</p></div>)}</div></article>)}</div>{!data.teams.length ? <div className="p-10 text-center"><UserRound className="mx-auto size-5 text-zinc-300" /><p className="mt-3 text-sm font-medium text-zinc-700">No completed reviews yet</p><p className="mt-1 text-xs text-zinc-500">This judge has not submitted an evaluation from this account.</p></div> : null}</section>
    </div>
  );
}
