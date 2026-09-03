import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { PrintQrButton } from "@/components/admin/print-qr-button";
import { getFacultyTeamQrData } from "@/lib/repositories/team-qr-repository";
import { createTeamQrImage, getJudgeTeamUrl, getQrOrigin } from "@/lib/team-qr";
import "./print.css";

export const metadata: Metadata = { title: "Team QR cards", robots: { index: false, follow: false } };

export default async function TeamQrCardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getFacultyTeamQrData();
  const params = await searchParams;
  const venueId = typeof params.venue === "string" ? params.venue : "";
  const teamId = typeof params.team === "string" ? params.team : "";
  const teams = data.teams.filter((team) => (!venueId || team.venue.id === venueId) && (!teamId || team.id === teamId));
  const configured = getQrOrigin(process.env.APP_URL);
  const cards = configured ? await Promise.all(teams.map(async (team) => ({ ...team, url: getJudgeTeamUrl(configured.origin, team.id), image: await createTeamQrImage(configured.origin, team.id) }))) : [];
  const sheets = Array.from({ length: Math.ceil(cards.length / 4) }, (_, index) => cards.slice(index * 4, index * 4 + 4));

  return <div data-team-qr-print className="space-y-5">
    <div className="qr-screen-only space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-blue-700">Event-day tools</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight"><QrCode className="size-5 text-zinc-500" /> Team QR cards</h1><p className="mt-1 text-sm text-zinc-500">Print desk cards for judges to scan. No PINs, scores, or secret codes are included.</p></div><PrintQrButton disabled={!configured || configured.local || !cards.length} /></header>
      {!configured ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p className="font-semibold">Set the permanent event URL before generating cards</p><p>Add <code className="font-mono text-xs">APP_URL=https://your-event-domain</code> to your server environment, then restart or redeploy. Use only the origin: no path, query, credentials, or trailing team ID. Preview deployment URLs are not selected automatically.</p></div> : <div className={`rounded-lg border p-3 text-xs leading-5 ${configured.local ? "border-amber-200 bg-amber-50 text-amber-900" : "border-zinc-200 bg-white text-zinc-600"}`}><p><span className="font-semibold">QR destination:</span> {configured.origin}</p><p>{configured.local ? "Local preview only. Phones cannot reach your computer through localhost; printing is disabled until APP_URL uses your public HTTPS event domain." : "Verify this is your permanent event domain before printing. Use A4 paper, 100% scale, and turn browser headers/footers off. Four cards per sheet."}</p></div>}
      <form action="/admin/qr-cards" className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-medium text-zinc-600">Venue<select name="venue" defaultValue={venueId} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"><option value="">All venues</option>{data.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.roomNumber}</option>)}</select></label>
        <label className="min-w-0 flex-1 text-xs font-medium text-zinc-600">Team<select name="team" defaultValue={teamId} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"><option value="">All teams</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.teamCode} · {team.teamName}</option>)}</select></label>
        <button className="h-10 rounded-lg border border-zinc-300 px-4 text-xs font-medium hover:bg-zinc-50">Apply filters</button>{venueId || teamId ? <Link href="/admin/qr-cards" className="inline-flex h-10 items-center text-xs font-medium text-blue-700">Clear</Link> : null}
      </form>
      <p className="text-xs text-zinc-500">{teams.length} teams selected · {sheets.length} printable sheets. After scanning, judges confirm the team and explicitly start or continue a review.</p>
    </div>
    <div className="qr-print-content space-y-5">{sheets.map((sheet, index) => <section key={index} className="team-qr-sheet" aria-label={`QR card sheet ${index + 1}`}>
      {sheet.map((team) => <article key={team.id} className="team-qr-card">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{data.event?.name}</p>
        <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-zinc-950">{team.teamCode}</p><h2 className="mt-1 break-words text-lg font-semibold text-zinc-950">{team.teamName}</h2>
        <p className="mt-2 text-sm font-medium text-zinc-800">{team.venue.name} · {team.venue.roomNumber}</p><p className="mt-1 text-xs leading-5 text-zinc-600"><span className="font-mono font-semibold">{team.problemStatement.code}</span> · {team.problemStatement.title}</p>
        {/* Generated PNG data URLs need no image optimizer and must load before print. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-team-qr-image src={team.image} alt={`Scan to open ${team.teamCode} in the judge workspace`} width={512} height={512} className="team-qr-image" loading="eager" />
        <p className="text-sm font-semibold text-zinc-950">Scan to evaluate</p><p className="mt-1 text-[11px] text-zinc-500">Judge PIN required · Assigned venue only</p>
        <p className="mt-2 break-all font-mono text-[9px] leading-4 text-zinc-500">{team.url}</p>
      </article>)}
    </section>)}</div>
    {configured && !cards.length ? <p className="qr-screen-only rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">No teams match these filters.</p> : null}
  </div>;
}
