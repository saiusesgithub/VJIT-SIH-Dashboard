import { CheckCircle2, Clock3, Eye, EyeOff, MessageSquareText, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/format";
import { getTeamPortalData } from "@/lib/repositories/team-repository";
import { requireTeamSession } from "@/lib/require-team-session";

export default async function TeamReviewsPage() {
  const data = await getTeamPortalData(await requireTeamSession());
  if (!data) return null;
  return <div className="space-y-5">
    <div><p className="text-xs font-semibold text-blue-700">Evaluation</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Reviews & feedback</h1><p className="mt-1 text-sm leading-6 text-zinc-500">Track review activity and read feedback released by faculty. Marks remain private.</p></div>
    <div className="grid gap-4 lg:grid-cols-3">{data.rounds.map((round) => <section key={round.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:border-zinc-300 hover:shadow-sm">
      <div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">R{round.number}</div><div><h2 className="text-sm font-semibold text-zinc-950">Review {round.number}</h2><p className="mt-0.5 text-xs text-zinc-500">{round.name}</p></div></div><StatusBadge status={round.status} compact /></div>
        <div className="mt-4 min-h-10 border-t border-zinc-100 pt-3">{round.completedAt ? <p className="flex items-center gap-1.5 text-xs text-zinc-500"><CheckCircle2 className="size-3.5 text-emerald-600" /> Completed {formatDateTime(round.completedAt)}</p> : round.startedAt ? <p className="flex items-center gap-1.5 text-xs text-amber-700"><Clock3 className="size-3.5" /> Started {formatDateTime(round.startedAt)}</p> : <p className="flex items-center gap-1.5 text-xs text-zinc-400"><Clock3 className="size-3.5" /> Not started yet</p>}</div>
      </div>
      {round.status === "completed" ? round.feedbackVisible && round.feedback ? <div className="space-y-4 border-t border-emerald-100 bg-emerald-50/40 p-4 sm:p-5"><p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Eye className="size-3.5" /> Feedback released</p><div><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><MessageSquareText className="size-3.5" /> Remarks</p><p className="mt-1.5 text-sm leading-6 text-zinc-700">{round.feedback.remarks || "No remarks provided."}</p></div><div><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><Sparkles className="size-3.5" /> Improvements</p><p className="mt-1.5 text-sm leading-6 text-zinc-700">{round.feedback.improvements || "No improvements provided."}</p></div></div> : <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 sm:p-5"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><EyeOff className="size-3.5" /> Feedback not released</p><p className="mt-2 text-sm leading-6 text-zinc-500">Faculty will make the comments visible when this review cycle is ready.</p></div> : null}
    </section>)}</div>
  </div>;
}
