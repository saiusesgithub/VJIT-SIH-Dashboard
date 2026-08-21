import { hackathon, judges, problemStatements, reviewRounds, reviews, rubrics, teams, venues } from "@/data/mock";
import type { Judge, ProblemStatement, Review, ReviewProgress, ReviewRound, Rubric, Team, Venue, VenueProgress } from "@/types/domain";

export interface EvaluationRepository {
  getVenues(): Venue[];
  getVenueById(id: string): Venue | undefined;
  getTeams(): Team[];
  getTeamsByVenue(venueId: string): Team[];
  getTeamById(id: string): Team | undefined;
  getProblemStatement(id: string): ProblemStatement | undefined;
  getJudgeForVenue(venueId: string): Judge | undefined;
  getReviewsForTeam(teamId: string): Review[];
  getReviewRound(id: string): ReviewRound | undefined;
  getRubric(id: string): Rubric | undefined;
  getVenueProgress(venueId: string): VenueProgress | undefined;
  getOverallProgress(): { rounds: ReviewProgress[]; completedReviews: number; totalReviews: number; percentage: number };
}

function progressFor(teamIds: string[], round: ReviewRound): ReviewProgress {
  const matching = reviews.filter((review) => teamIds.includes(review.teamId) && review.roundId === round.id);
  const completed = matching.filter((review) => review.status === "completed").length;
  const inProgress = matching.filter((review) => review.status === "in_progress").length;
  const total = matching.length;
  return {
    round,
    completed,
    inProgress,
    pending: total - completed - inProgress,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export const mockRepository: EvaluationRepository = {
  getVenues: () => venues,
  getVenueById: (id) => venues.find((venue) => venue.id === id),
  getTeams: () => teams,
  getTeamsByVenue: (venueId) => teams.filter((team) => team.venueId === venueId),
  getTeamById: (id) => teams.find((team) => team.id === id || team.code.toLowerCase() === id.toLowerCase()),
  getProblemStatement: (id) => problemStatements.find((statement) => statement.id === id),
  getJudgeForVenue: (venueId) => judges.find((judge) => judge.venueId === venueId),
  getReviewsForTeam: (teamId) => reviews.filter((review) => review.teamId === teamId),
  getReviewRound: (id) => reviewRounds.find((round) => round.id === id),
  getRubric: (id) => rubrics.find((rubric) => rubric.id === id),
  getVenueProgress(venueId) {
    const venue = venues.find((candidate) => candidate.id === venueId);
    if (!venue) return undefined;
    const venueTeams = teams.filter((team) => team.venueId === venueId);
    const rounds = reviewRounds.map((round) => progressFor(venueTeams.map((team) => team.id), round));
    const completedReviews = rounds.reduce((sum, round) => sum + round.completed, 0);
    const totalReviews = venueTeams.length * reviewRounds.length;
    return { venue, teamCount: venueTeams.length, rounds, completedReviews, totalReviews, percentage: Math.round((completedReviews / totalReviews) * 100) };
  },
  getOverallProgress() {
    const rounds = reviewRounds.map((round) => progressFor(teams.map((team) => team.id), round));
    const completedReviews = rounds.reduce((sum, round) => sum + round.completed, 0);
    const totalReviews = teams.length * reviewRounds.length;
    return { rounds, completedReviews, totalReviews, percentage: Math.round((completedReviews / totalReviews) * 100) };
  },
};

export const getVenues = () => mockRepository.getVenues();
export const getVenueById = (id: string) => mockRepository.getVenueById(id);
export const getTeams = () => mockRepository.getTeams();
export const getTeamsByVenue = (venueId: string) => mockRepository.getTeamsByVenue(venueId);
export const getTeamById = (id: string) => mockRepository.getTeamById(id);
export const getJudgeForVenue = (venueId: string) => mockRepository.getJudgeForVenue(venueId);
export const getReviewsForTeam = (teamId: string) => mockRepository.getReviewsForTeam(teamId);
export const getVenueProgress = (venueId: string) => mockRepository.getVenueProgress(venueId);
export const getOverallProgress = () => mockRepository.getOverallProgress();
export const getHackathon = () => hackathon;
