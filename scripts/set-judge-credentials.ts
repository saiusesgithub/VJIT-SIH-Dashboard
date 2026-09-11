import "dotenv/config";
import { compare, hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeJudgePhone } from "../src/lib/judge-credentials";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before changing judge credentials.");

const [judgeId, phoneInput, password] = process.argv.slice(2);
const phone = normalizeJudgePhone(phoneInput ?? "");
if (!/^[a-z0-9-]{1,100}$/i.test(judgeId ?? "") || phone.length !== 10 || !password || password.length < 8 || password.length > 128) {
  throw new Error("Usage: npm run db:set-judge-credentials -- <judge-id> <10-digit-phone> <password>");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const judge = await prisma.judge.update({
    where: { id: judgeId },
    data: { phone, passwordHash: await hash(password, 12) },
    select: { id: true, name: true, phone: true, passwordHash: true, venueAssignments: { select: { venue: { select: { roomNumber: true } } } } },
  });
  console.info(JSON.stringify({ updated: true, judgeId: judge.id, name: judge.name, phone: judge.phone, rooms: judge.venueAssignments.map((assignment) => assignment.venue.roomNumber), passwordHashStored: Boolean(judge.passwordHash), passwordVerified: await compare(password, judge.passwordHash!) }));
}

main().catch((error) => { console.error("Unable to update judge credentials", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
