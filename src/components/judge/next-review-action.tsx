import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getCurrentJudgeRound } from "@/lib/judge-navigation";
import type { ReviewStatus } from "@/types/domain";

export function NextReviewAction({ teamId, rounds }: { teamId: string; rounds: Array<{ id: string; number: number; name: string; status: ReviewStatus }> }) {
  const round = getCurrentJudgeRound(rounds);
  if (!round) return <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" />{rounds.length ? "All reviews completed" : "No review rounds scheduled yet"}</div>;
  return <section className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-semibold text-zinc-500">{round.status === "in_progress" ? "Current review" : "Next review"}</p><p className="mt-1 text-sm font-medium text-zinc-900">Review {round.number} · {round.name}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Check the team and venue above before proceeding. Opening this team page does not start a review.</p><Link prefetch={false} href={`/judge/teams/${teamId}/reviews/${round.id}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{round.status === "in_progress" ? "Continue" : "Start"} Review {round.number}<ArrowRight className="size-4" /></Link></section>;
}
