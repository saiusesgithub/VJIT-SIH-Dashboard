export default function LeaderboardLoading() {
  return <div role="status" aria-label="Loading faculty leaderboard" className="space-y-5 motion-safe:animate-pulse"><div className="h-8 w-64 rounded-lg bg-zinc-200" /><div className="h-24 rounded-xl border border-zinc-200 bg-white" /><div className="h-20 rounded-xl border border-zinc-200 bg-white" /><div className="h-80 rounded-xl border border-zinc-200 bg-white" /><span className="sr-only">Loading standings…</span></div>;
}
