import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Link2, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/format";
import { getJudgeTeamDetails } from "@/lib/repositories/judge-repository";
import { requireJudgeSession } from "@/lib/require-judge-session";

export const metadata: Metadata = { title: "Team review" };

export default async function JudgeTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = await requireJudgeSession();
  const { teamId } = await params;
  const team = await getJudgeTeamDetails(session, teamId);
  if (!team) notFound();
  const nextRound = team.rounds.find((round) => round.status !== "completed");
  return (
    <div className="space-y-5">
      <Link href="/judge" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"><ArrowLeft className="size-4" /> All teams</Link>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs font-semibold text-zinc-700">{team.code}</span><div><h1 className="text-xl font-semibold tracking-tight text-zinc-950">{team.name}</h1><p className="mt-1 text-sm font-medium text-zinc-700">{team.problem.code} · {team.problem.title}</p></div></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-4 text-xs text-zinc-500"><span>{team.problem.organization}</span><span>{team.problem.theme}</span></div></section>
      <details className="group rounded-xl border border-zinc-200 bg-white"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-zinc-800"><span>Official problem statement</span><ChevronDown className="size-4 text-zinc-400 transition-transform group-open:rotate-180" /></summary><p className="border-t border-zinc-100 px-4 py-4 text-sm leading-6 text-zinc-600">{team.problem.description}</p></details>
      <section><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900"><Users className="size-4 text-zinc-500" /> Team members</h2><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{team.members.map((member) => <div key={member.id} className="flex items-start justify-between gap-3 p-3.5"><div><p className="text-sm font-medium text-zinc-900">{member.name}</p><p className="mt-0.5 text-xs text-zinc-500">{member.department} · Year {member.year}</p></div><span className="text-xs text-zinc-500">{member.role}</span></div>)}</div></section>
      {team.submissions.length ? <section><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900"><Link2 className="size-4 text-zinc-500" /> Project links</h2><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{team.submissions.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"><span>{item.label}</span><ExternalLink className="size-4 text-zinc-400" /></a>)}</div></section> : null}
      <section><h2 className="mb-2 text-sm font-semibold text-zinc-900">Evaluation rounds</h2><div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{team.rounds.map((round) => <Link key={round.id} href={`/judge/teams/${team.id}/reviews/${round.id}`} className="flex min-h-16 items-center gap-3 p-4 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-zinc-900">Review {round.number} · {round.name}</p>{round.submittedAt ? <p className="mt-1 text-xs text-zinc-500">Submitted {formatDateTime(round.submittedAt)}</p> : null}</div><StatusBadge status={round.status} compact /><ArrowRight className="size-4 shrink-0 text-zinc-300" /></Link>)}</div></section>
      {nextRound ? <Link href={`/judge/teams/${team.id}/reviews/${nextRound.id}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2">{nextRound.status === "in_progress" ? "Continue" : "Start"} Review {nextRound.number} <ArrowRight className="size-4" /></Link> : <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" /> All reviews completed</div>}
    </div>
  );
}
