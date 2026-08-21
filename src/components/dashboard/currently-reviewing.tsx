import { Radio } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/ui/section";
import type { Review, ReviewRound, Team, Venue } from "@/types/domain";

export interface ActiveReview { review: Review; team: Team; venue: Venue; round: ReviewRound }

export function CurrentlyReviewing({ items }: { items: ActiveReview[] }) {
  return (
    <Section title="Currently reviewing" description="Live evaluation activity" action={<span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> Live</span>}>
      <div className="divide-y divide-zinc-100">
        {items.map(({ review, team, venue, round }, index) => (
          <Link href={`/admin/teams/${team.id}`} key={review.id} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"><Radio className="size-3.5 text-amber-600" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-xs font-semibold text-zinc-900">{team.code}</p><span className="text-zinc-300">·</span><p className="truncate text-xs text-zinc-600">{team.name}</p></div><p className="mt-1 text-[11px] text-zinc-500">{venue.name} · Review {round.number}</p></div>
            <p className="text-right text-[11px] text-zinc-400">Started<br />{index === 0 ? "4" : "8"} minutes ago</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}
