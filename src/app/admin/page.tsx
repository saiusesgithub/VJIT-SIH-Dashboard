import type { Metadata } from "next";
import { Activity, CheckCheck, Layers3, ListChecks, UsersRound } from "lucide-react";
import { CurrentlyReviewing, type ActiveReview } from "@/components/dashboard/currently-reviewing";
import { ReviewProgress } from "@/components/dashboard/review-progress";
import { VenueProgressTable } from "@/components/dashboard/venue-progress-table";
import { MetricCard } from "@/components/ui/metric-card";
import { reviews } from "@/data/mock";
import { getOverallProgress, getTeamById, getTeams, getVenueById, getVenueProgress, getVenues, mockRepository } from "@/lib/mock-repository";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  const teams = getTeams();
  const overall = getOverallProgress();
  const venueProgress = getVenues().map((venue) => getVenueProgress(venue.id)!);
  const highlightedActiveIds = new Set(["team-001-review-2", "team-035-review-1"]);
  const activeReviews: ActiveReview[] = reviews.filter((review) => highlightedActiveIds.has(review.id)).map((review) => {
    const team = getTeamById(review.teamId)!;
    return { review, team, venue: getVenueById(team.venueId)!, round: mockRepository.getReviewRound(review.roundId)! };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium text-blue-700">Event operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Hackathon overview</h1><p className="mt-1 text-sm text-zinc-500">A live summary of evaluations across all venues.</p></div><p className="text-xs text-zinc-400">Last refreshed · 10:31 AM</p></div>
      <section className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total teams" value={String(teams.length)} detail="registered" icon={UsersRound} />
        <MetricCard label="Review 1 completed" value={`${overall.rounds[0].completed} / ${teams.length}`} icon={CheckCheck} />
        <MetricCard label="Review 2 completed" value={`${overall.rounds[1].completed} / ${teams.length}`} icon={ListChecks} />
        <MetricCard label="Review 3 completed" value={`${overall.rounds[2].completed} / ${teams.length}`} icon={Layers3} />
        <MetricCard label="Overall progress" value={`${overall.percentage}%`} detail={`${overall.completedReviews} reviews`} icon={Activity} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]"><ReviewProgress rounds={overall.rounds} /><CurrentlyReviewing items={activeReviews} /></div>
      <VenueProgressTable venues={venueProgress} />
    </div>
  );
}
