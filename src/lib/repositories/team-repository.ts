import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { compare } from "bcryptjs";
import { AnnouncementAudience, IssueCategory, SubmissionType } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { createTeamAccessLookup, DUMMY_TEAM_ACCESS_HASH, normalizeTeamAccessCode } from "@/lib/team-access-credential";
import type { TeamSessionPayload } from "@/lib/team-session";
import type { ReviewStatus } from "@/types/domain";

const statusMap = { PENDING: "pending", IN_PROGRESS: "in_progress", COMPLETED: "completed", ABSENT: "absent" } as const;
export const submissionTypes = [SubmissionType.GITHUB, SubmissionType.PRESENTATION, SubmissionType.DEMO, SubmissionType.PROTOTYPE, SubmissionType.VIDEO, SubmissionType.DOCUMENTATION] as const;
export const submissionLabels: Record<(typeof submissionTypes)[number], string> = { GITHUB: "GitHub Repository", PRESENTATION: "Presentation / PPT", DEMO: "Demo URL", PROTOTYPE: "Prototype URL", VIDEO: "Demo Video", DOCUMENTATION: "Documentation" };

export async function authenticateTeamByAccessCode(rawCode: string) {
  const code = normalizeTeamAccessCode(rawCode);
  if (!/^(?:DEV-T\d{3}|SIH-[A-HJ-NP-Z2-9]{8}|[A-HJ-NP-Z2-9]{8,32})$/.test(code)) return null;
  const team = await getDb().team.findUnique({ where: { accessCodeLookup: createTeamAccessLookup(code) }, select: { id: true, teamCode: true, teamName: true, accessCodeHash: true } });
  const valid = await compare(code, team?.accessCodeHash ?? DUMMY_TEAM_ACCESS_HASH);
  return team && valid ? { id: team.id, code: team.teamCode, name: team.teamName } : null;
}

export type TeamFeedbackInput = {
  preGuidelines: number;
  preCommunication: number;
  supportCoordination: number;
  supportMentors: number;
  infraResources: number;
  infraWorkspace: number;
  evaluationClarity: number;
  evaluationFairness: number;
  keyLearnings: string;
  overallFeedback: string;
};

export async function getTeamFeedback(session: TeamSessionPayload) {
  return getDb().teamFeedback.findUnique({ where: { teamId: session.teamId } });
}

export async function saveTeamFeedback(session: TeamSessionPayload, input: TeamFeedbackInput) {
  const values = Object.values(input).slice(0, 8);
  if (values.some((value) => typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5)) return { ok: false as const, error: "Please answer every rating question." };
  if (input.keyLearnings.trim().length < 3 || input.keyLearnings.length > 3000 || input.overallFeedback.trim().length < 3 || input.overallFeedback.length > 3000) return { ok: false as const, error: "Please provide both written responses." };
  const team = await getDb().team.findFirst({ where: { id: session.teamId, accessCodeHash: { not: null } }, select: { id: true } });
  if (!team) return { ok: false as const, error: "Team session expired. Please sign in again." };
  await getDb().teamFeedback.upsert({ where: { teamId: team.id }, create: { id: randomUUID(), teamId: team.id, ...input, keyLearnings: input.keyLearnings.trim(), overallFeedback: input.overallFeedback.trim() }, update: { ...input, keyLearnings: input.keyLearnings.trim(), overallFeedback: input.overallFeedback.trim(), submittedAt: new Date() } });
  return { ok: true as const };
}

export const getTeamSessionData = cache(async (session: TeamSessionPayload) => {
  const team = await getDb().team.findFirst({
    where: { id: session.teamId, accessCodeHash: { not: null } },
    select: {
      id: true, teamCode: true, teamName: true, hackathonId: true, venueId: true,
      issues: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      reviews: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      hackathon: { select: { reviewRounds: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } } } },
    },
  });
  if (!team) return null;
  const now = new Date();
  const latestAnnouncement = await getDb().announcement.findFirst({
    where: { hackathonId: team.hackathonId, publishedAt: { lte: now }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, { OR: [{ audience: AnnouncementAudience.ALL }, { audience: AnnouncementAudience.TEAMS }, { audience: AnnouncementAudience.VENUE, venueId: team.venueId }] }] },
    orderBy: { updatedAt: "desc" }, select: { updatedAt: true },
  });
  const reviewDates = [team.reviews[0]?.updatedAt, team.hackathon.reviewRounds[0]?.updatedAt].filter((value): value is Date => Boolean(value));
  return {
    id: team.id, teamCode: team.teamCode, teamName: team.teamName,
    notificationVersions: {
      reviews: reviewDates.length ? new Date(Math.max(...reviewDates.map((date) => date.getTime()))).toISOString() : undefined,
      updates: latestAnnouncement?.updatedAt.toISOString(),
      issues: team.issues[0]?.updatedAt.toISOString(),
    },
  };
});

export const getTeamPortalData = cache(async (session: TeamSessionPayload) => {
  const now = new Date();
  const team = await getDb().team.findFirst({
    where: { id: session.teamId, accessCodeHash: { not: null } },
    include: {
      venue: true,
      problemStatement: true,
      members: { orderBy: { id: "asc" } },
      submissions: { orderBy: { type: "asc" } },
      issues: { orderBy: { createdAt: "desc" } },
      reviews: { include: { reviewRound: { include: { rubrics: { orderBy: { displayOrder: "asc" } } } }, scores: true }, orderBy: { reviewRound: { displayOrder: "asc" } } },
      hackathon: {
        include: {
          reviewRounds: { orderBy: { displayOrder: "asc" } },
        },
      },
    },
  });
  if (!team) return null;
  const announcements = await getDb().announcement.findMany({
    where: { hackathonId: team.hackathonId, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], AND: [{ OR: [{ audience: AnnouncementAudience.ALL }, { audience: AnnouncementAudience.TEAMS }, { audience: AnnouncementAudience.VENUE, venueId: team.venueId }] }] },
    orderBy: { publishedAt: "desc" },
  });
  const rounds = team.hackathon.reviewRounds.map((round) => {
    const review = team.reviews.find((item) => item.reviewRoundId === round.id);
    return {
      id: round.id, number: round.roundNumber, name: round.name,
      status: (review ? statusMap[review.status] : "pending") as ReviewStatus,
      startedAt: review?.startedAt?.toISOString(),
      completedAt: review?.submittedAt?.toISOString(),
      feedbackVisible: round.feedbackVisibleToTeams,
      feedback: round.feedbackVisibleToTeams && review?.status === "COMPLETED" ? { remarks: review.generalRemarks ?? "", improvements: review.improvements ?? "", submittedAt: review.submittedAt?.toISOString() } : null,
      scores: review?.scores.map((score) => ({ rubricId: score.rubricId, score: score.score.toNumber(), rubric: review.reviewRound.rubrics.find((rubric) => rubric.id === score.rubricId)?.name ?? "Criterion", maximum: review.reviewRound.rubrics.find((rubric) => rubric.id === score.rubricId)?.maxMarks.toNumber() ?? 0 })) ?? [],
      totalScore: review?.scores.reduce((sum, score) => sum + score.score.toNumber(), 0) ?? 0,
      maximumScore: review?.reviewRound.rubrics.reduce((sum, rubric) => sum + rubric.maxMarks.toNumber(), 0) ?? 0,
    };
  });
  return {
    identity: { id: team.id, code: team.teamCode, name: team.teamName },
    finalDecision: team.finalDecision,
    venue: { id: team.venue.id, name: team.venue.name, room: team.venue.roomNumber },
    problem: { code: team.problemStatement.code, title: team.problemStatement.title, description: team.problemStatement.description, organization: team.problemStatement.organization ?? "—", theme: team.problemStatement.theme ?? team.problemStatement.category ?? "—" },
    members: team.members.map((member) => ({ id: member.id, name: member.name, rollNumber: member.rollNumber, department: member.department, year: member.year, role: member.role ?? "Member" })),
    rounds,
    submissions: team.submissions.map((item) => ({ id: item.id, type: item.type, url: item.url, label: item.label })),
    announcements: announcements.map((item) => ({ id: item.id, title: item.title, message: item.message, audience: item.audience, publishedAt: item.publishedAt?.toISOString(), expiresAt: item.expiresAt?.toISOString() })),
    issues: team.issues.map((issue) => ({ id: issue.id, category: issue.category, title: issue.title, description: issue.description, status: issue.status, adminResponse: issue.adminResponse, createdAt: issue.createdAt.toISOString(), updatedAt: issue.updatedAt.toISOString(), resolvedAt: issue.resolvedAt?.toISOString() })),
  };
});

function safeUrl(value: string) {
  if (!value) return null;
  try { const url = new URL(value); return (url.protocol === "http:" || url.protocol === "https:") && value.length <= 2048 ? url.toString() : null; } catch { return null; }
}

export async function saveTeamSubmissions(session: TeamSessionPayload, values: Partial<Record<SubmissionType, string>>) {
  const team = await getDb().team.findFirst({ where: { id: session.teamId, accessCodeHash: { not: null } }, select: { id: true } });
  if (!team) return { ok: false as const, code: "unauthorized" as const };
  for (const type of submissionTypes) if (values[type]?.trim() && !safeUrl(values[type]!.trim())) return { ok: false as const, code: "invalid_url" as const };
  await getDb().$transaction(async (tx) => {
    for (const type of submissionTypes) {
      const raw = values[type]?.trim() ?? "";
      if (!raw) {
        await tx.teamSubmission.deleteMany({ where: { teamId: team.id, type } });
        continue;
      }
      await tx.teamSubmission.upsert({
        where: { teamId_type: { teamId: team.id, type } },
        create: { id: `submission-${team.id}-${type.toLowerCase()}`, teamId: team.id, type, url: safeUrl(raw)! },
        update: { url: safeUrl(raw)! },
      });
    }
  });
  return { ok: true as const };
}

export async function createTeamIssue(session: TeamSessionPayload, input: { category: string; title: string; description: string }) {
  if (!Object.values(IssueCategory).includes(input.category as IssueCategory) || input.title.trim().length < 4 || input.title.trim().length > 120 || input.description.trim().length < 10 || input.description.trim().length > 3000) return { ok: false as const, code: "invalid" as const };
  const team = await getDb().team.findFirst({ where: { id: session.teamId, accessCodeHash: { not: null } }, select: { id: true } });
  if (!team) return { ok: false as const, code: "unauthorized" as const };
  await getDb().teamIssue.create({ data: { id: crypto.randomUUID(), teamId: team.id, category: input.category as IssueCategory, title: input.title.trim(), description: input.description.trim() } });
  return { ok: true as const };
}
