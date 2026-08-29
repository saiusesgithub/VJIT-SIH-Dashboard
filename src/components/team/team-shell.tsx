"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, Link2, LogOut, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/team", label: "Home", icon: Home },
  { href: "/team/reviews", label: "Reviews", icon: ClipboardList },
  { href: "/team/submissions", label: "Submissions", icon: Link2 },
  { href: "/team/announcements", label: "Updates", icon: Bell },
  { href: "/team/issues", label: "Issues", icon: MessageSquareWarning },
];

export function TeamShell({ identity, children }: { identity: { code: string; name: string }; children: ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-dvh bg-stone-50 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur-sm"><div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 sm:px-6">
      <Link href="/team" className="grid size-8 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2" aria-label="Team home"><span className="rounded-[1px] bg-white" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-white" /></Link>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold tracking-tight">{identity.name}</p><p className="font-mono text-[11px] text-zinc-500">{identity.code} · Team Portal</p></div>
      <form action="/team/logout" method="post"><button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"><LogOut className="size-3.5" /> Sign out</button></form>
    </div></header>
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-7">{children}</main>
    <nav aria-label="Team portal" className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:static md:mx-auto md:mb-6 md:mt-0 md:max-w-4xl md:rounded-xl md:border"><div className="mx-auto grid h-16 max-w-4xl grid-cols-5 px-1 md:h-14">
      {navigation.map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors md:flex-row md:gap-2 md:text-xs", active ? "text-blue-700" : "text-zinc-500 hover:text-zinc-900")}><Icon className="size-4" /><span className="truncate">{label}</span></Link>; })}
    </div></nav>
  </div>;
}
