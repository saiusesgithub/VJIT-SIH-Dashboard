export default function QrCardsLoading() {
  return <div role="status" className="space-y-5 motion-safe:animate-pulse"><div className="h-8 w-56 rounded-lg bg-zinc-200" /><div className="h-24 rounded-xl border border-zinc-200 bg-white" /><div className="grid grid-cols-2 gap-5"><div className="h-96 rounded-xl border border-zinc-200 bg-white" /><div className="h-96 rounded-xl border border-zinc-200 bg-white" /></div><span className="sr-only">Preparing team QR cards…</span></div>;
}
