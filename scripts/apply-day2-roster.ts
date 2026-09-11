import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, ShortlistingDecision } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before applying the Day 2 roster.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const shouldApply = process.argv.includes("--apply");
const workbookPath = process.argv.slice(2).find((value) => value !== "--apply");

interface Day2VenueGroup {
  order: number;
  room: string;
  teamCodes: string[];
}

function cellText(value: ExcelJS.CellValue | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result !== undefined) return String(value.result).trim();
  }
  return String(value).trim();
}

function normalizeTeamCode(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{2})-?(\d{1,3})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : compact;
}

function venueIdForRoom(room: string) {
  return `venue-day2-${room.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

async function readRoster(path: string): Promise<Day2VenueGroup[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in the Day 2 venue workbook.");

  const groups = new Map<string, Day2VenueGroup>();
  let activeRoom = "";
  let activeOrder = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const room = cellText(row.getCell(3).value).toUpperCase();
    const serial = Number(cellText(row.getCell(1).value));
    if (room) {
      activeRoom = room;
      activeOrder = Number.isFinite(serial) && serial > 0 ? serial : activeOrder + 1;
      if (!groups.has(room)) groups.set(room, { order: activeOrder, room, teamCodes: [] });
    }

    const teamCode = cellText(row.getCell(2).value);
    if (teamCode && activeRoom) groups.get(activeRoom)?.teamCodes.push(normalizeTeamCode(teamCode));
  });

  const result = [...groups.values()].sort((left, right) => left.order - right.order);
  const codes = result.flatMap((group) => group.teamCodes);
  const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
  if (duplicates.length) throw new Error(`Duplicate team IDs in spreadsheet: ${[...new Set(duplicates)].join(", ")}`);
  if (codes.length !== 90) throw new Error(`Expected 90 shortlisted teams in the workbook, found ${codes.length}.`);
  return result;
}

async function main() {
  if (!workbookPath) throw new Error("Usage: npm run db:day2-roster -- <workbook-path> [--apply]");
  const groups = await readRoster(workbookPath);
  const selectedCodes = groups.flatMap((group) => group.teamCodes);
  const event = (await prisma.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" } }))
    ?? await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" } });
  if (!event) throw new Error("No hackathon event found.");

  const teams = await prisma.team.findMany({ where: { hackathonId: event.id }, select: { id: true, teamCode: true, venueId: true, finalDecision: true } });
  const teamByCode = new Map(teams.map((team) => [normalizeTeamCode(team.teamCode), team]));
  const missing = selectedCodes.filter((code) => !teamByCode.has(code));
  if (missing.length) throw new Error(`These shortlisted teams are not in the database: ${missing.join(", ")}`);

  const preflight = {
    mode: shouldApply ? "apply" : "dry-run",
    hackathon: event.name,
    eventTeamCount: teams.length,
    shortlistedTeamCount: selectedCodes.length,
    eliminatedTeamCount: teams.length - selectedCodes.length,
    venues: groups.map((group) => ({ room: group.room, teamCount: group.teamCodes.length, teamCodes: group.teamCodes })),
  };
  if (!shouldApply) {
    console.info(JSON.stringify(preflight, null, 2));
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentVenues = await tx.venue.findMany({ where: { hackathonId: event.id }, select: { id: true, code: true, displayOrder: true } });
    const venuesByCode = new Map(currentVenues.map((venue) => [venue.code, venue]));
    let nextDisplayOrder = Math.max(0, ...currentVenues.map((venue) => venue.displayOrder)) + 1;
    const targetVenueByRoom = new Map<string, string>();

    for (const group of groups) {
      const code = `DAY2-${group.room}`;
      const existing = venuesByCode.get(code);
      const data = {
        name: `Day 2 Venue ${group.order}`,
        roomNumber: group.room,
        building: null,
        theme: null,
        teamCodeRange: "Day 2 shortlisted teams",
        plannedTeamCount: group.teamCodes.length,
      };
      const venue = existing
        ? await tx.venue.update({ where: { id: existing.id }, data, select: { id: true } })
        : await tx.venue.create({ data: { id: venueIdForRoom(group.room), hackathonId: event.id, code, displayOrder: nextDisplayOrder++, ...data }, select: { id: true } });
      targetVenueByRoom.set(group.room, venue.id);
    }

    let shortlistedUpdated = 0;
    for (const group of groups) {
      const venueId = targetVenueByRoom.get(group.room)!;
      for (const teamCode of group.teamCodes) {
        const team = teamByCode.get(teamCode)!;
        if (team.venueId === venueId && team.finalDecision === ShortlistingDecision.SHORTLISTED) continue;
        await tx.team.update({
          where: { id: team.id },
          data: {
            venueId,
            ...(team.finalDecision === ShortlistingDecision.SHORTLISTED ? {} : {
              finalDecision: ShortlistingDecision.SHORTLISTED,
              decisionUpdatedAt: new Date(),
              decisionRevision: { increment: 1 },
            }),
          },
        });
        shortlistedUpdated += 1;
      }
    }

    const eliminated = await tx.team.updateMany({
      where: {
        hackathonId: event.id,
        id: { notIn: selectedCodes.map((code) => teamByCode.get(code)!.id) },
        OR: [{ finalDecision: null }, { finalDecision: { not: ShortlistingDecision.ELIMINATED } }],
      },
      data: { finalDecision: ShortlistingDecision.ELIMINATED, decisionUpdatedAt: new Date(), decisionRevision: { increment: 1 } },
    });
    return { shortlistedUpdated, eliminatedUpdated: eliminated.count };
  }, { maxWait: 10_000, timeout: 120_000 });

  const [decisionCounts, day2Venues] = await Promise.all([
    prisma.team.groupBy({ where: { hackathonId: event.id }, by: ["finalDecision"], _count: { _all: true } }),
    prisma.venue.findMany({ where: { hackathonId: event.id, code: { startsWith: "DAY2-" } }, select: { roomNumber: true, teams: { select: { id: true } } }, orderBy: { roomNumber: "asc" } }),
  ]);
  console.info(JSON.stringify({
    ...preflight,
    ...result,
    verification: {
      decisions: decisionCounts.map((entry) => ({ decision: entry.finalDecision, count: entry._count._all })),
      day2VenueTeamCounts: day2Venues.map((venue) => ({ room: venue.roomNumber, teamCount: venue.teams.length })),
    },
  }, null, 2));
}

main().catch((error) => { console.error("Day 2 roster update failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
