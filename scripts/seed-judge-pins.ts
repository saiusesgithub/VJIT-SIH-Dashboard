import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { developmentPinForAssignment, officialVenues } from "../src/data/seed/event-configuration";
import { createJudgePinLookup, JUDGE_PIN_BCRYPT_COST } from "../src/lib/judge-pin-credential";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before seeding judge PINs.");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const developmentPins = officialVenues.flatMap((venue, venueIndex) =>
  venue.judges.map((judge, judgeIndex) => ({
    venueId: venue.id,
    judgeId: judge.id,
    pin: developmentPinForAssignment(venueIndex + 1, judgeIndex, judge),
  })),
);
async function main() {
  for (const credential of developmentPins) {
    const result = await prisma.venueJudge.updateMany({
      where: { venueId: credential.venueId, judgeId: credential.judgeId },
      data: {
        pinHash: await hash(credential.pin, JUDGE_PIN_BCRYPT_COST),
        pinLookup: createJudgePinLookup(credential.pin),
      },
    });
    if (result.count !== 1) {
      throw new Error(`Expected one assignment for ${credential.venueId}/${credential.judgeId}; found ${result.count}.`);
    }
  }
  console.info(`Development judge PIN hashes updated for ${developmentPins.length} venue assignments.`);
}

main()
  .catch((error) => {
    console.error("Judge PIN seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
