import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, CheckCheck, DoorOpen, Layers3, ListChecks, MapPin, Palette, Phone, UserRound, UsersRound } from "lucide-react";
import { TeamList } from "@/components/venues/team-list";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { rangeLabel } from "@/lib/format";
import { getVenueById, getVenuePageData } from "@/lib/repositories/evaluation-repository";

export async function generateMetadata({ params }: { params: Promise<{ venueId: string }> }): Promise<Metadata> {
  const venue = await getVenueById((await params).venueId);
  return { title: venue?.name ?? "Venue" };
}

export default async function VenuePage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const data = await getVenuePageData(venueId);
  if (!data) notFound();
  const { venue, progress, teams } = data;
  const codes = venue.problemStatementIds.map((id) => id.toUpperCase());
  const allocation = venue.teamCodeRange ?? (codes.length ? rangeLabel(codes) : "Team roster pending");
  const isDay2 = venue.id.startsWith("venue-day2-");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-medium text-blue-700"><DoorOpen className="size-3.5" /> Venue operations</div><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950">{venue.name}</h1><p className="mt-1 text-sm text-zinc-500">Room {venue.room} · {allocation}</p></div><div className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 sm:w-48"><div className="mb-2 flex justify-between text-[11px]"><span className="text-zinc-500">Venue completion</span><span className="font-semibold tabular-nums text-zinc-800">{progress.percentage}%</span></div><ProgressBar value={progress.percentage} /></div></div>
      <section className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total teams" value={String(progress.teamCount)} icon={UsersRound} />
        <MetricCard label="Review 1" value={`${progress.rounds[0]?.completed ?? 0} / ${progress.rounds[0]?.total ?? 0}`} icon={CheckCheck} />
        <MetricCard label="Review 2" value={isDay2 ? `${progress.rounds[1]?.completed ?? 0} / ${progress.rounds[1]?.total ?? 0}` : "—"} detail={isDay2 ? "shortlisted teams" : "Not scheduled"} icon={ListChecks} />
        <MetricCard label="Review 3" value={isDay2 ? `${progress.rounds[2]?.completed ?? 0} / ${progress.rounds[2]?.total ?? 0}` : "—"} detail={isDay2 ? "shortlisted teams" : "Not scheduled"} icon={Layers3} />
        <MetricCard label="Overall" value={`${progress.percentage}%`} detail={`${progress.completedReviews} reviews`} icon={Activity} />
      </section>
      <section className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="border-b border-zinc-200 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Venue assignment</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt className="flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="size-3.5" /> Location</dt><dd className="mt-1 text-sm font-medium text-zinc-900">{venue.location ?? "Not provided"}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-xs text-zinc-500"><UsersRound className="size-3.5" /> Team allocation</dt><dd className="mt-1 text-sm font-medium text-zinc-900">{allocation}{venue.plannedTeamCount != null ? ` · ${venue.plannedTeamCount} teams` : ""}</dd></div>
            <div className="sm:col-span-2"><dt className="flex items-center gap-1.5 text-xs text-zinc-500"><Palette className="size-3.5" /> Theme</dt><dd className="mt-1 text-sm font-medium leading-6 text-zinc-900">{venue.theme ?? "Not assigned"}</dd></div>
          </dl>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Evaluation contacts</p>
          <div className="mt-4 space-y-4">
            {(["external", "internal"] as const).map((role) => {
              const people = venue.judges?.filter((judge) => judge.role === role) ?? [];
              return <div key={role}><p className="text-xs font-medium capitalize text-zinc-500">{role} judge{people.length === 1 ? "" : "s"}</p><div className="mt-1.5 space-y-2">{people.length ? people.map((judge) => <div key={judge.id} className="flex items-start gap-2 text-sm"><UserRound className="mt-0.5 size-3.5 shrink-0 text-zinc-400" /><div><p className="font-medium text-zinc-900">{judge.name}{judge.department && judge.department !== "External" ? ` (${judge.department})` : ""}</p>{judge.contact ? <a href={`tel:${judge.contact}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"><Phone className="size-3" /> {judge.contact}</a> : <p className="mt-0.5 text-xs text-zinc-400">Phone not provided</p>}</div></div>) : <p className="text-sm text-zinc-400">Not assigned</p>}</div></div>;
            })}
            <div><p className="text-xs font-medium text-zinc-500">Faculty coordinator{venue.facultyCoordinators?.length === 1 ? "" : "s"}</p><div className="mt-1.5 space-y-2">{venue.facultyCoordinators?.map((person) => <div key={person.id} className="flex items-start gap-2 text-sm"><UserRound className="mt-0.5 size-3.5 shrink-0 text-zinc-400" /><div><p className="font-medium text-zinc-900">{person.name}{person.department ? ` (${person.department})` : ""}</p>{person.contact ? <a href={`tel:${person.contact}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"><Phone className="size-3" /> {person.contact}</a> : <p className="mt-0.5 text-xs text-zinc-400">Phone not provided</p>}</div></div>)}</div></div>
          </div>
        </div>
      </section>
      <div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-semibold text-zinc-950">Assigned teams</h2><p className="mt-0.5 text-xs text-zinc-500">Select a team to view its complete evaluation record.</p></div><span className="text-xs tabular-nums text-zinc-400">{teams.length} teams</span></div><TeamList teams={teams} /></div>
    </div>
  );
}
