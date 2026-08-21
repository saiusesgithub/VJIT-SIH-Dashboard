# VJIT SIH Evaluation Dashboard

Faculty operations dashboard for the VJIT SIH Internal Hackathon. The current iteration uses Next.js App Router server components, Prisma ORM, Neon PostgreSQL, and shared-PIN protection for faculty routes. Judge authentication and PWA support remain out of scope.

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
4. Copy the direct/unpooled connection string into `DATABASE_URL_UNPOOLED`.
5. Copy `.env.example` to `.env` and add both values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DATABASE?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require"
DIRECT_URL=""
ADMIN_PIN="your-shared-faculty-pin"
ADMIN_SESSION_SECRET="a-random-secret-with-at-least-32-characters"
```

`DATABASE_URL` is used only by the server-side application through `@prisma/adapter-neon`. `DATABASE_URL_UNPOOLED` is used by Prisma CLI for migrations and seed operations; `DIRECT_URL` is supported as an optional alias. Never expose database or admin secrets with a `NEXT_PUBLIC_` prefix.

Generate a strong session secret with either command:

```bash
openssl rand -hex 32
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`ADMIN_PIN` is the shared faculty PIN. `ADMIN_SESSION_SECRET` signs the 12-hour HTTP-only session cookie and must contain at least 32 characters. Changing either value invalidates existing access expectations; changing the session secret immediately invalidates all active sessions.

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
npm run db:verify    # Verify Neon connectivity and dashboard row counts
npm run db:studio    # Open Prisma Studio
```

## Vercel deployment

1. Add `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in **Project Settings → Environment Variables** for the required Preview and Production environments.
2. Use Neon's pooled connection for `DATABASE_URL` and direct connection for `DATABASE_URL_UNPOOLED`.
3. Before deploying an application version with schema changes, run `npm run db:deploy` from a trusted local or CI environment with the production `DATABASE_URL_UNPOOLED` configured.
4. Deploy normally. The build command generates Prisma Client before running `next build`.

Do not run `prisma migrate dev` against the production database. Do not seed production unless the deterministic internal demo dataset is intentionally required.

## Application routes

- `/admin/login` — public faculty PIN entry
- `/admin` — event analytics and live review activity
- `/admin/venues/[venueId]` — venue progress and assigned teams
- `/admin/teams/[teamId]` — team information, members, rubrics, scores, and feedback

Unknown venue and team IDs return the existing not-found experience. Database failures render a generic admin error state without exposing connection details.

## Faculty access protection

All `/admin` routes except `/admin/login` and its submission endpoint are checked by `src/proxy.ts`. The protected admin route-group layout verifies the signed cookie again before loading repository data. Successful login stores an HMAC-signed, HTTP-only, SameSite=Lax cookie for 12 hours; the PIN is never stored in the cookie. Use the **Lock** action in the dashboard header to clear the session.

Set `ADMIN_PIN` and `ADMIN_SESSION_SECRET` for Development, Preview, and Production in **Vercel → Project Settings → Environment Variables** before deployment.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```
