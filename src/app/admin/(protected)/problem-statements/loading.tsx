export default function AnalyticsLoading() {
  return <div role="status" aria-label="Loading problem statement analytics" className="space-y-5 motion-safe:animate-pulse"><div className="h-8 w-72 rounded-lg bg-zinc-200" /><div className="h-24 rounded-xl border border-zinc-200 bg-white" /><div className="h-80 rounded-xl border border-zinc-200 bg-white" /><span className="sr-only">Loading analytics…</span></div>;
}
