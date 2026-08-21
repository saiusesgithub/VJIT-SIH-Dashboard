export type ReviewStatus = "completed" | "in_progress" | "pending";

export interface Hackathon {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  venueIds: string[];
}

export interface Venue {
  id: string;
  name: string;
  room: string;
  problemStatementIds: string[];
  judgeId: string;
}

export interface Judge {
  id: string;
  name: string;
  designation: string;
  department: string;
  venueId: string;
  contact?: string;
}

export interface ProblemStatement {
  id: string;
  code: string;
  title: string;
  description: string;
  organization: string;
  theme: string;
}

export interface TeamMember {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  role: string;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  venueId: string;
  problemStatementId: string;
  members: TeamMember[];
}

export interface ReviewRound {
  id: string;
  number: number;
  name: string;
  rubricId: string;
}

export interface RubricCriterion {
  id: string;
  label: string;
  maxScore: number;
}

export interface Rubric {
  id: string;
  name: string;
  criteria: RubricCriterion[];
}

export interface ReviewScore {
  criterionId: string;
  score: number;
}

export interface Review {
  id: string;
  teamId: string;
  roundId: string;
  judgeId: string;
  status: ReviewStatus;
  startedAt?: string;
  submittedAt?: string;
  scores: ReviewScore[];
  remarks?: string;
  improvements?: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  role: "admin" | "judge" | "team";
}

export interface ReviewProgress {
  round: ReviewRound;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
  percentage: number;
}

export interface VenueProgress {
  venue: Venue;
  teamCount: number;
  rounds: ReviewProgress[];
  completedReviews: number;
  totalReviews: number;
  percentage: number;
}

export interface ActiveReview {
  review: Review;
  team: Team;
  venue: Venue;
  round: ReviewRound;
}

export interface TeamListItem {
  team: Team;
  problemStatement: ProblemStatement;
  reviews: Review[];
  latestActivity?: string;
}

export interface AdminShellTeamContext {
  teamId: string;
  teamCode: string;
  teamName: string;
  venue: Venue;
  judge?: Judge;
}

export interface AdminShellData {
  venues: VenueProgress[];
  teamContexts: AdminShellTeamContext[];
}

export interface OverallProgress {
  rounds: ReviewProgress[];
  completedReviews: number;
  totalReviews: number;
  percentage: number;
}

export interface HackathonOverviewData {
  teamCount: number;
  overall: OverallProgress;
  venues: VenueProgress[];
  currentlyReviewing: ActiveReview[];
}

export interface VenuePageData {
  venue: Venue;
  progress: VenueProgress;
  teams: TeamListItem[];
}

export interface TeamReviewDetail {
  review: Review;
  round: ReviewRound;
  rubric: Rubric;
  judge: Judge;
}

export interface TeamPageData {
  team: Team;
  venue: Venue;
  problemStatement: ProblemStatement;
  judge: Judge;
  reviews: TeamReviewDetail[];
}
