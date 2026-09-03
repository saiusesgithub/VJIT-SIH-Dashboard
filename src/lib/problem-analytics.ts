export interface AnalyticsRound { id: string; number: number; name: string; maximum: number }
export interface ProblemPerformanceInput {
  id: string;
  code: string;
  title: string;
  teams: Array<{ reviews: Array<{ roundId: string; status: string; scores: number[] }> }>;
}

export function calculateProblemAnalytics(problems: ProblemPerformanceInput[], rounds: AnalyticsRound[], selectedRoundId?: string) {
  const selected = selectedRoundId ? rounds.filter((round) => round.id === selectedRoundId) : rounds;
  return problems.map((problem) => {
    const totals: number[] = [];
    for (const team of problem.teams) {
      const submitted = selected.map((round) => team.reviews.find((review) => review.roundId === round.id && review.status === "COMPLETED"));
      if (selected.length && submitted.every((review) => review !== undefined)) {
        totals.push(submitted.flatMap((review) => review!.scores).reduce((total, score) => total + Math.round(score * 100), 0));
      }
    }
    const progress = rounds.map((round) => {
      const statuses = problem.teams.map((team) => team.reviews.find((review) => review.roundId === round.id)?.status ?? "PENDING");
      const completed = statuses.filter((status) => status === "COMPLETED").length;
      const inProgress = statuses.filter((status) => status === "IN_PROGRESS").length;
      return { ...round, completed, inProgress, pending: problem.teams.length - completed - inProgress };
    });
    const totalReviews = problem.teams.length * rounds.length;
    const completedReviews = progress.reduce((sum, round) => sum + round.completed, 0);
    return {
      id: problem.id, code: problem.code, title: problem.title, teamCount: problem.teams.length,
      sampleSize: totals.length,
      average: totals.length ? Math.round(totals.reduce((sum, total) => sum + total, 0) / totals.length) / 100 : null,
      highest: totals.length ? Math.max(...totals) / 100 : null,
      lowest: totals.length ? Math.min(...totals) / 100 : null,
      progress, completedReviews, totalReviews,
      completionPercentage: totalReviews ? Math.round(completedReviews / totalReviews * 100) : 0,
    };
  });
}
