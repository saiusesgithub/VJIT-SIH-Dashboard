export default function TeamLoading() {
  return <div className="space-y-5" aria-label="Loading team portal">
    <div className="space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-zinc-200" /><div className="h-7 w-56 animate-pulse rounded bg-zinc-200" /><div className="h-4 w-72 max-w-full animate-pulse rounded bg-zinc-100" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white" /><div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white" /></div>
    <div className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-white" />
  </div>;
}
