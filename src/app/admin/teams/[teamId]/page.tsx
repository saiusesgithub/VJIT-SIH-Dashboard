import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Landmark, MapPin, Shapes, UserRound } from "lucide-react";
import { ReviewCard } from "@/components/teams/review-card";
import { TeamMembersTable } from "@/components/teams/team-members-table";
import { teams } from "@/data/mock";
import { getJudgeForVenue, getReviewsForTeam, getTeamById, getVenueById, mockRepository } from "@/lib/mock-repository";

export function generateStaticParams() { return teams.map((team) => ({ teamId: team.id })); }

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const team = getTeamById((await params).teamId);
  return { title: team ? `${team.code} ${team.name}` : "Team" };
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const team = getTeamById((await params).teamId);
  if (!team) notFound();
  const venue = getVenueById(team.venueId)!;
  const problem = mockRepository.getProblemStatement(team.problemStatementId)!;
  const judge = getJudgeForVenue(venue.id)!;
  const reviews = getReviewsForTeam(team.id);

  return (
    <div className="space-y-6">
      <div><Link href={`/admin/venues/${venue.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"><ArrowLeft className="size-3.5" /> Back to {venue.name}</Link><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-blue-700">{team.code}</span><span className="h-3 w-px bg-zinc-300" /><span className="text-xs text-zinc-500">{problem.code}</span></div><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950">{team.name}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><MapPin className="size-3.5" />{venue.name} · Room {venue.room}</p></div><div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-3"><div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100"><UserRound className="size-4 text-zinc-600" /></div><div><p className="text-[11px] text-zinc-400">Assigned judge</p><p className="text-xs font-semibold text-zinc-800">{judge.name}</p></div></div></div></div>
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="border-b border-zinc-200 px-5 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Official problem statement</p><div className="mt-2 flex items-start gap-3"><span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] font-semibold text-blue-700">{problem.code}</span><div><h2 className="text-base font-semibold text-zinc-950">{problem.title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">{problem.description}</p></div></div></div><dl className="grid divide-y divide-zinc-100 bg-zinc-50/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Landmark className="size-3" /> Organization / Ministry</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{problem.organization}</dd></div><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Shapes className="size-3" /> Theme</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{problem.theme}</dd></div><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Building2 className="size-3" /> Venue</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{venue.name}, {venue.room}</dd></div></dl></section>
      <TeamMembersTable members={team.members} />
      <section><div className="mb-3"><h2 className="text-sm font-semibold text-zinc-950">Evaluation reviews</h2><p className="mt-0.5 text-xs text-zinc-500">Rubric scores, judge feedback, and submission history for all rounds.</p></div><div className="space-y-4">{reviews.map((review) => { const round = mockRepository.getReviewRound(review.roundId)!; const rubric = mockRepository.getRubric(round.rubricId)!; return <ReviewCard key={review.id} review={review} round={round} rubric={rubric} judge={judge} />; })}</div></section>
    </div>
  );
}
