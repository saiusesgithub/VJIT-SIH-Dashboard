import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, VenueJudgeRole } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database connection is required.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const [passwordedJudges, judges, assignments] = await Promise.all([
    prisma.judge.count({ where: { passwordHash: { not: null } } }),
    prisma.judge.count(),
    prisma.venueJudge.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const assignmentCounts = Object.fromEntries(assignments.map((item) => [item.role, item._count._all]));
  if (passwordedJudges !== 40 || judges < passwordedJudges || !assignmentCounts[VenueJudgeRole.EXTERNAL] || !assignmentCounts[VenueJudgeRole.INTERNAL]) {
    throw new Error(`Judge credential verification failed: ${JSON.stringify({ passwordedJudges, judges, assignmentCounts })}`);
  }
  console.info(JSON.stringify({ passwordedJudges, judges, assignmentCounts }));
}

main().catch((error) => { console.error("Judge credential verification failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
