# VJIT SIH Evaluation Dashboard

Faculty operations dashboard and mobile judge evaluation workspace for the VJIT SIH Internal Hackathon. The app uses Next.js App Router, Prisma ORM, Neon PostgreSQL, signed PIN sessions, and conservative PWA support.

## Architecture

```text
Admin server components
  → evaluation repository
  → Prisma Client with the Neon serverless adapter
  → Neon PostgreSQL

Judge server components / review route handlers
  → judge repository and authorization service
  → Prisma transaction
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

The same `ADMIN_SESSION_SECRET` signs a separately scoped 12-hour judge cookie. Judge identities and venue IDs come from the signed cookie and are verified against the database on every protected data operation; raw judge PINs never enter a cookie or database row.

## Local setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed:judge-pins
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin).

The committed migrations create all tables and relationships and add a bcrypt judge PIN hash to each venue assignment. The full seed is idempotent for the stable `vjit-sih-2026` event: it removes and recreates only that hackathon and its dependent rows, while upserting judge records. It restores 48 teams and completed-review totals of 39, 25, and 7 for rounds 1–3.

For development only, the deterministic judge PINs are:

- Lab 1: `1111`
- Lab 2: `2222`
- Lab 3: `3333`
- Lab 4: `4444`

Only bcrypt hashes are stored. `npm run db:seed:judge-pins` safely updates just the four existing assignment hashes without resetting hackathon or review data. Replace these credentials before a real event by setting new bcrypt hashes on the relevant `VenueJudge` records; never reuse the development PINs in production.

## Database commands

```bash
npm run db:generate  # Generate the typed Prisma client
npm run db:migrate   # Create/apply development migrations
npm run db:deploy    # Apply committed migrations in CI/production
npm run db:seed      # Deterministically seed the internal hackathon
npm run db:seed:judge-pins # Update only development assignment PIN hashes
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
- `/judge/login` — public judge/mentor PIN entry
- `/judge` — assigned venue progress and teams
- `/judge/teams/[teamId]` — authorized team and review-round overview
- `/judge/teams/[teamId]/reviews/[roundId]` — data-driven scoring form or locked submitted review

Unknown venue and team IDs return the existing not-found experience. Database failures render a generic admin error state without exposing connection details.

## Faculty access protection

All `/admin` routes except `/admin/login` and its submission endpoint are checked by `src/proxy.ts`. The protected admin route-group layout verifies the signed cookie again before loading repository data. Successful login stores an HMAC-signed, HTTP-only, SameSite=Lax cookie for 12 hours; the PIN is never stored in the cookie. Use the **Lock** action in the dashboard header to clear the session.

Set `ADMIN_PIN` and `ADMIN_SESSION_SECRET` for Development, Preview, and Production in **Vercel → Project Settings → Environment Variables** before deployment.

## Judge evaluation and PWA behavior

Judge access is assignment-based: each `VenueJudge` row has a one-way bcrypt PIN hash. A successful PIN creates the HTTP-only `sih_judge_session` cookie. The server derives judge and venue identity from that signed session and returns not found for teams outside the assigned venue.

Opening an editable review marks it `IN_PROGRESS` once. Final submission validates every score against the database rubric, upserts score rows and completes the review inside a serializable Prisma transaction. Retried identical submissions are idempotent; completed reviews are read-only.

While editing, the browser stores a local draft scoped to judge, team, and round. Failed submissions keep the draft, successful submissions remove it, and signing out intentionally leaves drafts on the device.

The manifest and service worker make the judge interface installable where supported. The service worker caches only static assets, icons, and the manifest. Navigation, team/review data, submission endpoints, and admin analytics are never runtime-cached, so PostgreSQL remains the source of truth.

For Vercel, configure `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_PIN`, and `ADMIN_SESSION_SECRET` in every target environment. Apply `npm run db:deploy`, then run either the intentional full seed for a fresh development environment or provision real judge PIN hashes separately. Do not run the development PIN seed in production.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```
