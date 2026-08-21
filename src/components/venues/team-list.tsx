import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { mockRepository } from "@/lib/mock-repository";
import type { Team } from "@/types/domain";

export function TeamList({ teams }: { teams: Team[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="hidden grid-cols-[minmax(170px,1.3fr)_minmax(190px,1.5fr)_110px_110px_110px_105px_32px] gap-3 border-b border-zinc-200 bg-zinc-50/80 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 xl:grid"><span>Team</span><span>Problem statement</span><span>Review 1</span><span>Review 2</span><span>Review 3</span><span>Last activity</span><span /></div>
      <div className="divide-y divide-zinc-100">
        {teams.map((team) => {
          const problem = mockRepository.getProblemStatement(team.problemStatementId)!;
          const reviews = mockRepository.getReviewsForTeam(team.id);
          const activity = reviews.flatMap((review) => [review.submittedAt, review.startedAt]).filter((value): value is string => Boolean(value)).sort().at(-1);
          return (
            <Link key={team.id} href={`/admin/teams/${team.id}`} className="group block px-5 py-4 transition-colors duration-150 hover:bg-zinc-50/70">
              <div className="grid gap-4 xl:grid-cols-[minmax(170px,1.3fr)_minmax(190px,1.5fr)_110px_110px_110px_105px_32px] xl:items-center xl:gap-3">
                <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-zinc-500">{team.code}</span><span className="text-sm font-semibold text-zinc-950">{team.name}</span></div><p className="mt-1 text-xs text-zinc-400 xl:hidden">{problem.code} · {problem.title}</p></div>
                <div className="hidden xl:block"><p className="text-xs font-medium text-zinc-800">{problem.code}</p><p className="mt-0.5 truncate text-xs text-zinc-500">{problem.title}</p></div>
                <div className="grid grid-cols-3 gap-2 xl:contents">{reviews.map((review, index) => <div key={review.id}><p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-400 xl:hidden">R{index + 1}</p><StatusBadge status={review.status} compact /></div>)}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Clock3 className="size-3 text-zinc-400" />{activity ? formatTime(activity) : "No activity"}</div>
                <div className="hidden size-7 items-center justify-center rounded-md text-zinc-300 transition-colors group-hover:bg-white group-hover:text-zinc-700 xl:flex"><ArrowUpRight className="size-3.5" /></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
