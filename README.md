# VJIT SIH Evaluation Dashboard

Faculty operations dashboard for the VJIT SIH Internal Hackathon. The current iteration uses Next.js App Router server components, Prisma ORM, and Neon PostgreSQL. Authentication, judge workflows, and PWA support are intentionally out of scope.

## Architecture

```text
Admin server components
  → evaluation repository
  → Prisma Client with the Neon serverless adapter
  → Neon PostgreSQL
```

React components do not query Prisma directly. The files in `src/data/mock` are retained only as deterministic source data for `prisma/seed.ts`; normal application rendering does not import them.

## Neon database setup

1. Create a free project in the [Neon console](https://console.neon.tech/).
2. Open **Connection Details** for the database.
3. Copy the pooled connection string (its hostname normally contains `-pooler`) into `DATABASE_URL`.
4. Copy the direct/unpooled connection string into `DIRECT_URL`.
5. Copy `.env.example` to `.env` and add both values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require"
```

`DATABASE_URL` is used only by the server-side application through `@prisma/adapter-neon`. `DIRECT_URL` is used by Prisma CLI for migrations and seed operations. Never expose either variable with a `NEXT_PUBLIC_` prefix.

## Local setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin).

The committed initial migration creates all tables and relationships. The seed is idempotent for the stable `vjit-sih-2026` event: it removes and recreates only that hackathon and its dependent rows, while upserting judge records. It restores 48 teams and completed-review totals of 39, 25, and 7 for rounds 1–3.

## Database commands

```bash
npm run db:generate  # Generate the typed Prisma client
npm run db:migrate   # Create/apply development migrations
npm run db:deploy    # Apply committed migrations in CI/production
npm run db:seed      # Deterministically seed the internal hackathon
npm run db:studio    # Open Prisma Studio
```

## Vercel deployment

1. Add `DATABASE_URL` and `DIRECT_URL` in **Project Settings → Environment Variables** for the required Preview and Production environments.
2. Use Neon's pooled connection for `DATABASE_URL` and direct connection for `DIRECT_URL`.
3. Before deploying an application version with schema changes, run `npm run db:deploy` from a trusted local or CI environment with the production `DIRECT_URL` configured.
4. Deploy normally. The build command generates Prisma Client before running `next build`.

Do not run `prisma migrate dev` against the production database. Do not seed production unless the deterministic internal demo dataset is intentionally required.

## Application routes

- `/admin` — event analytics and live review activity
- `/admin/venues/[venueId]` — venue progress and assigned teams
- `/admin/teams/[teamId]` — team information, members, rubrics, scores, and feedback

Unknown venue and team IDs return the existing not-found experience. Database failures render a generic admin error state without exposing connection details.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```
