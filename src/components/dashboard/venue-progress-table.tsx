import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Section } from "@/components/ui/section";
import type { VenueProgress } from "@/types/domain";

export function VenueProgressTable({ venues }: { venues: VenueProgress[] }) {
  return (
    <Section title="Venue progress" description="Review completion by assigned lab">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-2.5 font-medium">Venue</th><th className="px-4 py-2.5 font-medium">Teams</th><th className="px-4 py-2.5 font-medium">Review 1</th><th className="px-4 py-2.5 font-medium">Review 2</th><th className="px-4 py-2.5 font-medium">Review 3</th><th className="px-4 py-2.5 font-medium">Overall</th><th className="w-10 px-4 py-2.5" /></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {venues.map((item) => <tr key={item.venue.id} className="group transition-colors hover:bg-zinc-50/70"><td className="px-5 py-3.5"><p className="font-medium text-zinc-900">{item.venue.name}</p><p className="mt-0.5 text-[11px] text-zinc-500">{item.venue.room}</p></td><td className="px-4 py-3.5 tabular-nums text-zinc-700">{item.teamCount}</td>{item.rounds.map((round) => <td key={round.round.id} className="px-4 py-3.5"><span className="font-medium tabular-nums text-zinc-800">{round.completed}</span><span className="text-zinc-400"> / {round.total}</span></td>)}<td className="px-4 py-3.5"><div className="flex w-28 items-center gap-2"><ProgressBar value={item.percentage} className="flex-1" /><span className="w-7 text-right font-medium tabular-nums text-zinc-700">{item.percentage}%</span></div></td><td className="px-4 py-3.5"><Link href={`/admin/venues/${item.venue.id}`} className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white hover:text-zinc-800" aria-label={`View ${item.venue.name}`}><ArrowUpRight className="size-3.5" /></Link></td></tr>)}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
