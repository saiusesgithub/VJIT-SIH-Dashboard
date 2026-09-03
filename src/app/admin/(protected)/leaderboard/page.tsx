import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Trophy } from "lucide-react";
import { getFacultyLeaderboard } from "@/lib/repositories/leaderboard-repository";

export const metadata: Metadata = { title: "Faculty leaderboard", robots: { index: false, follow: false } };
const marks = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getFacultyLeaderboard();
  const params = await searchParams;
  const venues = [...new Map(data.entries.map((row) => [row.venue.id, row.venue])).values()].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  const problems = [...new Map(data.entries.map((row) => [row.problem.id, row.problem])).values()].sort((a, b) => a.code.localeCompare(b.code));
  const venueId = typeof params.venue === "string" && venues.some((venue) => venue.id === params.venue) ? params.venue : "";
  const problemId = typeof params.problem === "string" && problems.some((problem) => problem.id === params.problem) ? params.problem : "";
  const entries = data.entries.filter((row) => (!venueId || row.venue.id === venueId) && (!problemId || row.problem.id === problemId));
  const fullyEvaluated = data.entries.filter((row) => data.roundCount > 0 && row.completedReviews === data.roundCount).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-blue-700">Evaluation results</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight"><Trophy className="size-5 text-zinc-500" /> Faculty leaderboard</h1><p className="mt-1 text-sm text-zinc-500">Compare teams across the event, venues, and problem statements.</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600"><LockKeyhole className="size-3.5" /> Faculty only</span>
      </header>

      <dl className="grid grid-cols-3 divide-x divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="p-4"><dt className="text-xs text-zinc-500">Teams</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{data.entries.length}</dd></div>
        <div className="p-4"><dt className="text-xs text-zinc-500">Fully evaluated</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{fullyEvaluated}<span className="ml-1 text-sm font-normal text-zinc-400">/ {data.entries.length}</span></dd></div>
        <div className="p-4"><dt className="text-xs text-zinc-500">Maximum total</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{marks.format(data.maximumScore)}<span className="ml-1 text-xs font-normal text-zinc-400">marks</span></dd></div>
      </dl>

      <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900" aria-label="Ranking method">
        <p className="font-semibold">{fullyEvaluated === data.entries.length && data.entries.length > 0 ? "All teams evaluated" : "Live standings · provisional until all reviews are complete"}</p>
        <p>Ranked by the sum of marks from completed reviews only. Pending and in-progress reviews add no marks. Equal totals share a rank (1, 1, 3); teams without a completed review are unranked. All {data.roundCount} rounds contribute their rubric marks without extra weighting.</p>
      </section>

      <form action="/admin/leaderboard" method="get" className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-medium text-zinc-600">Venue<select name="venue" defaultValue={venueId} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"><option value="">All venues</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.room}</option>)}</select></label>
        <label className="flex-1 text-xs font-medium text-zinc-600">Problem statement<select name="problem" defaultValue={problemId} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"><option value="">All problem statements</option>{problems.map((problem) => <option key={problem.id} value={problem.id}>{problem.code} · {problem.title}</option>)}</select></label>
        <button className="h-10 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800">Apply filters</button>
        {venueId || problemId ? <Link href="/admin/leaderboard" className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Clear</Link> : null}
      </form>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3"><h2 className="text-sm font-semibold">Team standings</h2><p className="text-xs text-zinc-500">{entries.length} teams · ranks remain relative to their full group</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <caption className="sr-only">Private faculty standings. Overall rank compares all teams; venue rank compares teams in the same physical venue; problem rank compares teams assigned the same problem statement.</caption>
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500"><tr>
              <th scope="col" className="px-4 py-3">Overall rank</th><th scope="col" className="px-4 py-3">Team</th><th scope="col" className="px-4 py-3">Problem statement</th><th scope="col" className="px-4 py-3">Venue</th><th scope="col" className="px-4 py-3 text-right">Total marks</th><th scope="col" className="px-4 py-3">Reviews</th><th scope="col" className="px-4 py-3 text-center">Venue rank</th><th scope="col" className="px-4 py-3 text-center">PS rank</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">{entries.map((row) => <tr key={row.id} className="transition-colors hover:bg-zinc-50/70">
              <td className="px-4 py-4 text-sm font-semibold tabular-nums text-zinc-800">{row.overallRank ? `#${row.overallRank}` : <span className="text-xs font-normal text-zinc-400">Unranked</span>}</td>
              <th scope="row" className="px-4 py-4 font-normal"><Link href={`/admin/teams/${row.id}`} className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-blue-600"><span className="inline-flex items-center gap-1 font-mono font-semibold text-blue-700">{row.code}<ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" /></span><span className="mt-1 block font-medium text-zinc-900">{row.name}</span></Link></th>
              <td className="max-w-64 px-4 py-4"><p className="font-mono font-medium text-zinc-800">{row.problem.code}</p><p className="mt-1 text-zinc-500">{row.problem.title}</p></td>
              <td className="whitespace-nowrap px-4 py-4"><p className="font-medium text-zinc-700">{row.venue.name}</p><p className="mt-1 text-zinc-400">{row.venue.room}</p></td>
              <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums"><span className="font-semibold text-zinc-950">{marks.format(row.totalScore)}</span><span className="text-zinc-400"> / {marks.format(data.maximumScore)}</span></td>
              <td className="px-4 py-4"><p className="font-medium tabular-nums text-zinc-700">{row.completedReviews} / {data.roundCount}</p><p className={`mt-1 whitespace-nowrap text-[11px] ${row.completedReviews === data.roundCount && data.roundCount > 0 ? "text-emerald-700" : row.completedReviews ? "text-amber-700" : "text-zinc-400"}`}>{row.completedReviews === data.roundCount && data.roundCount > 0 ? "Complete" : row.completedReviews ? "Provisional" : "Awaiting review"}</p></td>
              <td className="px-4 py-4 text-center font-medium tabular-nums text-zinc-600">{row.venueRank ? `#${row.venueRank}` : "—"}</td>
              <td className="px-4 py-4 text-center font-medium tabular-nums text-zinc-600">{row.problemRank ? `#${row.problemRank}` : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!entries.length ? <div className="p-10 text-center"><p className="text-sm font-medium text-zinc-700">{data.entries.length ? "No teams match these filters" : "No teams available yet"}</p><p className="mt-1 text-xs text-zinc-500">{data.entries.length ? "Try a different venue or problem statement." : "Standings will appear once teams are added to the event."}</p></div> : null}
      </section>
      <p className="text-xs text-zinc-400">Private to authorized faculty. Leaderboard data is not included in judge or team portal responses. Refresh to load the latest submitted reviews.</p>
    </div>
  );
}
