import type { Review, ReviewScore, ReviewStatus } from "@/types/domain";
import { judges } from "./judges";
import { reviewRounds } from "./reviewRounds";
import { rubrics } from "./rubrics";
import { teams } from "./teams";

const completedByVenue: Record<string, [number, number, number]> = {
  "lab-1": [11, 8, 3],
  "lab-2": [10, 7, 2],
  "lab-3": [10, 6, 2],
  "lab-4": [8, 4, 0],
};

function statusFor(teamIndex: number, venueId: string, roundIndex: number): ReviewStatus {
  const completedTarget = completedByVenue[venueId][roundIndex];

  // Keep T001's second review actively underway for the operational view.
  if (venueId === "lab-1" && roundIndex === 1) {
    if (teamIndex === 0 || teamIndex === 9) return "in_progress";
    return teamIndex >= 1 && teamIndex <= completedTarget ? "completed" : "pending";
  }

  if (teamIndex < completedTarget) return "completed";
  if (teamIndex === completedTarget && roundIndex < 2) return "in_progress";
  return "pending";
}

function scoresFor(teamNumber: number, roundIndex: number): ReviewScore[] {
  const rubric = rubrics[roundIndex];

  if (teamNumber === 1 && roundIndex === 0) {
    return [
      { criterionId: "innovation", score: 17 },
      { criterionId: "understanding", score: 18 },
      { criterionId: "feasibility", score: 16 },
      { criterionId: "technical", score: 22 },
      { criterionId: "presentation", score: 13 },
    ];
  }

  return rubric.criteria.map((criterion, criterionIndex) => ({
    criterionId: criterion.id,
    score: Math.max(1, criterion.maxScore - ((teamNumber + criterionIndex + roundIndex) % 4) - 1),
  }));
}

export const reviews: Review[] = teams.flatMap((team) => {
  const venueTeams = teams.filter((candidate) => candidate.venueId === team.venueId);
  const teamIndex = venueTeams.findIndex((candidate) => candidate.id === team.id);
  const teamNumber = Number(team.code.slice(1));
  const judge = judges.find((candidate) => candidate.venueId === team.venueId)!;

  return reviewRounds.map((round, roundIndex) => {
    const status = statusFor(teamIndex, team.venueId, roundIndex);
    const minuteOffset = teamNumber * 3 + roundIndex * 19;
    const startedAt = status === "pending" ? undefined : `2026-08-21T${String(9 + Math.floor(minuteOffset / 60)).padStart(2, "0")}:${String(minuteOffset % 60).padStart(2, "0")}:00+05:30`;
    const submittedAt = status === "completed" ? `2026-08-21T${String(9 + Math.floor((minuteOffset + 22) / 60)).padStart(2, "0")}:${String((minuteOffset + 22) % 60).padStart(2, "0")}:00+05:30` : undefined;

    return {
      id: `${team.id}-${round.id}`,
      teamId: team.id,
      roundId: round.id,
      judgeId: judge.id,
      status,
      startedAt,
      submittedAt,
      scores: status === "completed" ? scoresFor(teamNumber, roundIndex) : [],
      remarks: status === "completed" ? (teamNumber === 1 && roundIndex === 0 ? "Strong understanding of the problem and a promising approach." : "The team demonstrated clear progress and responded well to the review questions.") : undefined,
      improvements: status === "completed" ? (teamNumber === 1 && roundIndex === 0 ? "Validate the solution using a larger dataset and demonstrate the end-to-end workflow in the next review." : "Strengthen validation with measurable outcomes and document the technical decisions before the next review.") : undefined,
    } satisfies Review;
  });
});
