import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ReviewForm } from "@/components/judge/review-form";
import { formatDateTime } from "@/lib/format";
import { getReviewForTeamRound } from "@/lib/repositories/judge-repository";
import { requireJudgeSession } from "@/lib/require-judge-session";

export const metadata: Metadata = { title: "Evaluation form" };

export default async function JudgeReviewPage({ params }: { params: Promise<{ teamId: string; roundId: string }> }) {
  const session = await requireJudgeSession();
  const { teamId, roundId } = await params;
  const data = await getReviewForTeamRound(session, teamId, roundId);
  if (!data) notFound();
  const maximum = data.rubrics.reduce((sum, rubric) => sum + rubric.maxMarks, 0);
  const total = Object.values(data.review.scores).reduce((sum, score) => sum + score, 0);
  return (
    <div className="space-y-5">
      <Link href={`/judge/teams/${data.team.id}`} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"><ArrowLeft className="size-4" /> {data.team.code}</Link>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"><p className="font-mono text-xs font-semibold text-zinc-500">{data.team.code}</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">Review {data.round.number} · {data.round.name}</h1><p className="mt-1 text-sm text-zinc-500">{data.team.name}</p></section>
      {data.review.status === "completed" ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-4" /> Review submitted</p><p className="mt-1 text-xs text-emerald-700">{formatDateTime(data.review.submittedAt)}</p></div>
          <section className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{data.rubrics.map((rubric) => <div key={rubric.id} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-medium text-zinc-900">{rubric.name}</p>{rubric.description ? <p className="mt-1 text-xs text-zinc-500">{rubric.description}</p> : null}</div><p className="shrink-0 text-sm font-semibold tabular-nums">{data.review.scores[rubric.id] ?? 0} <span className="font-normal text-zinc-500">/ {rubric.maxMarks}</span></p></div>)}<div className="flex justify-between bg-zinc-50 p-4 text-sm font-semibold"><span>Total</span><span className="tabular-nums">{total} / {maximum}</span></div></section>
          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"><div><h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Remarks</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{data.review.remarks || "No remarks provided."}</p></div><div className="border-t border-zinc-100 pt-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Improvements / Suggestions</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{data.review.improvements || "No suggestions provided."}</p></div></section>
        </div>
      ) : <ReviewForm judgeId={session.judgeId} team={data.team} round={data.round} rubrics={data.rubrics} initialScores={data.review.scores} initialRemarks={data.review.remarks} initialImprovements={data.review.improvements} />}
    </div>
  );
}
