import { CheckCircle2, Clock3 } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Section } from "@/components/ui/section";
import type { ReviewProgress as ReviewProgressType } from "@/types/domain";

export function ReviewProgress({ rounds }: { rounds: ReviewProgressType[] }) {
  return (
    <Section title="Review progress" description="Completion across all 48 registered teams">
      <div className="divide-y divide-zinc-100">
        {rounds.map((item) => (
          <div key={item.round.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[150px_1fr_auto] sm:items-center">
            <div><p className="text-sm font-medium text-zinc-900">Review {item.round.number}</p><p className="text-xs text-zinc-500">{item.round.name}</p></div>
            <div><div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500"><span>{item.completed} completed</span><span>{item.percentage}%</span></div><ProgressBar value={item.percentage} /></div>
            <div className="flex gap-3 text-[11px] text-zinc-500 sm:w-32 sm:justify-end"><span className="flex items-center gap-1"><Clock3 className="size-3 text-amber-500" />{item.inProgress} active</span><span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" />{item.completed}</span></div>
          </div>
        ))}
      </div>
    </Section>
  );
}
