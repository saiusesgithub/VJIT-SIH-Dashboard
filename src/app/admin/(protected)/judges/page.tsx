import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, UserRound } from "lucide-react";
import { getJudgeActivityList } from "@/lib/repositories/judge-activity-repository";

export const metadata: Metadata = { title: "Judge activity", robots: { index: false, follow: false } };

export default async function JudgesPage() {
  const data = await getJudgeActivityList();
  const activeJudges = data.judges.filter((judge) => judge.completedReviewCount > 0).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-blue-700">Evaluation operations</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight"><UserRound className="size-5 text-zinc-500" /> Judge activity</h1><p className="mt-1 text-sm text-zinc-500">Read-only history of reviews submitted from each judge account.</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600"><ClipboardCheck className="size-3.5" /> {activeJudges} active evaluators</span>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3"><h2 className="text-sm font-semibold text-zinc-900">All judges</h2><p className="mt-0.5 text-xs text-zinc-500">{data.judges.length} accounts. Counts only include completed reviews actually submitted by that account.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500"><tr><th className="px-4 py-3">Judge</th><th className="px-4 py-3">Assigned rooms</th><th className="px-4 py-3 text-center">Teams evaluated</th><th className="px-4 py-3 text-center">Completed reviews</th><th className="px-4 py-3">Activity</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">{data.judges.map((judge) => <tr key={judge.id} className="transition-colors hover:bg-zinc-50/70">
              <th scope="row" className="px-4 py-4 font-normal"><Link href={`/admin/judges/${judge.id}`} className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-blue-600"><span className="inline-flex items-center gap-1 font-medium text-zinc-950">{judge.name}<ArrowUpRight className="size-3 text-blue-700 opacity-0 transition-opacity group-hover:opacity-100" /></span><span className="mt-1 block text-zinc-500">{judge.designation} · {judge.department}</span>{judge.phone ? <span className="mt-1 block font-mono text-[11px] text-zinc-400">{judge.phone}</span> : null}</Link></th>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{judge.venueAssignments.length ? judge.venueAssignments.map((venue) => <span key={venue.id} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">{venue.name} · {venue.room}<span className="ml-1 text-zinc-400">{venue.role === "EXTERNAL" ? "External" : "Internal"}</span></span>) : <span className="text-zinc-400">No current assignment</span>}</div></td>
              <td className="px-4 py-4 text-center text-sm font-semibold tabular-nums text-zinc-800">{judge.evaluatedTeamCount}</td>
              <td className="px-4 py-4 text-center text-sm font-semibold tabular-nums text-zinc-800">{judge.completedReviewCount}</td>
              <td className="px-4 py-4"><Link href={`/admin/judges/${judge.id}`} className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-800">View submitted reviews <ArrowUpRight className="size-3.5" /></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!data.judges.length ? <div className="p-10 text-center text-sm text-zinc-500">No judge accounts have been configured for this event.</div> : null}
      </section>
    </div>
  );
}
