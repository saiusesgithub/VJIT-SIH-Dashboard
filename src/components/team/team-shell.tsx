"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, Link2, LogOut, MessageSquareWarning } from "lucide-react";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { cn } from "@/lib/cn";

type NotificationSection = "reviews" | "updates" | "issues";
type NotificationVersions = Partial<Record<NotificationSection, string>>;

const navigation = [
  { href: "/team", label: "Home", icon: Home },
  { href: "/team/reviews", label: "Reviews", icon: ClipboardList, notification: "reviews" as const },
  { href: "/team/submissions", label: "Submissions", icon: Link2 },
  { href: "/team/announcements", label: "Updates", icon: Bell, notification: "updates" as const },
  { href: "/team/issues", label: "Issues", icon: MessageSquareWarning, notification: "issues" as const },
];

function subscribeSeen(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("sih-team-seen", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("sih-team-seen", callback); };
}

function UnreadDot({ teamId, section, version, active }: { teamId: string; section: NotificationSection; version?: string; active: boolean }) {
  const key = `sih-team-seen:${teamId}:${section}`;
  const seen = useSyncExternalStore(subscribeSeen, () => localStorage.getItem(key), () => version ?? null);
  useEffect(() => {
    if (active && version && localStorage.getItem(key) !== version) {
      localStorage.setItem(key, version);
      window.dispatchEvent(new Event("sih-team-seen"));
    }
  }, [active, key, version]);
  if (active || !version || seen === version) return null;
  return <span className="absolute right-[calc(50%-14px)] top-2 size-2 rounded-full bg-red-500 ring-2 ring-white md:right-2.5 md:top-2.5" aria-label="Unread update" />;
}

function LinkProgress() {
  const { pending } = useLinkStatus();
  return <span className={cn("absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-blue-600 opacity-0", pending && "nav-pending")} aria-hidden="true" />;
}

export function TeamShell({ identity, notificationVersions, children }: { identity: { code: string; name: string }; notificationVersions: NotificationVersions; children: ReactNode }) {
  const pathname = usePathname();
  const [versions, setVersions] = useState(notificationVersions);
  useEffect(() => {
    let active = true;
    async function refreshNotifications() {
      try {
        const response = await fetch("/team/notifications", { cache: "no-store" });
        if (active && response.ok) setVersions((await response.json()).notificationVersions);
      } catch { /* The next focus or interval retries quietly. */ }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refreshNotifications(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void refreshNotifications(), 60_000);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); window.clearInterval(interval); };
  }, []);
  return <div className="min-h-dvh bg-stone-50 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-24">
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur-sm"><div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
      <Link href="/team" className="grid size-8 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2 transition-transform duration-200 hover:scale-105" aria-label="Team home"><span className="rounded-[1px] bg-white" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-white" /></Link>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold tracking-tight">{identity.name}</p><p className="font-mono text-[11px] text-zinc-500">{identity.code} · Team Portal</p></div>
      <form action="/team/logout" method="post"><PendingSubmitButton pendingLabel="Locking…" className="min-h-9 rounded-lg px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"><LogOut className="size-3.5" /> <span className="hidden sm:inline">Sign out</span></PendingSubmitButton></form>
    </div></header>
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7"><div key={pathname} className="app-enter">{children}</div></main>
    <nav aria-label="Team portal" className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:bottom-4 md:left-1/2 md:right-auto md:w-[min(56rem,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-xl md:border md:pb-0 md:shadow-[0_8px_30px_rgba(24,24,27,0.10)]"><div className="mx-auto grid h-16 max-w-4xl grid-cols-5 px-1 md:h-14 md:px-2">
      {navigation.map(({ href, label, icon: Icon, ...item }) => { const active = pathname === href; const section = "notification" in item ? item.notification : undefined; return <Link key={href} href={href} className={cn("group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-all duration-200 md:flex-row md:gap-2 md:text-xs", active ? "bg-blue-50 text-blue-700 md:my-1.5" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900")}><Icon className={cn("size-4 transition-transform duration-200 group-hover:-translate-y-0.5", active && "stroke-[2.4]")} /><span className="truncate">{label}</span>{section ? <UnreadDot teamId={identity.code} section={section} version={versions[section]} active={active} /> : null}<LinkProgress /></Link>; })}
    </div></nav>
  </div>;
}
