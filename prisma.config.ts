import "dotenv/config";
import { defineConfig } from "prisma/config";

const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DIRECT_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DIRECT_URL is required for Prisma CLI operations.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
