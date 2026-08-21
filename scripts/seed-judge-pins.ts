import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createJudgePinLookup, JUDGE_PIN_BCRYPT_COST } from "../src/lib/judge-pin-credential";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before seeding judge PINs.");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const developmentPins = [
  { venueId: "lab-1", judgeId: "judge-1", pin: "1111" },
  { venueId: "lab-2", judgeId: "judge-2", pin: "2222" },
  { venueId: "lab-3", judgeId: "judge-3", pin: "3333" },
  { venueId: "lab-4", judgeId: "judge-4", pin: "4444" },
];
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
  console.info("Development judge PIN hashes updated for 4 venue assignments.");
}

main()
  .catch((error) => {
    console.error("Judge PIN seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
