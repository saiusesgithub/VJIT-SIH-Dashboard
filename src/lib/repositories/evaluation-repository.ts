import "server-only";
import type {
  Judge as DbJudge,
  ProblemStatement as DbProblemStatement,
  Review as DbReview,
  ReviewRound as DbReviewRound,
  Team as DbTeam,
  TeamMember as DbTeamMember,
  Venue as DbVenue,
} from "@/generated/prisma/client";
import { ReviewStatus as DbReviewStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type {
  ActiveReview,
  AdminShellData,
  Hackathon,
  HackathonOverviewData,
  Judge,
  OverallProgress,
  ProblemStatement,
  Review,
  ReviewProgress,
  ReviewRound,
  ReviewStatus,
  Rubric,
  Team,
  TeamListItem,
  TeamMember,
  TeamPageData,
  Venue,
  VenuePageData,
  VenueProgress,
} from "@/types/domain";

type VenueRecord = DbVenue & {
  problemStatements: Array<{ id: string }>;
  judgeAssignments: Array<{ judge: DbJudge }>;
};

type TeamRecord = DbTeam & { members: DbTeamMember[] };
type ReviewRecord = DbReview & { scores?: Array<{ rubricId: string; score: { toNumber(): number } }> };
type ProgressTeam = { id: string; venueId: string; reviews: Array<{ reviewRoundId: string; status: DbReviewStatus }> };

const statusMap: Record<DbReviewStatus, ReviewStatus> = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

function isSafeLookupId(value: string) {
  return /^[a-z0-9-]{1,64}$/i.test(value);
}

function mapJudge(record: DbJudge, venueId: string): Judge {
  return {
    id: record.id,
    name: record.name,
    designation: record.designation,
    department: record.department,
    venueId,
    contact: record.phone ?? record.email ?? undefined,
  };
}

function unassignedJudge(venueId: string): Judge {
  return { id: "unassigned", name: "Unassigned", designation: "Awaiting assignment", department: "—", venueId };
}

function mapVenue(record: VenueRecord): Venue {
  return {
    id: record.id,
    name: record.name,
    room: record.roomNumber,
    problemStatementIds: record.problemStatements.map((statement) => statement.id),
    judgeId: record.judgeAssignments[0]?.judge.id ?? "",
  };
}

function mapProblemStatement(record: DbProblemStatement): ProblemStatement {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    description: record.description,
    organization: record.organization ?? "—",
    theme: record.theme ?? record.category ?? "—",
  };
}

function mapMember(record: DbTeamMember): TeamMember {
  return {
    id: record.id,
    name: record.name,
    rollNumber: record.rollNumber,
    department: record.department,
    year: record.year,
    role: record.role ?? "Member",
  };
}

function mapTeam(record: TeamRecord): Team {
  return {
    id: record.id,
    code: record.teamCode,
    name: record.teamName,
    venueId: record.venueId,
    problemStatementId: record.problemStatementId,
    members: record.members.map(mapMember),
  };
}

function mapRound(record: DbReviewRound): ReviewRound {
  return {
    id: record.id,
    number: record.roundNumber,
    name: record.name,
    rubricId: `rubric-${record.id}`,
  };
}

function mapReview(record: ReviewRecord): Review {
  return {
    id: record.id,
    teamId: record.teamId,
    roundId: record.reviewRoundId,
    judgeId: record.judgeId ?? "",
    status: statusMap[record.status],
    startedAt: record.startedAt?.toISOString(),
    submittedAt: record.submittedAt?.toISOString(),
    scores: (record.scores ?? []).map((score) => ({ criterionId: score.rubricId, score: score.score.toNumber() })),
    remarks: record.generalRemarks ?? undefined,
    improvements: record.improvements ?? undefined,
  };
}

function calculateRoundProgress(round: ReviewRound, teams: ProgressTeam[]): ReviewProgress {
  const matching = teams.flatMap((team) => team.reviews.filter((review) => review.reviewRoundId === round.id));
  const completed = matching.filter((review) => review.status === DbReviewStatus.COMPLETED).length;
  const inProgress = matching.filter((review) => review.status === DbReviewStatus.IN_PROGRESS).length;
  const total = teams.length;
  return {
    round,
    completed,
    inProgress,
    pending: Math.max(0, total - completed - inProgress),
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

function calculateOverall(rounds: ReviewRound[], teams: ProgressTeam[]): OverallProgress {
  const progress = rounds.map((round) => calculateRoundProgress(round, teams));
  const completedReviews = progress.reduce((sum, round) => sum + round.completed, 0);
  const totalReviews = teams.length * rounds.length;
  return {
    rounds: progress,
    completedReviews,
    totalReviews,
    percentage: totalReviews ? Math.round((completedReviews / totalReviews) * 100) : 0,
  };
}

function calculateVenueProgress(venue: Venue, rounds: ReviewRound[], teams: ProgressTeam[]): VenueProgress {
  const venueTeams = teams.filter((team) => team.venueId === venue.id);
  const overall = calculateOverall(rounds, venueTeams);
  return {
    venue,
    teamCount: venueTeams.length,
    rounds: overall.rounds,
    completedReviews: overall.completedReviews,
    totalReviews: overall.totalReviews,
    percentage: overall.percentage,
  };
}

const venueInclude = {
  problemStatements: { select: { id: true }, orderBy: { code: "asc" as const } },
  judgeAssignments: {
    where: { isPrimary: true },
    include: { judge: true },
    take: 1,
  },
};

async function getProgressSource() {
  const db = getDb();
  const hackathon = await getCurrentHackathonRecord();
  if (!hackathon) return { rounds: [], teams: [] };
  const [roundRecords, teamRecords] = await Promise.all([
    db.reviewRound.findMany({ where: { hackathonId: hackathon.id }, orderBy: { displayOrder: "asc" } }),
    db.team.findMany({
      where: { hackathonId: hackathon.id },
      select: {
        id: true,
        venueId: true,
        reviews: { select: { reviewRoundId: true, status: true } },
      },
    }),
  ]);
  return { rounds: roundRecords.map(mapRound), teams: teamRecords };
}

async function getCurrentHackathonRecord() {
  const db = getDb();
  return (await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" } }))
    ?? db.hackathon.findFirst({ orderBy: { startDate: "desc" } });
}

export interface EvaluationRepository {
  getHackathonOverview(): Promise<HackathonOverviewData>;
  getAdminShellData(): Promise<AdminShellData>;
  getHackathon(): Promise<Hackathon | null>;
  getVenues(): Promise<Venue[]>;
  getVenueById(id: string): Promise<Venue | null>;
  getTeams(): Promise<Team[]>;
  getTeamsByVenue(venueId: string): Promise<Team[]>;
  getTeamById(id: string): Promise<Team | null>;
  getJudgeForVenue(venueId: string): Promise<Judge | null>;
  getProblemStatementById(id: string): Promise<ProblemStatement | null>;
  getReviewsForTeam(teamId: string): Promise<Review[]>;
  getReviewRounds(): Promise<ReviewRound[]>;
  getVenueProgress(venueId: string): Promise<VenueProgress | null>;
  getOverallProgress(): Promise<OverallProgress>;
  getCurrentlyReviewing(): Promise<ActiveReview[]>;
  getVenuePageData(venueId: string): Promise<VenuePageData | null>;
  getTeamPageData(teamId: string): Promise<TeamPageData | null>;
}

export const evaluationRepository: EvaluationRepository = {
  async getHackathon() {
    const record = await getCurrentHackathonRecord();
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      shortName: record.shortName,
      date: record.startDate.toISOString(),
      status: record.status.toLowerCase() as Hackathon["status"],
      venueIds: (await getDb().venue.findMany({ where: { hackathonId: record.id }, select: { id: true }, orderBy: { displayOrder: "asc" } })).map((venue) => venue.id),
    };
  },

  async getVenues() {
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return [];
    const records = await getDb().venue.findMany({ where: { hackathonId: hackathon.id }, include: venueInclude, orderBy: { displayOrder: "asc" } });
    return records.map(mapVenue);
  },

  async getVenueById(id) {
    if (!isSafeLookupId(id)) return null;
    const record = await getDb().venue.findUnique({ where: { id }, include: venueInclude });
    return record ? mapVenue(record) : null;
  },

  async getTeams() {
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return [];
    const records = await getDb().team.findMany({ where: { hackathonId: hackathon.id }, include: { members: { orderBy: { id: "asc" } } }, orderBy: { teamCode: "asc" } });
    return records.map(mapTeam);
  },

  async getTeamsByVenue(venueId) {
    const records = await getDb().team.findMany({ where: { venueId }, include: { members: { orderBy: { id: "asc" } } }, orderBy: { teamCode: "asc" } });
    return records.map(mapTeam);
  },

  async getTeamById(id) {
    if (!isSafeLookupId(id)) return null;
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return null;
    const record = await getDb().team.findFirst({ where: { hackathonId: hackathon.id, OR: [{ id }, { teamCode: { equals: id, mode: "insensitive" } }] }, include: { members: { orderBy: { id: "asc" } } } });
    return record ? mapTeam(record) : null;
  },

  async getJudgeForVenue(venueId) {
    const assignment = await getDb().venueJudge.findFirst({ where: { venueId }, include: { judge: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
    return assignment ? mapJudge(assignment.judge, venueId) : null;
  },

  async getProblemStatementById(id) {
    if (!isSafeLookupId(id)) return null;
    const record = await getDb().problemStatement.findUnique({ where: { id } });
    return record ? mapProblemStatement(record) : null;
  },

  async getReviewsForTeam(teamId) {
    const records = await getDb().review.findMany({ where: { teamId }, include: { scores: true }, orderBy: { reviewRound: { displayOrder: "asc" } } });
    return records.map(mapReview);
  },

  async getReviewRounds() {
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return [];
    return (await getDb().reviewRound.findMany({ where: { hackathonId: hackathon.id }, orderBy: { displayOrder: "asc" } })).map(mapRound);
  },

  async getOverallProgress() {
    const source = await getProgressSource();
    return calculateOverall(source.rounds, source.teams);
  },

  async getVenueProgress(venueId) {
    const [venue, source] = await Promise.all([this.getVenueById(venueId), getProgressSource()]);
    return venue ? calculateVenueProgress(venue, source.rounds, source.teams) : null;
  },

  async getCurrentlyReviewing() {
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return [];
    const records = await getDb().review.findMany({
      where: { status: DbReviewStatus.IN_PROGRESS, team: { hackathonId: hackathon.id } },
      include: {
        scores: true,
        reviewRound: true,
        team: { include: { members: true, venue: { include: venueInclude } } },
      },
      orderBy: { startedAt: "desc" },
      take: 4,
    });
    return records.map((record) => ({
      review: mapReview(record),
      team: mapTeam(record.team),
      venue: mapVenue(record.team.venue),
      round: mapRound(record.reviewRound),
    }));
  },

  async getHackathonOverview() {
    const db = getDb();
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return { teamCount: 0, overall: calculateOverall([], []), venues: [], currentlyReviewing: [] };
    const [venueRecords, source, currentlyReviewing] = await Promise.all([
      db.venue.findMany({ where: { hackathonId: hackathon.id }, include: venueInclude, orderBy: { displayOrder: "asc" } }),
      getProgressSource(),
      this.getCurrentlyReviewing(),
    ]);
    const mappedVenues = venueRecords.map(mapVenue);
    return {
      teamCount: source.teams.length,
      overall: calculateOverall(source.rounds, source.teams),
      venues: mappedVenues.map((venue) => calculateVenueProgress(venue, source.rounds, source.teams)),
      currentlyReviewing,
    };
  },

  async getAdminShellData() {
    const db = getDb();
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return { venues: [], teamContexts: [] };
    const [venueRecords, source, teams] = await Promise.all([
      db.venue.findMany({ where: { hackathonId: hackathon.id }, include: venueInclude, orderBy: { displayOrder: "asc" } }),
      getProgressSource(),
      db.team.findMany({ where: { hackathonId: hackathon.id }, select: { id: true, teamCode: true, teamName: true, venueId: true } }),
    ]);
    const mappedVenues = venueRecords.map(mapVenue);
    return {
      venues: mappedVenues.map((venue) => calculateVenueProgress(venue, source.rounds, source.teams)),
      teamContexts: teams.map((team) => {
        const venueIndex = mappedVenues.findIndex((venue) => venue.id === team.venueId);
        const venueRecord = venueRecords[venueIndex];
        return {
          teamId: team.id,
          teamCode: team.teamCode,
          teamName: team.teamName,
          venue: mappedVenues[venueIndex],
          judge: venueRecord?.judgeAssignments[0] ? mapJudge(venueRecord.judgeAssignments[0].judge, team.venueId) : undefined,
        };
      }),
    };
  },

  async getVenuePageData(venueId) {
    if (!isSafeLookupId(venueId)) return null;
    const db = getDb();
    const [record, roundRecords] = await Promise.all([
      db.venue.findUnique({
        where: { id: venueId },
        include: {
          ...venueInclude,
          teams: {
            include: {
              members: { orderBy: { id: "asc" } },
              problemStatement: true,
              reviews: { include: { scores: true, reviewRound: true }, orderBy: { reviewRound: { displayOrder: "asc" } } },
            },
            orderBy: { teamCode: "asc" },
          },
        },
      }),
      db.reviewRound.findMany({ orderBy: { displayOrder: "asc" } }),
    ]);
    if (!record) return null;
    const venue = mapVenue(record);
    const rounds = roundRecords.map(mapRound);
    const progressTeams: ProgressTeam[] = record.teams.map((team) => ({ id: team.id, venueId: team.venueId, reviews: team.reviews.map((review) => ({ reviewRoundId: review.reviewRoundId, status: review.status })) }));
    const items: TeamListItem[] = record.teams.map((team) => {
      const mappedReviews = team.reviews.map(mapReview);
      const latestActivity = mappedReviews.flatMap((review) => [review.submittedAt, review.startedAt]).filter((value): value is string => Boolean(value)).sort().at(-1);
      return { team: mapTeam(team), problemStatement: mapProblemStatement(team.problemStatement), reviews: mappedReviews, latestActivity };
    });
    return { venue, progress: calculateVenueProgress(venue, rounds, progressTeams), teams: items };
  },

  async getTeamPageData(teamId) {
    if (!isSafeLookupId(teamId)) return null;
    const hackathon = await getCurrentHackathonRecord();
    if (!hackathon) return null;
    const record = await getDb().team.findFirst({
      where: { hackathonId: hackathon.id, OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] },
      include: {
        members: { orderBy: { id: "asc" } },
        problemStatement: true,
        venue: { include: venueInclude },
        reviews: {
          include: { scores: true, judge: true, reviewRound: { include: { rubrics: { orderBy: { displayOrder: "asc" } } } } },
          orderBy: { reviewRound: { displayOrder: "asc" } },
        },
      },
    });
    if (!record) return null;
    const venue = mapVenue(record.venue);
    const primaryJudge = record.venue.judgeAssignments[0]?.judge ? mapJudge(record.venue.judgeAssignments[0].judge, venue.id) : unassignedJudge(venue.id);
    return {
      team: mapTeam(record),
      venue,
      problemStatement: mapProblemStatement(record.problemStatement),
      judge: primaryJudge,
      reviews: record.reviews.map((reviewRecord) => {
        const round = mapRound(reviewRecord.reviewRound);
        const rubric: Rubric = {
          id: round.rubricId,
          name: `${round.name} Rubric`,
          criteria: reviewRecord.reviewRound.rubrics.map((criterion) => ({ id: criterion.id, label: criterion.name, maxScore: criterion.maxMarks.toNumber() })),
        };
        return {
          review: mapReview(reviewRecord),
          round,
          rubric,
          judge: reviewRecord.judge ? mapJudge(reviewRecord.judge, venue.id) : primaryJudge,
        };
      }),
    };
  },
};

export const getHackathonOverview = () => evaluationRepository.getHackathonOverview();
export const getAdminShellData = () => evaluationRepository.getAdminShellData();
export const getHackathon = () => evaluationRepository.getHackathon();
export const getVenues = () => evaluationRepository.getVenues();
export const getVenueById = (id: string) => evaluationRepository.getVenueById(id);
export const getTeams = () => evaluationRepository.getTeams();
export const getTeamsByVenue = (venueId: string) => evaluationRepository.getTeamsByVenue(venueId);
export const getTeamById = (id: string) => evaluationRepository.getTeamById(id);
export const getJudgeForVenue = (venueId: string) => evaluationRepository.getJudgeForVenue(venueId);
export const getProblemStatementById = (id: string) => evaluationRepository.getProblemStatementById(id);
export const getReviewsForTeam = (teamId: string) => evaluationRepository.getReviewsForTeam(teamId);
export const getReviewRounds = () => evaluationRepository.getReviewRounds();
export const getVenueProgress = (venueId: string) => evaluationRepository.getVenueProgress(venueId);
export const getOverallProgress = () => evaluationRepository.getOverallProgress();
export const getCurrentlyReviewing = () => evaluationRepository.getCurrentlyReviewing();
export const getVenuePageData = (venueId: string) => evaluationRepository.getVenuePageData(venueId);
export const getTeamPageData = (teamId: string) => evaluationRepository.getTeamPageData(teamId);
