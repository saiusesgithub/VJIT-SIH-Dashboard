import "server-only";

import { hash } from "bcryptjs";
import { Prisma, ShortlistingDecision, VenueJudgeRole } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { normalizeJudgePhone } from "@/lib/judge-credentials";

type ManagementResult = { ok: true } | { ok: false; reason: "invalid" | "duplicate" | "unavailable" };

async function event() {
  return (await getDb().hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true } }))
    ?? getDb().hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
}

const clean = (value: string | undefined) => value?.trim() ?? "";

function isDayTwoVenue(venue: { id: string; code: string; name: string }) {
  return venue.id.startsWith("venue-day2-") || /^day2/i.test(venue.code) || /^day\s*2/i.test(venue.name);
}

function isDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function getAdminManagementData() {
  const current = await event();
  if (!current) return { venues: [], judges: [], teams: [] };
  const [venues, judges, teams] = await Promise.all([
    getDb().venue.findMany({ where: { hackathonId: current.id }, orderBy: { displayOrder: "asc" }, select: { id: true, code: true, name: true, roomNumber: true } }),
    getDb().judge.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, designation: true } }),
    getDb().team.findMany({ where: { hackathonId: current.id }, orderBy: { teamCode: "asc" }, select: { id: true, teamCode: true, teamName: true, venue: { select: { name: true, roomNumber: true } } } }),
  ]);
  return { venues, judges, teams };
}

export async function getRequalificationVenueOptions() {
  const current = await event();
  if (!current) return [];
  const venues = await getDb().venue.findMany({
    where: { hackathonId: current.id },
    select: { id: true, code: true, name: true, roomNumber: true },
    orderBy: { displayOrder: "asc" },
  });
  return venues.filter(isDayTwoVenue).map(({ id, name, roomNumber }) => ({ id, name, roomNumber }));
}

export async function requalifyEliminatedTeam(input: { teamId: string; venueId: string }): Promise<ManagementResult> {
  const current = await event();
  if (!current || !/^[a-z0-9-]{1,100}$/i.test(input.teamId) || !/^[a-z0-9-]{1,100}$/i.test(input.venueId)) return { ok: false, reason: "invalid" };

  try {
    return await getDb().$transaction(async (tx) => {
      const [team, venue] = await Promise.all([
        tx.team.findFirst({ where: { id: input.teamId, hackathonId: current.id }, select: { id: true, finalDecision: true } }),
        tx.venue.findFirst({ where: { id: input.venueId, hackathonId: current.id }, select: { id: true, code: true, name: true } }),
      ]);
      if (!team || team.finalDecision !== ShortlistingDecision.ELIMINATED || !venue || !isDayTwoVenue(venue)) return { ok: false as const, reason: "invalid" as const };
      await tx.team.update({
        where: { id: team.id },
        data: {
          venueId: venue.id,
          finalDecision: ShortlistingDecision.SHORTLISTED,
          decisionUpdatedAt: new Date(),
          decisionRevision: { increment: 1 },
        },
      });
      return { ok: true as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    console.error("Unable to restore eliminated team", error instanceof Error ? error.message : "unknown error");
    return { ok: false, reason: "unavailable" };
  }
}

export async function createVenue(input: Record<string, string>) {
  const current = await event();
  if (!current) return false;
  const code = clean(input.code);
  const name = clean(input.name);
  const roomNumber = clean(input.roomNumber);
  if (!code || !name || !roomNumber || code.length > 32 || name.length > 80 || roomNumber.length > 80) return false;
  const last = await getDb().venue.aggregate({ where: { hackathonId: current.id }, _max: { displayOrder: true } });
  await getDb().venue.create({ data: { id: crypto.randomUUID(), hackathonId: current.id, code, name, roomNumber, building: clean(input.building) || null, theme: clean(input.theme) || null, teamCodeRange: clean(input.teamCodeRange) || null, displayOrder: (last._max.displayOrder ?? 0) + 1 } });
  return true;
}

export async function createTeam(input: Record<string, string>): Promise<ManagementResult> {
  const current = await event();
  if (!current) return { ok: false, reason: "unavailable" };
  const venueId = clean(input.venueId);
  const teamCode = clean(input.teamCode).toUpperCase();
  const teamName = clean(input.teamName);
  const problemCode = clean(input.problemCode).toUpperCase();
  const problemTitle = clean(input.problemTitle);
  const problemDescription = clean(input.problemDescription);
  const theme = clean(input.theme);

  if (!venueId || !teamCode || !teamName || !problemCode || !problemTitle || teamCode.length > 64 || teamName.length > 160 || problemCode.length > 64 || problemTitle.length > 500 || problemDescription.length > 10_000 || theme.length > 160) {
    return { ok: false, reason: "invalid" };
  }

  try {
    await getDb().$transaction(async (tx) => {
      const venue = await tx.venue.findFirst({ where: { id: venueId, hackathonId: current.id }, select: { id: true } });
      if (!venue) throw new Error("INVALID_VENUE");

      const duplicate = await tx.team.findUnique({ where: { hackathonId_teamCode: { hackathonId: current.id, teamCode } }, select: { id: true } });
      if (duplicate) throw new Error("DUPLICATE_TEAM");

      let statement = await tx.problemStatement.findUnique({ where: { hackathonId_code: { hackathonId: current.id, code: problemCode } }, select: { id: true } });
      if (!statement) {
        statement = await tx.problemStatement.create({
          data: { id: crypto.randomUUID(), hackathonId: current.id, venueId, code: problemCode, title: problemTitle, description: problemDescription || problemTitle, theme: theme || null },
          select: { id: true },
        });
      }

      await tx.team.create({ data: { id: crypto.randomUUID(), hackathonId: current.id, venueId, problemStatementId: statement.id, teamCode, teamName } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_TEAM") return { ok: false, reason: "duplicate" };
    if (error instanceof Error && error.message === "INVALID_VENUE") return { ok: false, reason: "invalid" };
    if (isDuplicate(error)) return { ok: false, reason: "duplicate" };
    console.error("Unable to create team", error instanceof Error ? error.message : "unknown error");
    return { ok: false, reason: "unavailable" };
  }
}

export async function deleteTeam(input: { teamId: string; confirmation: string }): Promise<ManagementResult> {
  const current = await event();
  if (!current || !/^[a-z0-9-]{1,100}$/i.test(input.teamId)) return { ok: false, reason: "invalid" };
  const team = await getDb().team.findFirst({ where: { id: input.teamId, hackathonId: current.id }, select: { id: true, teamCode: true } });
  if (!team) return { ok: false, reason: "invalid" };
  if (clean(input.confirmation).toUpperCase() !== team.teamCode.toUpperCase()) return { ok: false, reason: "invalid" };
  try {
    await getDb().team.delete({ where: { id: team.id } });
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function createJudge(input: Record<string, string>) {
  const name = clean(input.name);
  const phone = normalizeJudgePhone(input.phone ?? "");
  const password = input.password ?? "";
  const venueId = clean(input.venueId);
  if (!name || phone.length < 10 || password.length < 6 || !venueId) return false;
  const current = await event();
  if (!current || !(await getDb().venue.findFirst({ where: { id: venueId, hackathonId: current.id } }))) return false;
  const judge = await getDb().judge.create({ data: { id: crypto.randomUUID(), name, phone, passwordHash: await hash(password, 12), designation: clean(input.designation) || "Judge", department: clean(input.department) || "—" } });
  await assignJudgeToVenue({ judgeId: judge.id, venueId, role: input.role, primary: input.primary });
  return true;
}

export async function assignJudgeToVenue(input: Record<string, string>) {
  const judgeId = clean(input.judgeId);
  const venueId = clean(input.venueId);
  const primary = input.primary === "on";
  const role = input.role === "EXTERNAL" ? VenueJudgeRole.EXTERNAL : VenueJudgeRole.INTERNAL;
  const current = await event();
  if (!current || !judgeId || !venueId || !(await getDb().judge.findUnique({ where: { id: judgeId } })) || !(await getDb().venue.findFirst({ where: { id: venueId, hackathonId: current.id } }))) return false;
  await getDb().$transaction(async (tx) => {
    if (primary) await tx.venueJudge.updateMany({ where: { venueId }, data: { isPrimary: false } });
    await tx.venueJudge.upsert({ where: { venueId_judgeId: { venueId, judgeId } }, create: { id: crypto.randomUUID(), venueId, judgeId, role, isPrimary: primary }, update: { role, isPrimary: primary } });
  });
  return true;
}
