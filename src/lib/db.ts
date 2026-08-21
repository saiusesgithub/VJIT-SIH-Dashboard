import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConnectionString?: string;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. See .env.example and README.md.");
  }

  if (globalForPrisma.prisma && globalForPrisma.prismaConnectionString === connectionString) {
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // Vercel Fluid compute can serve concurrent requests from one warm process.
  // Keep one client per process in production as well as across local hot reloads.
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConnectionString = connectionString;

  return prisma;
}
