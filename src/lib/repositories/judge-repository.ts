import "server-only";

import { compare } from "bcryptjs";
import { cache } from "react";
import { Prisma, ReviewStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { normalizeJudgePhone } from "@/lib/judge-credentials";
import { canJudgeEditCompletedReview, canJudgeWriteReview, type JudgeReviewAuthContext } from "@/lib/judge-review-authorization";
import type { JudgeSessionPayload } from "@/lib/judge-session";
import type { ReviewStatus as UiReviewStatus } from "@/types/domain";

const statusMap: Record<ReviewStatus, UiReviewStatus> = { PENDING: "pending", IN_PROGRESS: "in_progress", COMPLETED: "completed", ABSENT: "absent" };
const DUMMY_JUDGE_PASSWORD_HASH = "$2b$10$D4e6tX/2CJeSQDbq3pqGxOvlY97Ha6A41l8PXlpsoT0l0mtiJpvZ2";
function safeId(value: string) { return /^[a-z0-9-]{1,64}$/i.test(value); }

export interface JudgeIdentity {
  assignmentId: string; judgeId: string; venueId: string; judgeName: string; designation: string; department: string; venueName: string; roomNumber: string; role: "external" | "internal";
  venues: Array<{ id: string; name: string; roomNumber: string; role: "external" | "internal" }>;
}
export interface JudgeTeamSummary {
  id: string; code: string; name: string; venueId: string; venueName: string; roomNumber: string; problemCode: string; problemTitle: string;
  reviews: Array<{ roundId: string; roundNumber: number; name: string; status: UiReviewStatus }>;
}
export interface JudgeVenueDetails {
  id: string; name: string; roomNumber: string; role: "external" | "internal"; problemRange: string; location?: string; theme?: string; teamCodeRange?: string; plannedTeamCount?: number;
  judges: Array<{ id: string; name: string; role: "external" | "internal"; department: string; phone?: string }>;
  coordinators: Array<{ id: string; name: string; department?: string; phone?: string }>;
}
export interface JudgeDashboardData {
  identity: JudgeIdentity; venues: JudgeVenueDetails[];
  rounds: Array<{ id: string; number: number; name: string; completed: number; inProgress: number; total: number }>;
  teams: JudgeTeamSummary[]; announcements: Array<{ id: string; title: string; message: string; publishedAt: string }>;
}
export interface JudgeTeamData {
  id: string; code: string; name: string; venue: { name: string; room: string };
  problem: { code: string; title: string; description: string; organization: string; theme: string };
  members: Array<{ id: string; name: string; department: string; year: number; role: string }>;
  submissions: Array<{ id: string; type: string; label: string; url: string }>;
  rounds: Array<{ id: string; number: number; name: string; status: UiReviewStatus; submittedAt?: string }>;
}
export interface JudgeReviewData {
  team: { id: string; code: string; name: string }; round: { id: string; number: number; name: string };
  review: { id: string; status: UiReviewStatus; startedAt?: string; submittedAt?: string; remarks: string; improvements: string; scores: Record<string, number>; canEdit: boolean };
  rubrics: Array<{ id: string; name: string; description?: string; maxMarks: number }>;
}

const assignmentInclude = { judge: true, venue: { include: { hackathon: true } } } satisfies Prisma.VenueJudgeInclude;
type Assignment = Prisma.VenueJudgeGetPayload<{ include: typeof assignmentInclude }>;
function roleOf(assignment: Assignment) { return assignment.role.toLowerCase() as "external" | "internal"; }
function mapIdentity(assignment: Assignment, assignments: Assignment[] = [assignment]): JudgeIdentity {
  return { assignmentId: assignment.id, judgeId: assignment.judgeId, venueId: assignment.venueId, judgeName: assignment.judge.name, designation: assignment.judge.designation, department: assignment.judge.department, venueName: assignment.venue.name, roomNumber: assignment.venue.roomNumber, role: roleOf(assignment), venues: assignments.map((item) => ({ id: item.venueId, name: item.venue.name, roomNumber: item.venue.roomNumber, role: roleOf(item) })) };
}
const judgeAssignments = cache(async (judgeId: string) => getDb().venueJudge.findMany({ where: { judgeId }, include: assignmentInclude, orderBy: [{ isPrimary: "desc" }, { venue: { displayOrder: "asc" } }] }));
async function assignmentsForSession(session: JudgeSessionPayload) {
  const assignments = await judgeAssignments(session.judgeId);
  return assignments.some((item) => item.id === session.assignmentId) ? assignments : [];
}
async function assignmentForSessionVenue(session: JudgeSessionPayload, venueId: string) {
  return (await assignmentsForSession(session)).find((assignment) => assignment.venueId === venueId) ?? null;
}

export async function authenticateJudgeByPhonePassword(phone: string, password: string): Promise<JudgeIdentity | null> {
  if (!phone || !password || phone.length > 20 || password.length > 128) return null;
  const judge = await getDb().judge.findFirst({ where: { phone: normalizeJudgePhone(phone), passwordHash: { not: null } }, include: { venueAssignments: { include: assignmentInclude, orderBy: [{ isPrimary: "desc" }, { venue: { displayOrder: "asc" } }] } } });
  const matches = await compare(password, judge?.passwordHash ?? DUMMY_JUDGE_PASSWORD_HASH);
  if (!judge || !judge.passwordHash || !judge.venueAssignments.length || !matches) return null;
  return mapIdentity(judge.venueAssignments[0], judge.venueAssignments);
}
export async function getJudgeSessionData(session: JudgeSessionPayload) {
  const assignments = await assignmentsForSession(session);
  return assignments.length ? mapIdentity(assignments.find((item) => item.id === session.assignmentId) ?? assignments[0], assignments) : null;
}

export async function getJudgeDashboard(session: JudgeSessionPayload): Promise<JudgeDashboardData | null> {
  const assignments = await assignmentsForSession(session);
  if (!assignments.length) return null;
  const identity = mapIdentity(assignments.find((item) => item.id === session.assignmentId) ?? assignments[0], assignments);
  const venueIds = assignments.map((item) => item.venueId);
  const venues = await getDb().venue.findMany({ where: { id: { in: venueIds } }, include: { hackathon: { include: { reviewRounds: { orderBy: { displayOrder: "asc" } } } }, teams: { include: { problemStatement: true, reviews: true }, orderBy: { teamCode: "asc" } }, problemStatements: { select: { code: true }, orderBy: { code: "asc" } }, judgeAssignments: { include: { judge: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }, facultyCoordinators: { orderBy: { name: "asc" } } }, orderBy: { displayOrder: "asc" } });
  const assignedByVenue = new Map(assignments.map((item) => [item.venueId, item]));
  const allTeams = venues.flatMap((venue) => venue.teams);
  const rounds = venues[0]?.hackathon.reviewRounds ?? [];
  const summaries = venues.flatMap((venue) => venue.teams.map((team) => ({ id: team.id, code: team.teamCode, name: team.teamName, venueId: venue.id, venueName: venue.name, roomNumber: venue.roomNumber, problemCode: team.problemStatement.code, problemTitle: team.problemStatement.title, reviews: rounds.map((round) => { const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id); return { roundId: round.id, roundNumber: round.roundNumber, name: round.name, status: review ? statusMap[review.status] : "pending" as const }; }) })));
  const now = new Date();
  const announcements = await getDb().announcement.findMany({ where: { hackathonId: venues[0]?.hackathonId, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], AND: [{ OR: [{ audience: "ALL" }, { audience: "JUDGES" }, { audience: "VENUE", venueId: { in: venueIds } }] }] }, orderBy: { publishedAt: "desc" }, select: { id: true, title: true, message: true, publishedAt: true } });
  return {
    identity,
    venues: venues.map((venue) => { const statements = venue.problemStatements; const assignment = assignedByVenue.get(venue.id)!; return { id: venue.id, name: venue.name, roomNumber: venue.roomNumber, role: roleOf(assignment), problemRange: venue.teamCodeRange ?? (statements.length ? `${statements[0].code}–${statements.at(-1)?.code}` : "Team roster pending"), location: venue.building ?? undefined, theme: venue.theme ?? undefined, teamCodeRange: venue.teamCodeRange ?? undefined, plannedTeamCount: venue.plannedTeamCount ?? undefined, judges: venue.judgeAssignments.map((item) => ({ id: item.judge.id, name: item.judge.name, role: item.role.toLowerCase() as "external" | "internal", department: item.judge.department, phone: item.judge.phone ?? undefined })), coordinators: venue.facultyCoordinators.map((person) => ({ id: person.id, name: person.name, department: person.department ?? undefined, phone: person.phone ?? undefined })) }; }),
    rounds: rounds.map((round) => { const reviews = allTeams.flatMap((team) => team.reviews.filter((review) => review.reviewRoundId === round.id)); return { id: round.id, number: round.roundNumber, name: round.name, completed: reviews.filter((review) => review.status === ReviewStatus.COMPLETED).length, inProgress: reviews.filter((review) => review.status === ReviewStatus.IN_PROGRESS).length, total: allTeams.length }; }),
    teams: summaries, announcements: announcements.map((item) => ({ ...item, publishedAt: item.publishedAt!.toISOString() })),
  };
}

export async function getJudgeTeamDetails(session: JudgeSessionPayload, teamId: string): Promise<JudgeTeamData | null> {
  if (!safeId(teamId)) return null;
  const team = await getDb().team.findFirst({ where: { OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] }, include: { venue: true, members: { orderBy: { id: "asc" } }, submissions: { orderBy: { type: "asc" } }, problemStatement: true, reviews: { include: { reviewRound: true }, orderBy: { reviewRound: { displayOrder: "asc" } } }, hackathon: { include: { reviewRounds: { orderBy: { displayOrder: "asc" } } } } } });
  if (!team || !(await assignmentForSessionVenue(session, team.venueId))) return null;
  return { id: team.id, code: team.teamCode, name: team.teamName, venue: { name: team.venue.name, room: team.venue.roomNumber }, problem: { code: team.problemStatement.code, title: team.problemStatement.title, description: team.problemStatement.description, organization: team.problemStatement.organization ?? "—", theme: team.problemStatement.theme ?? team.problemStatement.category ?? "—" }, members: team.members.map((member) => ({ id: member.id, name: member.name, department: member.department, year: member.year, role: member.role ?? "Member" })), submissions: team.submissions.map((item) => ({ id: item.id, type: item.type, label: item.label ?? item.type, url: item.url })), rounds: team.hackathon.reviewRounds.map((round) => { const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id); return { id: round.id, number: round.roundNumber, name: round.name, status: review ? statusMap[review.status] : "pending" as const, submittedAt: review?.submittedAt?.toISOString() }; }) };
}
export async function getJudgeTeamAccessFailure(session: JudgeSessionPayload, teamId: string) {
  if (!safeId(teamId)) return "not_found" as const;
  const team = await getDb().team.findFirst({ where: { OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] }, select: { venueId: true } });
  if (!team) return "not_found" as const;
  return (await assignmentForSessionVenue(session, team.venueId)) ? "not_found" as const : "wrong_venue" as const;
}

export async function getReviewForTeamRound(session: JudgeSessionPayload, teamId: string, roundId: string): Promise<JudgeReviewData | null> {
  if (!safeId(teamId) || !safeId(roundId)) return null;
  const team = await getDb().team.findFirst({ where: { OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] }, include: { reviews: { include: { scores: true, completedByJudge: { include: { venueAssignments: true } } } }, hackathon: { include: { reviewRounds: { include: { rubrics: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } } } });
  if (!team) return null;
  const assignment = await assignmentForSessionVenue(session, team.venueId);
  if (!assignment) return null;
  const round = team.hackathon.reviewRounds.find((candidate) => candidate.id === roundId);
  if (!round) return null;
  const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id);
  const completedAssignment = review?.completedByJudge?.venueAssignments.find((item) => item.venueId === team.venueId);
  const authContext: JudgeReviewAuthContext = { reviewJudgeId: review?.judgeId ?? null, reviewCompletedByJudgeId: review?.completedByJudgeId ?? null, sessionJudgeId: session.judgeId, sessionJudgeRole: roleOf(assignment), reviewCompletedByRole: completedAssignment?.role.toLowerCase() as "external" | "internal" | undefined };
  return { team: { id: team.id, code: team.teamCode, name: team.teamName }, round: { id: round.id, number: round.roundNumber, name: round.name }, review: { id: review?.id ?? `review-${team.id}-${round.id}`, status: review ? statusMap[review.status] : "pending", startedAt: review?.startedAt?.toISOString(), submittedAt: review?.submittedAt?.toISOString(), remarks: review?.generalRemarks ?? "", improvements: review?.improvements ?? "", scores: Object.fromEntries((review?.scores ?? []).map((score) => [score.rubricId, score.score.toNumber()])), canEdit: review?.status === ReviewStatus.COMPLETED ? canJudgeEditCompletedReview(authContext) : canJudgeWriteReview(authContext) }, rubrics: round.rubrics.map((rubric) => ({ id: rubric.id, name: rubric.name, description: rubric.description ?? undefined, maxMarks: rubric.maxMarks.toNumber() })) };
}

export async function startReview(session: JudgeSessionPayload, teamId: string, roundId: string) {
  if (!safeId(teamId) || !safeId(roundId)) return null;
  return getDb().$transaction(async (tx) => {
    const team = await tx.team.findFirst({ where: { id: teamId }, select: { id: true, venueId: true, hackathonId: true } });
    if (!team) return null;
    const [sessionAssignment, assignment] = await Promise.all([
      tx.venueJudge.findFirst({ where: { id: session.assignmentId, judgeId: session.judgeId }, select: { id: true } }),
      tx.venueJudge.findFirst({ where: { judgeId: session.judgeId, venueId: team.venueId } }),
    ]);
    if (!sessionAssignment || !assignment) return null;
    const round = await tx.reviewRound.findFirst({ where: { id: roundId, hackathonId: team.hackathonId }, select: { id: true } });
    if (!round) return null;
    const review = await tx.review.upsert({ where: { teamId_reviewRoundId: { teamId, reviewRoundId: roundId } }, create: { id: `review-${teamId}-${roundId}`, teamId, reviewRoundId: roundId, judgeId: session.judgeId, status: ReviewStatus.IN_PROGRESS, startedAt: new Date() }, update: {} });
    if (!canJudgeWriteReview({ reviewJudgeId: review.judgeId, reviewCompletedByJudgeId: review.completedByJudgeId, sessionJudgeId: session.judgeId, sessionJudgeRole: assignment.role.toLowerCase() as "external" | "internal" })) return null;
    if (review.status === ReviewStatus.PENDING) return tx.review.update({ where: { id: review.id }, data: { status: ReviewStatus.IN_PROGRESS, startedAt: review.startedAt ?? new Date(), judgeId: session.judgeId } });
    return review;
  });
}

export interface ReviewSubmission { scores: Array<{ rubricId: string; score: number }>; remarks: string; improvements: string; }
function sameCompletedReview(review: { generalRemarks: string | null; improvements: string | null; scores: Array<{ rubricId: string; score: { toNumber(): number } }> }, submission: ReviewSubmission) { return (review.generalRemarks ?? "") === submission.remarks.trim() && (review.improvements ?? "") === submission.improvements.trim() && review.scores.length === submission.scores.length && submission.scores.every((score) => review.scores.some((current) => current.rubricId === score.rubricId && current.score.toNumber() === score.score)); }

export async function markReviewAbsent(session: JudgeSessionPayload, teamId: string, roundId: string) {
  if (!safeId(teamId) || !safeId(roundId)) return { ok: false as const, code: "invalid" as const };
  return getDb().$transaction(async (tx) => {
    const team = await tx.team.findFirst({ where: { id: teamId }, select: { id: true, venueId: true, hackathonId: true } });
    if (!team) return { ok: false as const, code: "not_found" as const };
    const [sessionAssignment, assignment, round] = await Promise.all([
      tx.venueJudge.findFirst({ where: { id: session.assignmentId, judgeId: session.judgeId }, select: { id: true } }),
      tx.venueJudge.findFirst({ where: { judgeId: session.judgeId, venueId: team.venueId }, select: { role: true } }),
      tx.reviewRound.findFirst({ where: { id: roundId, hackathonId: team.hackathonId }, select: { id: true } }),
    ]);
    if (!sessionAssignment || !assignment || !round) return { ok: false as const, code: "not_found" as const };
    const review = await tx.review.upsert({ where: { teamId_reviewRoundId: { teamId, reviewRoundId: roundId } }, create: { id: `review-${teamId}-${roundId}`, teamId, reviewRoundId: roundId, judgeId: session.judgeId, completedByJudgeId: session.judgeId, status: ReviewStatus.ABSENT, startedAt: new Date(), submittedAt: new Date() }, update: {}, include: { completedByJudge: { include: { venueAssignments: { where: { venueId: team.venueId }, take: 1 } } } } });
    const context: JudgeReviewAuthContext = { reviewJudgeId: review.judgeId, reviewCompletedByJudgeId: review.completedByJudgeId, sessionJudgeId: session.judgeId, sessionJudgeRole: assignment.role.toLowerCase() as "external" | "internal", reviewCompletedByRole: review.completedByJudge?.venueAssignments[0]?.role.toLowerCase() as "external" | "internal" | undefined };
    if (review.status === ReviewStatus.COMPLETED || !canJudgeWriteReview(context)) return { ok: false as const, code: "not_owner" as const };
    await tx.reviewScore.deleteMany({ where: { reviewId: review.id } });
    await tx.review.update({ where: { id: review.id }, data: { status: ReviewStatus.ABSENT, judgeId: session.judgeId, completedByJudgeId: session.judgeId, startedAt: review.startedAt ?? new Date(), submittedAt: new Date(), generalRemarks: "Team absent for this review.", improvements: null } });
    return { ok: true as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function submitReview(session: JudgeSessionPayload, teamId: string, roundId: string, submission: ReviewSubmission) {
  if (!safeId(teamId) || !safeId(roundId) || submission.remarks.length > 5000 || submission.improvements.length > 5000) return { ok: false as const, code: "invalid" as const };
  return getDb().$transaction(async (tx) => {
    const team = await tx.team.findFirst({ where: { id: teamId }, select: { id: true, venueId: true, hackathonId: true } });
    if (!team) return { ok: false as const, code: "not_found" as const };
    const [sessionAssignment, assignment] = await Promise.all([
      tx.venueJudge.findFirst({ where: { id: session.assignmentId, judgeId: session.judgeId }, select: { id: true } }),
      tx.venueJudge.findFirst({ where: { judgeId: session.judgeId, venueId: team.venueId }, select: { role: true } }),
    ]);
    if (!sessionAssignment || !assignment) return { ok: false as const, code: "not_found" as const };
    const round = await tx.reviewRound.findFirst({ where: { id: roundId, hackathonId: team.hackathonId }, include: { rubrics: true } });
    if (!round) return { ok: false as const, code: "not_found" as const };
    const unique = new Map(submission.scores.map((score) => [score.rubricId, score.score]));
    if (unique.size !== submission.scores.length || unique.size !== round.rubrics.length) return { ok: false as const, code: "invalid" as const };
    for (const rubric of round.rubrics) { const value = unique.get(rubric.id); if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > rubric.maxMarks.toNumber()) return { ok: false as const, code: "invalid" as const }; }
    const review = await tx.review.upsert({ where: { teamId_reviewRoundId: { teamId, reviewRoundId: roundId } }, create: { id: `review-${teamId}-${roundId}`, teamId, reviewRoundId: roundId, judgeId: session.judgeId, status: ReviewStatus.IN_PROGRESS, startedAt: new Date() }, update: {}, include: { scores: true, completedByJudge: { include: { venueAssignments: { where: { venueId: team.venueId }, select: { role: true }, take: 1 } } } } });
    const authContext: JudgeReviewAuthContext = { reviewJudgeId: review.judgeId, reviewCompletedByJudgeId: review.completedByJudgeId, sessionJudgeId: session.judgeId, sessionJudgeRole: assignment.role.toLowerCase() as "external" | "internal", reviewCompletedByRole: review.completedByJudge?.venueAssignments[0]?.role.toLowerCase() as "external" | "internal" | undefined };
    const editingCompleted = review.status === ReviewStatus.COMPLETED;
    if (editingCompleted ? !canJudgeEditCompletedReview(authContext) : !canJudgeWriteReview(authContext)) return { ok: false as const, code: "not_owner" as const };
    if (editingCompleted && sameCompletedReview(review, submission)) return { ok: true as const, total: review.scores.reduce((sum, score) => sum + score.score.toNumber(), 0), alreadySubmitted: true, edited: false };
    if (!editingCompleted) { const claimed = await tx.review.updateMany({ where: { id: review.id, status: { not: ReviewStatus.COMPLETED }, OR: [{ judgeId: null }, { judgeId: session.judgeId }] }, data: { judgeId: session.judgeId, startedAt: review.startedAt ?? new Date() } }); if (claimed.count !== 1) return { ok: false as const, code: "not_owner" as const }; }
    for (const rubric of round.rubrics) { const score = unique.get(rubric.id)!; await tx.reviewScore.upsert({ where: { reviewId_rubricId: { reviewId: review.id, rubricId: rubric.id } }, create: { id: `${review.id}-${rubric.id}`, reviewId: review.id, rubricId: rubric.id, score }, update: { score } }); }
    await tx.review.update({ where: { id: review.id }, data: { status: ReviewStatus.COMPLETED, judgeId: session.judgeId, completedByJudgeId: session.judgeId, submittedAt: review.submittedAt ?? new Date(), generalRemarks: submission.remarks.trim() || null, improvements: submission.improvements.trim() || null } });
    return { ok: true as const, total: round.rubrics.reduce((sum, rubric) => sum + unique.get(rubric.id)!, 0), alreadySubmitted: false, edited: editingCompleted };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
