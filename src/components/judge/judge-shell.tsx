import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import type { JudgeIdentity } from "@/lib/repositories/judge-repository";

export function JudgeShell({ identity, children }: { identity: JudgeIdentity; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/judge" className="grid size-8 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-zinc-950 p-2" aria-label="Judge home"><span className="rounded-[1px] bg-white" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-blue-500" /><span className="rounded-[1px] bg-white" /></Link>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold tracking-tight">{identity.venueName} · {identity.roomNumber}</p><p className="truncate text-[11px] text-zinc-500">{identity.judgeName}</p></div>
          <form action="/judge/logout" method="post"><button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Local drafts are kept on this device"><LogOut className="size-3.5" /> Sign out</button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-7">{children}</main>
    </div>
  );
}
