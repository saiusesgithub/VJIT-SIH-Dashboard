import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, VenueJudgeRole } from "../src/generated/prisma/client";
import { normalizeJudgeName } from "../src/lib/judge-credentials";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before applying Day 2 judge assignments.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const shouldApply = process.argv.includes("--apply");

type JudgeAssignment = {
  judgeId?: string;
  aliases?: string[];
  createIfMissing?: { id: string; name: string; designation: string; department: string };
  role: VenueJudgeRole;
  primary?: boolean;
};

// Transcribed from SIH_DAY2_VENUES.xlsx - Sheet1-1.pdf. Known stable IDs are
// used where available. The S-201 PDF label was corrected by the coordinator to
// Mr. Mohammed Adil, who is already present in the original credential roster.
const day2Assignments: Array<{ room: string; judges: JudgeAssignment[] }> = [
  { room: "C-201", judges: [{ judgeId: "external-chaithanya", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-phanindra", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-203", judges: [{ judgeId: "external-harshitha", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-tarangini", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-205", judges: [{ judgeId: "external-raghu-kiran", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-madhuri-paul", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-209", judges: [{ judgeId: "external-revanth-vaddi", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-umashankar", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-306", judges: [{ judgeId: "external-himaja-k", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-nandhitha", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-307", judges: [{ judgeId: "external-sujith-g", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-kalyani", role: VenueJudgeRole.INTERNAL }] },
  { room: "S-201", judges: [{ judgeId: "external-mohammed-adil", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-ravi-kumar", role: VenueJudgeRole.INTERNAL }] },
  { room: "S-303", judges: [{ judgeId: "external-praveen-martin", role: VenueJudgeRole.EXTERNAL, primary: true }, { judgeId: "internal-marlin-linda", role: VenueJudgeRole.INTERNAL }] },
  { room: "C-309", judges: [{ judgeId: "external-vinay-reddy", role: VenueJudgeRole.EXTERNAL, primary: true }, { aliases: ["Mrs. Vijaya", "Vijaya"], createIfMissing: { id: "day2-internal-vijaya-cse", name: "Mrs. Vijaya", designation: "Internal Judge", department: "CSE" }, role: VenueJudgeRole.INTERNAL }] },
  { room: "S-103", judges: [{ judgeId: "internal-srinivasa-rao", role: VenueJudgeRole.INTERNAL, primary: true }, { judgeId: "internal-sailaja", role: VenueJudgeRole.INTERNAL }] },
];

async function main() {
  const event = (await prisma.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" } }))
    ?? await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" } });
  if (!event) throw new Error("No hackathon event found.");

  const [venues, judges] = await Promise.all([
    prisma.venue.findMany({ where: { hackathonId: event.id }, select: { id: true, roomNumber: true, code: true } }),
    prisma.judge.findMany({ select: { id: true, name: true, passwordHash: true } }),
  ]);
  const day2Venues = venues.filter((venue) => venue.code.startsWith("DAY2-"));
  const venueByRoom = new Map(day2Venues.map((venue) => [venue.roomNumber.toUpperCase(), venue]));
  const judgeById = new Map(judges.map((judge) => [judge.id, judge]));
  const judgeByName = new Map(judges.map((judge) => [normalizeJudgeName(judge.name), judge]));

  const resolved = day2Assignments.flatMap(({ room, judges: required }) => required.map((requirement) => {
    const judge = requirement.judgeId
      ? judgeById.get(requirement.judgeId)
      : requirement.aliases?.map((name) => judgeByName.get(normalizeJudgeName(name))).find(Boolean);
    return { room, role: requirement.role, primary: Boolean(requirement.primary), judge, createIfMissing: requirement.createIfMissing };
  }));

  const missingVenues = day2Assignments.map((assignment) => assignment.room).filter((room) => !venueByRoom.has(room));
  const unresolved = resolved.filter((assignment) => !assignment.judge && !assignment.createIfMissing);
  if (missingVenues.length || unresolved.length) {
    throw new Error(JSON.stringify({
      missingDay2Venues: missingVenues,
      unresolvedJudges: unresolved.map((item) => ({ room: item.room, role: item.role, reason: "not-found" })),
    }));
  }

  const summary = resolved.map((item) => ({ room: item.room, judge: item.judge?.name ?? item.createIfMissing!.name, role: item.role, primary: item.primary, loginEnabled: Boolean(item.judge?.passwordHash) }));
  if (!shouldApply) {
    console.info(JSON.stringify({ mode: "dry-run", assignments: summary, note: "Run again with --apply to replace Day 1 judge assignments." }, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.venueJudge.deleteMany({ where: { venue: { hackathonId: event.id } } });
    for (const item of resolved) {
      const venue = venueByRoom.get(item.room)!;
      const judge = item.judge ?? await tx.judge.create({ data: item.createIfMissing! });
      await tx.venueJudge.create({ data: { id: crypto.randomUUID(), venueId: venue.id, judgeId: judge.id, role: item.role, isPrimary: item.primary } });
    }
    await tx.judge.deleteMany({ where: { id: "day2-external-mohammad-ali", venueAssignments: { none: {} }, reviews: { none: {} }, reviewsCompleted: { none: {} } } });
  }, { maxWait: 10_000, timeout: 120_000 });

  const liveAssignments = await prisma.venueJudge.findMany({
    where: { venue: { hackathonId: event.id } },
    select: { venue: { select: { roomNumber: true } }, judge: { select: { name: true } }, role: true, isPrimary: true },
    orderBy: [{ venue: { roomNumber: "asc" } }, { isPrimary: "desc" }],
  });
  console.info(JSON.stringify({ mode: "applied", assignmentCount: liveAssignments.length, assignments: liveAssignments }, null, 2));
}

main().catch((error) => { console.error("Day 2 judge assignment failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
