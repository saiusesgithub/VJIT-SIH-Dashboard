import "server-only";
import { hash } from "bcryptjs";
import { VenueJudgeRole } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { normalizeJudgePhone } from "@/lib/judge-credentials";

async function event() { return getDb().hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } }); }
const clean = (value: string) => value.trim();

export async function getAdminManagementData() {
  const current = await event();
  if (!current) return { venues: [], judges: [] };
  const [venues, judges] = await Promise.all([
    getDb().venue.findMany({ where: { hackathonId: current.id }, orderBy: { displayOrder: "asc" }, select: { id: true, code: true, name: true, roomNumber: true } }),
    getDb().judge.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, designation: true } }),
  ]);
  return { venues, judges };
}

export async function createVenue(input: Record<string, string>) {
  const current = await event(); if (!current) return false;
  const code = clean(input.code); const name = clean(input.name); const roomNumber = clean(input.roomNumber);
  if (!code || !name || !roomNumber || code.length > 32 || name.length > 80 || roomNumber.length > 80) return false;
  const last = await getDb().venue.aggregate({ where: { hackathonId: current.id }, _max: { displayOrder: true } });
  await getDb().venue.create({ data: { id: crypto.randomUUID(), hackathonId: current.id, code, name, roomNumber, building: clean(input.building) || null, theme: clean(input.theme) || null, teamCodeRange: clean(input.teamCodeRange) || null, displayOrder: (last._max.displayOrder ?? 0) + 1 } }); return true;
}

export async function createTeam(input: Record<string, string>) {
  const current = await event(); if (!current) return false;
  const venueId = clean(input.venueId); const teamCode = clean(input.teamCode).toUpperCase(); const teamName = clean(input.teamName); const problemCode = clean(input.problemCode).toUpperCase(); const problemTitle = clean(input.problemTitle);
  if (!venueId || !teamCode || !teamName || !problemCode || !problemTitle) return false;
  const venue = await getDb().venue.findFirst({ where: { id: venueId, hackathonId: current.id }, select: { id: true } }); if (!venue) return false;
  let statement = await getDb().problemStatement.findUnique({ where: { hackathonId_code: { hackathonId: current.id, code: problemCode } }, select: { id: true } });
  if (!statement) statement = await getDb().problemStatement.create({ data: { id: crypto.randomUUID(), hackathonId: current.id, venueId, code: problemCode, title: problemTitle, description: clean(input.problemDescription) || problemTitle, theme: clean(input.theme) || null }, select: { id: true } });
  await getDb().team.create({ data: { id: crypto.randomUUID(), hackathonId: current.id, venueId, problemStatementId: statement.id, teamCode, teamName } }); return true;
}

export async function createJudge(input: Record<string, string>) {
  const name = clean(input.name); const phone = normalizeJudgePhone(input.phone ?? ""); const password = input.password ?? ""; const venueId = clean(input.venueId);
  if (!name || phone.length < 10 || password.length < 6 || !venueId) return false;
  const current = await event(); if (!current || !(await getDb().venue.findFirst({ where: { id: venueId, hackathonId: current.id } }))) return false;
  const judge = await getDb().judge.create({ data: { id: crypto.randomUUID(), name, phone, passwordHash: await hash(password, 12), designation: clean(input.designation) || "Judge", department: clean(input.department) || "—" } });
  await assignJudgeToVenue({ judgeId: judge.id, venueId, role: input.role, primary: input.primary }); return true;
}

export async function assignJudgeToVenue(input: Record<string, string>) {
  const judgeId = clean(input.judgeId); const venueId = clean(input.venueId); const primary = input.primary === "on"; const role = input.role === "EXTERNAL" ? VenueJudgeRole.EXTERNAL : VenueJudgeRole.INTERNAL;
  const current = await event(); if (!current || !judgeId || !venueId || !(await getDb().judge.findUnique({ where: { id: judgeId } })) || !(await getDb().venue.findFirst({ where: { id: venueId, hackathonId: current.id } }))) return false;
  await getDb().$transaction(async (tx) => { if (primary) await tx.venueJudge.updateMany({ where: { venueId }, data: { isPrimary: false } }); await tx.venueJudge.upsert({ where: { venueId_judgeId: { venueId, judgeId } }, create: { id: crypto.randomUUID(), venueId, judgeId, role, isPrimary: primary }, update: { role, isPrimary: primary } }); }); return true;
}
