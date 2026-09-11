"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChartColumn, ChevronDown, ChevronRight, Eye, FileSpreadsheet, Link2, LockKeyhole, Mail, Menu, MessageSquareWarning, QrCode, RefreshCw, Scale, Settings2, Trophy, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { rangeLabel } from "@/lib/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { AdminShellData } from "@/types/domain";

function Logo() {
  return (
    <div className="grid size-8 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-1.5" aria-hidden="true">
      <span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-blue-500" />
      <span className="rounded-[2px] bg-blue-500" /><span className="rounded-[2px] bg-white" />
    </div>
  );
}

function VenueNavigation({ data, pathname, onNavigate }: { data: AdminShellData; pathname: string; onNavigate?: () => void }) {
  const day2Venues = data.venues.filter((progress) => progress.venue.id.startsWith("venue-day2-"));
  const day1Venues = data.venues.filter((progress) => !progress.venue.id.startsWith("venue-day2-"));

  const venueLinks = (venues: AdminShellData["venues"]) => venues.map((progress) => {
    const venue = progress.venue;
    const active = pathname === `/admin/venues/${venue.id}`;
    return (
      <Link key={venue.id} href={`/admin/venues/${venue.id}`} onClick={onNavigate} className={cn("group block rounded-lg border px-3 py-3 transition-colors duration-150", active ? "border-zinc-300 bg-white" : "border-transparent hover:border-zinc-200 hover:bg-white/70")}>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-medium", active ? "text-zinc-950" : "text-zinc-700")}>{venue.name}</span>
          <ChevronRight className={cn("size-3.5 transition-transform duration-150", active ? "text-zinc-600" : "text-zinc-300 group-hover:translate-x-0.5 group-hover:text-zinc-500")} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{venue.room} · {venue.teamCodeRange ?? rangeLabel(venue.problemStatementIds.map((id) => id.toUpperCase()))}</p>
        <div className="mt-2.5 space-y-1.5">
          {(venue.id.startsWith("venue-day2-")
            ? progress.rounds.filter((round) => round.round.number >= 2)
            : progress.rounds.filter((round) => round.round.number === 1)
          ).map((round) => <div key={round.round.id}>
            <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500"><span>Review {round.round.number}</span><span className="tabular-nums">{round.percentage}%</span></div>
            <ProgressBar value={round.percentage} className="w-full" />
          </div>)}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400">{progress.teamCount} loaded{venue.plannedTeamCount != null ? ` · ${venue.plannedTeamCount} planned` : ""}</p>
      </Link>
    );
  });

  return (
    <div className="px-3 py-5">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Venues</p>
        <span className="text-[11px] tabular-nums text-zinc-400">{data.venues.length} venues</span>
      </div>
      <nav className="space-y-3" aria-label="Venue navigation">
        {day2Venues.length ? <section aria-label="Day 2 venues"><p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Day 2 venues</p><div className="space-y-1">{venueLinks(day2Venues)}</div></section> : null}
        {day1Venues.length ? <details className="group border-t border-zinc-200 pt-2" open={day1Venues.some((progress) => pathname === `/admin/venues/${progress.venue.id}`)}><summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800"><span>Day 1 rooms <span className="ml-1 tabular-nums text-zinc-400">({day1Venues.length})</span></span><ChevronDown className="size-3.5 transition-transform duration-150 group-open:rotate-180" /></summary><div className="mt-1 space-y-1">{venueLinks(day1Venues)}</div></details> : null}
      </nav>
    </div>
  );
}

function JudgeContext({ data, pathname, onNavigate }: { data: AdminShellData; pathname: string; onNavigate?: () => void }) {
  const teamParam = pathname.split("/admin/teams/")[1];
  const context = teamParam ? data.teamContexts.find((item) => item.teamId === decodeURIComponent(teamParam)) : undefined;
  if (!context?.judge) return <VenueNavigation data={data} pathname={pathname} onNavigate={onNavigate} />;
  const { venue, judge } = context;

  return (
    <div className="px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Evaluation context</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white"><UserRound className="size-4 text-zinc-600" /></div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{judge.name}</p><p className="truncate text-xs text-zinc-500">{judge.designation}</p></div>
      </div>
      <dl className="mt-5 space-y-3 border-y border-zinc-200 py-4 text-xs">
        <div><dt className="text-zinc-400">Department</dt><dd className="mt-0.5 font-medium leading-5 text-zinc-700">{judge.department}</dd></div>
        <div><dt className="text-zinc-400">Assigned venue</dt><dd className="mt-0.5 font-medium text-zinc-700">{venue.name} · {venue.room}</dd></div>
        <div><dt className="text-zinc-400">Contact</dt><dd className="mt-0.5 font-medium text-zinc-700">{judge.contact}</dd></div>
      </dl>
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="flex items-center gap-2"><Scale className="size-3.5 text-zinc-500" /><span className="text-xs font-medium text-zinc-800">Assigned team</span></div>
        <p className="mt-2 text-sm font-semibold text-zinc-950">{context.teamName}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{context.teamCode} · {venue.name}</p>
      </div>
      <Link href={`/admin/venues/${venue.id}`} onClick={onNavigate} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"><ChevronRight className="size-3.5 rotate-180" /> Back to {venue.name}</Link>
    </div>
  );
}

const operationLinks = [
  { href: "/admin/manage", label: "Manage event", icon: Settings2 },
  { href: "/admin/qr-cards", label: "Team QR cards", icon: QrCode },
  { href: "/admin/judges", label: "Judges", icon: UserRound },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/reports/final", label: "Final report", icon: FileSpreadsheet },
  { href: "/admin/problem-statements", label: "PS analytics", icon: ChartColumn },
  { href: "/admin/feedback", label: "Feedback release", icon: Eye },
  { href: "/admin/submissions", label: "Submissions", icon: Link2 },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/issues", label: "Team issues", icon: MessageSquareWarning },
  { href: "/admin/communications", label: "Team emails", icon: Mail },
] as const;

function OperationsNavigation({ pathname, onNavigate, isSuperAdmin }: { pathname: string; onNavigate?: () => void; isSuperAdmin: boolean }) {
  return (
    <div className="border-b border-zinc-200 px-3 pb-4">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Operations</p>
      <nav className="space-y-1" aria-label="Event operations">
        {operationLinks.filter((item) => (item.href !== "/admin/manage" && item.href !== "/admin/communications") || isSuperAdmin).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onNavigate} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors", pathname.startsWith(href) ? "bg-white font-medium text-zinc-950" : "text-zinc-600 hover:bg-white hover:text-zinc-900")}>
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AdminShell({ data, children, isSuperAdmin }: { data: AdminShellData; children: ReactNode; isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div data-admin-shell className="min-h-screen bg-stone-50">
      <header data-admin-chrome className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-zinc-200 bg-white px-4 lg:px-6">
        <button className="mr-3 inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open venue navigation"><Menu className="size-4" /></button>
        <Link href="/admin" className="flex min-w-0 items-center gap-3"><Logo /><div className="min-w-0"><p className="truncate text-sm font-semibold tracking-tight text-zinc-950">VJIT SIH Internal Hackathon</p><p className="text-[11px] text-zinc-500">Evaluation Dashboard</p></div></Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 sm:flex"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span><span className="text-xs font-medium text-emerald-700">Hackathon Live</span></div>
          <span className="hidden text-xs text-zinc-500 md:block">10–11 Sep 2026</span>
          <button className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800" aria-label="Refresh dashboard"><RefreshCw className="size-3.5" /></button>
          <form action="/admin/logout" method="post">
            <button type="submit" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800" aria-label="Lock dashboard" title="Lock dashboard"><LockKeyhole className="size-3.5" /><span className="hidden text-xs font-medium xl:inline">Lock</span></button>
          </form>
        </div>
      </header>
      <aside data-admin-chrome className="fixed bottom-0 left-0 top-16 z-30 hidden w-64 overflow-y-auto border-r border-zinc-200 bg-stone-50 lg:block">
        <Link href="/admin" className={cn("mx-3 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors", pathname === "/admin" ? "border-zinc-300 bg-white text-zinc-950" : "border-transparent text-zinc-600 hover:bg-white")}><Building2 className="size-4" /> Overview</Link>
        <OperationsNavigation pathname={pathname} isSuperAdmin={isSuperAdmin} />
        <JudgeContext data={data} pathname={pathname} />
      </aside>
      <div data-admin-chrome>
      {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-zinc-950/30" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><aside className="absolute inset-y-0 left-0 w-[min(20rem,86vw)] overflow-y-auto bg-stone-50 shadow-xl"><div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4"><div className="flex items-center gap-3"><Logo /><span className="text-sm font-semibold">VJIT SIH</span></div><button onClick={() => setMobileOpen(false)} className="flex size-8 items-center justify-center rounded-md border border-zinc-200"><X className="size-4" /></button></div><Link href="/admin" onClick={() => setMobileOpen(false)} className="mx-3 mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium"><Building2 className="size-4" /> Overview</Link><OperationsNavigation pathname={pathname} isSuperAdmin={isSuperAdmin} onNavigate={() => setMobileOpen(false)} /><JudgeContext data={data} pathname={pathname} onNavigate={() => setMobileOpen(false)} /></aside></div> : null}
      </div>
      <main data-admin-main className="min-h-screen pt-16 lg:pl-64"><div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div></main>
    </div>
  );
}
