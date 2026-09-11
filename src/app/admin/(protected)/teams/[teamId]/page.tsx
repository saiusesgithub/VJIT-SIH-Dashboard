import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Landmark, MapPin, Shapes, UserRound } from "lucide-react";
import { ReviewCard } from "@/components/teams/review-card";
import { TeamMembersTable } from "@/components/teams/team-members-table";
import { TeamAccessCode } from "@/components/admin/team-access-code";
import { RequalifyTeamControl } from "@/components/admin/requalify-team-control";
import { getTeamPageData } from "@/lib/repositories/evaluation-repository";
import { getTeamShortlisting } from "@/lib/repositories/shortlisting-repository";
import { getRequalificationVenueOptions } from "@/lib/repositories/admin-management-repository";
import { ShortlistingControl } from "@/components/admin/shortlisting-control";
import { ADMIN_SESSION_COOKIE, getAdminSessionRole } from "@/lib/admin-auth";

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const data = await getTeamPageData((await params).teamId);
  return { title: data ? `${data.team.code} ${data.team.name}` : "Team" };
}

export default async function TeamPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ requalification?: string }> }) {
  const data = await getTeamPageData((await params).teamId);
  if (!data) notFound();
  const cookieStore = await cookies();
  const isSuperAdmin = (await getAdminSessionRole(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) === "super_admin";
  const canResetReviews = isSuperAdmin;
  const [shortlisting, requalificationVenues, query] = await Promise.all([getTeamShortlisting(data.team.id), isSuperAdmin && data.finalDecision === "ELIMINATED" ? getRequalificationVenueOptions() : Promise.resolve([]), searchParams]);
  const { team, accessCode, venue, problemStatement: problem, judge, reviews } = data;

  return (
    <div className="space-y-6">
      <div><Link href={`/admin/venues/${venue.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"><ArrowLeft className="size-3.5" /> Back to {venue.name}</Link><div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-blue-700">{team.code}</span><span className="h-3 w-px bg-zinc-300" /><span className="text-xs text-zinc-500">{problem.code}</span></div><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950">{team.name}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><MapPin className="size-3.5" />{venue.name} · Room {venue.room}</p></div><div className="grid gap-2 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-3"><div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100"><UserRound className="size-4 text-zinc-600" /></div><div><p className="text-[11px] text-zinc-400">Assigned judge</p><p className="text-xs font-semibold text-zinc-800">{judge.name}</p></div></div><TeamAccessCode code={accessCode} /></div></div></div>
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="border-b border-zinc-200 px-5 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Official problem statement</p><div className="mt-2 flex items-start gap-3"><span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] font-semibold text-blue-700">{problem.code}</span><div><h2 className="text-base font-semibold text-zinc-950">{problem.title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">{problem.description}</p></div></div></div><dl className="grid divide-y divide-zinc-100 bg-zinc-50/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Landmark className="size-3" /> Organization / Ministry</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{problem.organization}</dd></div><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Shapes className="size-3" /> Theme</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{problem.theme}</dd></div><div className="px-5 py-3.5"><dt className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Building2 className="size-3" /> Venue</dt><dd className="mt-1 text-xs font-medium text-zinc-700">{venue.name}, {venue.room}</dd></div></dl></section>
      <TeamMembersTable members={team.members} />
      {isSuperAdmin && data.finalDecision === "ELIMINATED" ? <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5"><h2 className="text-sm font-semibold text-emerald-950">Restore eliminated team</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-900">Restore this team to active Day 2 participation and move it to an available room. Existing Review 1 marks, remarks, timestamps, and the team ID remain exactly as they are. The new room&apos;s assigned judge can then continue with the next pending review.</p><RequalifyTeamControl teamId={team.id} teamCode={team.code} venues={requalificationVenues} /></section> : null}
      {query.requalification ? <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${query.requalification === "restored" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{query.requalification === "restored" ? "Team restored and assigned to the selected Day 2 room. Existing review data was retained." : "The team could not be restored. Refresh the page and try again."}</p> : null}
      {shortlisting ? <section className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row"><div><h2 className="text-sm font-semibold">Faculty shortlisting decision</h2><p className="mt-1 max-w-md text-xs leading-5 text-zinc-500">Private final decision, separate from evaluation marks. Available once this team completes Review 3. Changes require confirmation.</p></div><ShortlistingControl key={`${team.id}-${shortlisting.revision}`} teamId={team.id} teamCode={team.code} state={shortlisting} /></section> : null}
      <section><div className="mb-3"><h2 className="text-sm font-semibold text-zinc-950">Evaluation reviews</h2><p className="mt-0.5 text-xs text-zinc-500">Rubric scores, judge feedback, and submission history for all rounds.</p></div><div className="space-y-4">{reviews.map(({ review, round, rubric, judge: reviewJudge, completedByJudge }) => <ReviewCard key={review.id} review={review} round={round} rubric={rubric} judge={reviewJudge} completedByJudge={completedByJudge} canReset={canResetReviews} />)}</div></section>
    </div>
  );
}
