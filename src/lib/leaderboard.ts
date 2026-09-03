export interface LeaderboardTeam {
  id: string;
  code: string;
  name: string;
  venue: { id: string; name: string; room: string };
  problem: { id: string; code: string; title: string };
  reviews: Array<{ status: string; scores: number[] }>;
}

export interface LeaderboardEntry extends Omit<LeaderboardTeam, "reviews"> {
  totalScore: number;
  completedReviews: number;
  overallRank: number | null;
  venueRank: number | null;
  problemRank: number | null;
}

// PostgreSQL scores have two decimal places. Rank integer hundredths to avoid
// floating-point artifacts separating otherwise equal totals.
export function calculateLeaderboard(teams: LeaderboardTeam[]): LeaderboardEntry[] {
  const scored = teams.map(({ reviews, ...team }) => {
    const completed = reviews.filter((review) => review.status === "COMPLETED");
    const points = completed.flatMap((review) => review.scores).reduce((total, score) => total + Math.round(score * 100), 0);
    return { ...team, points, completedReviews: completed.length };
  }).sort((a, b) => Number(b.completedReviews > 0) - Number(a.completedReviews > 0) || b.points - a.points || a.code.localeCompare(b.code, "en", { numeric: true }));

  type RankState = { count: number; points: number; rank: number };
  const groups = new Map<string, RankState>();
  function rankFor(group: string, points: number) {
    const previous = groups.get(group);
    const count = (previous?.count ?? 0) + 1;
    const rank = previous?.points === points ? previous.rank : count;
    groups.set(group, { count, points, rank });
    return rank;
  }

  return scored.map(({ points, ...team }) => ({
    ...team,
    totalScore: points / 100,
    overallRank: team.completedReviews ? rankFor("overall", points) : null,
    venueRank: team.completedReviews ? rankFor(`venue:${team.venue.id}`, points) : null,
    problemRank: team.completedReviews ? rankFor(`problem:${team.problem.id}`, points) : null,
  }));
}
