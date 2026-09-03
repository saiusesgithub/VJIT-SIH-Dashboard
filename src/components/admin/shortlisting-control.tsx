"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { decisionLabels, type FinalDecision, type ShortlistingState } from "@/lib/shortlisting";
import { formatDateTime } from "@/lib/format";

const colors = { SHORTLISTED: "text-emerald-700", HOLD: "text-amber-700", ELIMINATED: "text-red-700" };
const errors: Record<string, string> = {
  conflict: "Another faculty member updated this decision. Refresh before trying again.",
  not_eligible: "Review 3 must be completed before a decision can be saved.",
  forbidden: "Your faculty session has expired. Sign in again.",
  not_found: "This team is no longer available.",
};

export function ShortlistingControl({ teamId, teamCode, state }: { teamId: string; teamCode: string; state: ShortlistingState }) {
  const router = useRouter();
  const [selected, setSelected] = useState<FinalDecision | "">(state.decision ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || inFlight.current || !window.confirm(`Mark ${teamCode} as ${decisionLabels[selected]}? This is a faculty-only decision and does not change evaluation scores.`)) return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/admin/shortlisting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, decision: selected, revision: state.revision }) });
      if (response.redirected) { setMessage(errors.forbidden); return; }
      const result = await response.json();
      if (!response.ok || !result.ok) { setMessage(errors[result.code] ?? "Could not save. Your selection is kept; please retry."); return; }
      setMessage("Decision saved.");
      router.refresh();
    } catch { setMessage("Could not save. Your selection is kept; please retry."); }
    finally { setPending(false); inFlight.current = false; }
  }

  return <div className="min-w-48 space-y-2">
    <p className={`text-xs font-semibold ${state.decision ? colors[state.decision] : "text-zinc-500"}`}>{state.decision ? decisionLabels[state.decision] : "Not decided"}</p>
    {state.eligible ? <form onSubmit={save} className="flex items-center gap-2" aria-label={`Shortlisting decision for ${teamCode}`}>
      <select aria-label={`Final decision for ${teamCode}`} value={selected} disabled={pending} onChange={(event) => setSelected(event.target.value as FinalDecision | "")} className="h-10 min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-xs focus-visible:outline-2 focus-visible:outline-blue-600"><option value="" disabled>Select decision</option>{Object.entries(decisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button disabled={pending || !selected || selected === state.decision} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}{pending ? "Saving…" : "Save"}</button>
    </form> : <p className="text-[11px] text-zinc-400">Available after Review 3</p>}
    {state.updatedAt ? <p className="text-[11px] text-zinc-400">Updated {formatDateTime(state.updatedAt)}</p> : null}
    {message ? <p role="status" className={`max-w-64 text-xs ${message === "Decision saved." ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
  </div>;
}
