import type { Metadata } from "next";
import { Download, FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = { title: "Final evaluation report", robots: { index: false, follow: false } };

export default function FinalReportPage() {
  return <div className="space-y-5"><header><p className="text-xs font-medium text-blue-700">Evaluation results</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight"><FileSpreadsheet className="size-5 text-zinc-500" /> Final evaluation report</h1><p className="mt-1 text-sm text-zinc-500">Download the final three-review score sheet for every team.</p></header><section className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-sm font-semibold text-zinc-900">Excel report</h2><p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">The report contains each team&apos;s R1, R2, and R3 rubric scores, the review score for each round, and one merged total score out of 300. Eliminated teams and absent reviews show <span className="font-mono font-semibold">-</span>.</p><a href="/admin/reports/final/export" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"><Download className="size-4" /> Download final report (.xlsx)</a></section></div>;
}
