import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, CheckCheck, DoorOpen, Layers3, ListChecks, UsersRound } from "lucide-react";
import { TeamList } from "@/components/venues/team-list";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { rangeLabel } from "@/lib/format";
import { getTeamsByVenue, getVenueById, getVenueProgress, getVenues } from "@/lib/mock-repository";

export function generateStaticParams() { return getVenues().map((venue) => ({ venueId: venue.id })); }

export async function generateMetadata({ params }: { params: Promise<{ venueId: string }> }): Promise<Metadata> {
  const venue = getVenueById((await params).venueId);
  return { title: venue?.name ?? "Venue" };
}

export default async function VenuePage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const venue = getVenueById(venueId);
  const progress = getVenueProgress(venueId);
  if (!venue || !progress) notFound();
  const teams = getTeamsByVenue(venue.id);
  const codes = venue.problemStatementIds.map((id) => id.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-medium text-blue-700"><DoorOpen className="size-3.5" /> Venue operations</div><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950">{venue.name}</h1><p className="mt-1 text-sm text-zinc-500">Room {venue.room} · Problem Statements {rangeLabel(codes)}</p></div><div className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 sm:w-48"><div className="mb-2 flex justify-between text-[11px]"><span className="text-zinc-500">Venue completion</span><span className="font-semibold tabular-nums text-zinc-800">{progress.percentage}%</span></div><ProgressBar value={progress.percentage} /></div></div>
      <section className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total teams" value={String(teams.length)} icon={UsersRound} />
        <MetricCard label="Review 1" value={`${progress.rounds[0].completed} / ${teams.length}`} icon={CheckCheck} />
        <MetricCard label="Review 2" value={`${progress.rounds[1].completed} / ${teams.length}`} icon={ListChecks} />
        <MetricCard label="Review 3" value={`${progress.rounds[2].completed} / ${teams.length}`} icon={Layers3} />
        <MetricCard label="Overall" value={`${progress.percentage}%`} detail={`${progress.completedReviews} reviews`} icon={Activity} />
      </section>
      <div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-semibold text-zinc-950">Assigned teams</h2><p className="mt-0.5 text-xs text-zinc-500">Select a team to view its complete evaluation record.</p></div><span className="text-xs tabular-nums text-zinc-400">{teams.length} teams</span></div><TeamList teams={teams} /></div>
    </div>
  );
}
