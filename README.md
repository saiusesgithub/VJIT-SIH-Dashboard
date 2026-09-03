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

Team server components / scoped write handlers
  → team repository and signed team session
  → Prisma Client
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
JUDGE_PIN_LOOKUP_SECRET="another-random-secret-with-at-least-32-characters"
TEAM_ACCESS_LOOKUP_SECRET="a-third-random-secret-with-at-least-32-characters"
TEAM_ACCESS_ENCRYPTION_SECRET="a-fourth-random-secret-with-at-least-32-characters"
```

`DATABASE_URL` is used only by the server-side application through `@prisma/adapter-neon`. `DATABASE_URL_UNPOOLED` is used by Prisma CLI for migrations and seed operations; `DIRECT_URL` is supported as an optional alias. Never expose database or admin secrets with a `NEXT_PUBLIC_` prefix.

Generate a strong session secret with either command:

```bash
openssl rand -hex 32
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`ADMIN_PIN` is the shared faculty PIN. `ADMIN_SESSION_SECRET` signs the HTTP-only admin, judge, and team session cookies and must contain at least 32 characters. `JUDGE_PIN_LOOKUP_SECRET` and `TEAM_ACCESS_LOOKUP_SECRET` create keyed credential lookups and should stay identical for every deployment that accesses the same database. `TEAM_ACCESS_ENCRYPTION_SECRET` encrypts the recoverable team code shown on authenticated faculty team-detail pages. Each has a documented fallback for existing environments, but separate production values are recommended. Changing a lookup secret requires reseeding its matching lookup values; changing the encryption secret requires reseeding team codes; changing the session secret immediately invalidates active sessions.

The same `ADMIN_SESSION_SECRET` signs a separately scoped 12-hour judge cookie. Judge identities and venue IDs come from the signed cookie and are verified against the database on every protected data operation; raw judge PINs never enter a cookie or database row.

## Local setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed:judge-pins
npm run db:seed:team-codes
npm run db:seed:team-portal
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin).

The committed migrations create all tables and relationships and add a bcrypt judge PIN hash to each venue assignment. The full seed is idempotent for the stable `vjit-sih-2026` event: it removes and recreates only that hackathon and its dependent rows, while upserting judge records. It restores 48 teams and completed-review totals of 39, 25, and 7 for rounds 1–3.

For development only, the deterministic judge PINs are:

- Lab 1: `1111`
- Lab 2: `2222`
- Lab 3: `3333`
- Lab 4: `4444`

No raw PIN is stored. Each assignment keeps a bcrypt cost-10 hash plus a keyed HMAC lookup derived with `JUDGE_PIN_LOOKUP_SECRET` (or the documented fallback). The lookup identifies one assignment without running bcrypt against every judge, then bcrypt verifies the submitted PIN. `npm run db:seed:judge-pins` safely updates both values for the four existing assignments without resetting hackathon or review data. If the lookup secret changes, rerun this command so the stored values match it. Replace the development credentials before a real event; never reuse them in production.

For development, team access codes are deterministic: `T001` uses `DEV-T001`, continuing through `DEV-T048`. Login uses a bcrypt hash plus a keyed HMAC lookup. A separate AES-256-GCM ciphertext lets authenticated faculty recover a missed code from the admin team page; plaintext codes are not retained in PostgreSQL. The signed team cookie contains only the internal team ID, expiry, scope, and a nonce. `npm run db:seed:team-codes` updates only team credentials without resetting reviews, submissions, or issues. These predictable values are development-only. Before the event, coordinators should provision random 8–12 character codes through the same helpers and never commit them.

## Database commands

```bash
npm run db:generate  # Generate the typed Prisma client
npm run db:migrate   # Create/apply development migrations
npm run db:deploy    # Apply committed migrations in CI/production
npm run db:seed      # Deterministically seed the internal hackathon
npm run db:seed:judge-pins # Update only development assignment PIN hashes
npm run db:seed:team-codes # Update only deterministic development team-code hashes
npm run db:seed:team-portal # Non-destructively upsert team portal development fixtures
npm run db:verify    # Verify Neon connectivity and dashboard row counts
npm run db:verify:team-portal # Verify team credentials, fixtures, and review totals
npm run db:studio    # Open Prisma Studio
```

## Vercel deployment

1. Add `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `JUDGE_PIN_LOOKUP_SECRET`, and `TEAM_ACCESS_LOOKUP_SECRET` in **Project Settings → Environment Variables** for the required Preview and Production environments.
2. Use Neon's pooled connection for `DATABASE_URL` and direct connection for `DATABASE_URL_UNPOOLED`.
3. Keep the Vercel Function region aligned with the Neon region. This repository's Neon database is in AWS `ap-southeast-1`, so `vercel.json` pins Vercel Functions to Singapore (`sin1`) and enables Fluid compute.
4. Before deploying an application version with schema changes, run `npm run db:deploy` from a trusted local or CI environment with the production `DATABASE_URL_UNPOOLED` configured.
5. Deploy normally. The build command generates Prisma Client before running `next build`.

If the Neon project is moved to another region, update `regions` in `vercel.json` to the nearest Vercel Function region. Keeping application compute near PostgreSQL avoids paying intercontinental network latency for every server-rendered database query.

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
- `/team/login` — public team access-code entry
- `/team` — authenticated team status and event summary
- `/team/reviews` — review states and faculty-released feedback (never scores)
- `/team/submissions` — project-link management
- `/team/announcements` — active team/venue/event notices
- `/team/issues` — team-scoped support issues and faculty responses

Unknown venue and team IDs return the existing not-found experience. Database failures render a generic admin error state without exposing connection details.

## Faculty access protection

All `/admin` routes except `/admin/login` and its submission endpoint are checked by `src/proxy.ts`. The protected admin route-group layout verifies the signed cookie again before loading repository data. Successful login stores an HMAC-signed, HTTP-only, SameSite=Lax cookie for 12 hours; the PIN is never stored in the cookie. Use the **Lock** action in the dashboard header to clear the session.

Set `ADMIN_PIN` and `ADMIN_SESSION_SECRET` for Development, Preview, and Production in **Vercel → Project Settings → Environment Variables** before deployment.

## Judge evaluation and PWA behavior

Judge access is assignment-based: each `VenueJudge` row has a one-way bcrypt PIN hash. A successful PIN creates the HTTP-only `sih_judge_session` cookie. The server derives judge and venue identity from that signed session and returns not found for teams outside the assigned venue.

Opening an editable review marks it `IN_PROGRESS` once. Final submission validates every score against the database rubric, upserts score rows and completes the review inside a serializable Prisma transaction. Retried identical submissions are idempotent; completed reviews are read-only.

While editing, the browser stores a local draft scoped to judge, team, and round. Failed submissions keep the draft, successful submissions remove it, and signing out intentionally leaves drafts on the device.

The manifests and service worker make both judge and team interfaces installable where supported. On eligible Chromium browsers, each interface presents its own install sheet and opens the browser installation prompt after the user taps **Install app**. On iPhone/iPad, the sheet explains Safari's **Share → Add to Home Screen** flow. Dismissing a sheet hides it for seven days for that interface, and installed apps do not show it. Browser security does not permit silent installation without a user gesture.

The service worker caches only static assets, icons, and manifests. Navigation, authenticated team/review data, write endpoints, and admin analytics are never runtime-cached, so PostgreSQL remains the source of truth. Team logout clears the cookie and browser HTTP cache while intentionally preserving no sensitive runtime response cache.

For Vercel, configure `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `JUDGE_PIN_LOOKUP_SECRET`, `TEAM_ACCESS_LOOKUP_SECRET`, and `TEAM_ACCESS_ENCRYPTION_SECRET` in every target environment. Apply `npm run db:deploy`, then run either the intentional full seed for a fresh development environment or provision real judge/team credentials separately. After deploying this migration to an existing development database, run `npm run db:seed:team-codes` once to populate encrypted recovery values. Do not run development credential seeds in production.

## Validation

### Faculty shortlisting and problem statement analytics

- Faculty can assign **SHORTLISTED**, **HOLD**, or **ELIMINATED** from the leaderboard or an admin team-detail page after that team's **Review 3 is COMPLETED**. The server enforces eligibility; opening the form is not enough. Decisions start unset and do not change marks or ranks. They are private to faculty, not published to teams or judges.
- Decisions require confirmation and record the latest update timestamp. Faculty can revise them. Optimistic revision checks prevent a stale browser tab overwriting a newer decision; retries of the same decision are idempotent. This is a shared-faculty-PIN workflow, so individual faculty attribution is not available.
- `/admin/problem-statements` shows every PS, participating teams, average/highest/lowest scores, sample size, and per-round completion/active/pending counts. Overall statistics use only teams with **every round completed**. Select a round to compare completed scores for just that round. Empty samples display `—`, not zero. Counts are derived from review rows; no duplicate analytics are stored.
- Small samples, team ability, and different judges affect comparisons. These are descriptive statistics, not a definitive ranking of problem difficulty.

Apply the additive migration before deploying this version: `npm run db:deploy`, then `npm run db:generate`. Existing decisions remain unset. **Do not reseed** an ongoing event; no seed or new environment variable is required. Run `npm run test:faculty` for ranking, analytics, eligibility, input validation, and cross-role session tests.

For integration tests, build and start the app on port 3100 using a **development database**, then run `npx tsx scripts/verify-faculty-results.ts` with the same `.env`. It checks faculty-only pages/writes, CSRF rejection, Review 3 gating, persistence, retries and conflicting submissions. It creates one isolated temporary test event and removes that event in `finally`; it never modifies real team decisions. Do not run this fixture-writing test against an event's production database.

### Faculty-only leaderboard

Open `/admin/leaderboard` from the admin sidebar. Only an admin-scoped session can query or render these standings; judge and team cookies cannot grant access. Existing faculty sessions issued before the explicit admin scope was introduced must sign in again once. No schema migration or new environment variables are needed for the leaderboard.

Ranks use the sum of marks from **completed reviews only**, with no additional round weighting. Pending/in-progress reviews add no points; teams with no completed review are unranked. Equal totals use competition ranking (1, 1, 3). Venue ranks use the team's physical venue, and problem-statement ranks use its assigned problem statement. Filters never recalculate those ranks. Completion counts identify provisional results while reviews are unfinished. Scores are read afresh on page requests/refresh, not stored as duplicate analytics or exposed through judge/team endpoints. The existing static-only PWA cache does not cache standings.

Run `npm run test:leaderboard` for ranking edge cases and cross-role session rejection tests.

For read-only HTTP checks, run `npm run build`, start `npm run start -- --port 3100` in one terminal, and run `npx tsx scripts/verify-leaderboard-route.ts` in another. This verifies HTML/RSC access denial for unauthenticated, judge, and team sessions (including cookies renamed to the admin cookie), faculty rendering, a venue filter, and private/no-store responses using the local `.env`. It does not modify database rows.

```bash
npm run lint
npm run typecheck
npm run build
```
