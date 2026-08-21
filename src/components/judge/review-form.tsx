"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Save } from "lucide-react";

interface Rubric { id: string; name: string; description?: string; maxMarks: number }
interface Draft { scores: Record<string, string>; remarks: string; improvements: string; savedAt: string }

export function ReviewForm({ judgeId, team, round, rubrics, initialScores, initialRemarks, initialImprovements }: {
  judgeId: string;
  team: { id: string; code: string; name: string };
  round: { id: string; number: number; name: string };
  rubrics: Rubric[];
  initialScores: Record<string, number>;
  initialRemarks: string;
  initialImprovements: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const draftKey = `sih-review-draft:${judgeId}:${team.id}:${round.id}`;
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(rubrics.map((rubric) => [rubric.id, initialScores[rubric.id]?.toString() ?? ""])));
  const [remarks, setRemarks] = useState(initialRemarks);
  const [improvements, setImprovements] = useState(initialImprovements);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = localStorage.getItem(draftKey);
        if (stored) {
          const draft = JSON.parse(stored) as Draft;
          if (draft?.scores && typeof draft.remarks === "string" && typeof draft.improvements === "string") {
            setScores((current) => ({ ...current, ...draft.scores }));
            setRemarks(draft.remarks);
            setImprovements(draft.improvements);
            setSavedAt(draft.savedAt);
          }
        }
      } catch { /* Ignore malformed or unavailable local storage. */ }
      setHydrated(true);
    });
    void fetch("/judge/reviews/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: team.id, roundId: round.id }) });
    return () => { cancelled = true; };
  }, [draftKey, round.id, team.id]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(draftKey, JSON.stringify({ scores, remarks, improvements, savedAt: now } satisfies Draft));
        setSavedAt(now);
      } catch { /* The form remains usable even if device storage is unavailable. */ }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftKey, hydrated, improvements, remarks, scores]);

  const parsedScores = useMemo(() => rubrics.map((rubric) => ({ rubric, value: scores[rubric.id] === "" ? Number.NaN : Number(scores[rubric.id]) })), [rubrics, scores]);
  const total = parsedScores.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0);
  const maximum = rubrics.reduce((sum, rubric) => sum + rubric.maxMarks, 0);
  const valid = parsedScores.every(({ rubric, value }) => Number.isFinite(value) && value >= 0 && value <= rubric.maxMarks);

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/judge/reviews/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: team.id, roundId: round.id, scores: parsedScores.map(({ rubric, value }) => ({ rubricId: rubric.id, score: value })), remarks, improvements }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Submission failed.");
      try { localStorage.removeItem(draftKey); } catch { /* Submission is already safely persisted server-side. */ }
      dialog.current?.close();
      router.replace(`/judge/teams/${team.id}`);
      router.refresh();
    } catch (cause) {
      dialog.current?.close();
      setError(cause instanceof Error ? cause.message : "Submission failed. Your review is still saved on this device.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {rubrics.map((rubric) => {
          const value = scores[rubric.id] ?? "";
          const invalid = value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > rubric.maxMarks);
          return <div key={rubric.id} className="p-4"><div className="flex items-start gap-4"><label htmlFor={`score-${rubric.id}`} className="min-w-0 flex-1"><span className="block text-sm font-medium text-zinc-900">{rubric.name}</span>{rubric.description ? <span className="mt-1 block text-xs leading-5 text-zinc-500">{rubric.description}</span> : null}</label><div className="flex shrink-0 items-center gap-2"><input id={`score-${rubric.id}`} type="number" inputMode="decimal" min={0} max={rubric.maxMarks} step="0.5" required value={value} onChange={(event) => setScores((current) => ({ ...current, [rubric.id]: event.target.value }))} className="h-11 w-20 rounded-lg border border-zinc-300 bg-white px-2 text-right text-base font-semibold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" aria-invalid={invalid} /><span className="w-8 text-sm tabular-nums text-zinc-500">/ {rubric.maxMarks}</span></div></div>{invalid ? <p className="mt-2 text-xs font-medium text-red-600">Enter a score from 0 to {rubric.maxMarks}.</p> : null}</div>;
        })}
        <div className="flex items-center justify-between bg-zinc-50 px-4 py-3"><span className="text-sm font-semibold text-zinc-800">Running total</span><span className="text-lg font-semibold tabular-nums text-zinc-950">{total} <span className="text-sm font-normal text-zinc-500">/ {maximum}</span></span></div>
      </section>
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"><div><label htmlFor="remarks" className="text-sm font-medium text-zinc-900">Remarks</label><textarea id="remarks" rows={4} maxLength={5000} value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="What is working well?" /></div><div><label htmlFor="improvements" className="text-sm font-medium text-zinc-900">Improvements / Suggestions</label><textarea id="improvements" rows={4} maxLength={5000} value={improvements} onChange={(event) => setImprovements(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="What should the team improve next?" /></div></section>
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5"><Save className="size-3.5" /> {savedAt ? `Draft saved locally ${new Date(savedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Draft saves on this device"}</span></div>
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="flex items-center gap-2 font-medium"><AlertCircle className="size-4" /> Submission failed</p><p className="mt-1 text-xs leading-5">{error} Your review is still saved on this device.</p></div> : null}
      <button type="button" disabled={!valid || submitting} onClick={() => dialog.current?.showModal()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300">{submitting ? <Loader2 className="size-4 animate-spin" /> : error ? <AlertCircle className="size-4" /> : <Check className="size-4" />} {error ? "Retry submission" : `Submit Review ${round.number}`}</button>
      {!valid ? <p className="-mt-3 text-center text-xs text-zinc-500">Enter a valid score for every criterion to submit.</p> : null}
      <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-xl backdrop:bg-zinc-950/30"><div className="p-5"><h2 className="text-lg font-semibold">Submit Review {round.number}?</h2><p className="mt-2 text-sm text-zinc-600">Total: <strong className="text-zinc-950">{total} / {maximum}</strong></p><p className="mt-2 text-sm leading-6 text-zinc-500">After submission this review will be locked.</p><div className="mt-5 flex gap-2"><button type="button" disabled={submitting} onClick={() => dialog.current?.close()} className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50">Cancel</button><button type="button" disabled={submitting} onClick={() => void submit()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white disabled:bg-zinc-400">{submitting ? <Loader2 className="size-4 animate-spin" /> : null} Submit Review</button></div></div></dialog>
    </div>
  );
}
