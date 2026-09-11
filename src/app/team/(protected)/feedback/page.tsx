import { CheckCircle2, MessageSquareText, Star } from "lucide-react";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getTeamFeedback } from "@/lib/repositories/team-repository";
import { requireTeamSession } from "@/lib/require-team-session";

const questions = [
  ["PRE-HACKATHON", "preGuidelines", "How would you rate the clarity of SIH guidelines and problem statements?"],
  ["PRE-HACKATHON", "preCommunication", "How would you rate the communication and information provided before the event?"],
  ["DURING THE HACKATHON", "supportCoordination", "Rate the coordination and support provided by the organizing team."],
  ["DURING THE HACKATHON", "supportMentors", "Rate the availability of mentors and technical support during the hackathon."],
  ["INFRASTRUCTURE & FACILITIES", "infraResources", "Rate the availability and quality of internet, laboratories, software, and other technical resources."],
  ["INFRASTRUCTURE & FACILITIES", "infraWorkspace", "Rate the seating or workspace."],
  ["EVALUATION", "evaluationClarity", "Rate the clarity of evaluation criteria and judging guidelines."],
  ["EVALUATION", "evaluationFairness", "Rate the fairness and transparency of the evaluation process."],
] as const;

const groups = [...new Set(questions.map(([group]) => group))];

export default async function TeamFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; message?: string }> }) {
  const session = await requireTeamSession();
  const existing = await getTeamFeedback(session);
  const params = await searchParams;
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><p className="text-xs font-semibold text-blue-700">Student voice</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Hackathon feedback</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Share your experience of the SIH Internal Hackathon. This is separate from judge feedback, which is the evaluation record for your team.</p></div>
    {params.status === "saved" ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" /> Thank you — your feedback has been recorded.</div> : null}
    {params.status === "error" ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.message ?? "Please check the form and try again."}</div> : null}
    <form action="/team/feedback/save" method="post" className="space-y-5">
      {groups.map((group) => <section key={group} className="space-y-3"><div className="border-b border-zinc-200 pb-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{group}</p><p className="mt-1 text-[11px] text-zinc-400">1 Very poor · 2 Poor · 3 Good · 4 Very good · 5 Excellent</p></div>{questions.filter(([name]) => name === group).map(([, field, label], index) => <fieldset key={field} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"><legend className="flex gap-2 text-sm font-medium leading-6 text-zinc-900"><span className="text-zinc-400">{index + 1}.</span>{label}<span className="text-red-500" aria-hidden="true">*</span></legend><div className="mt-4 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((value) => <label key={value} className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 text-xs text-zinc-600 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"><span>{value}</span><input className="size-4 accent-blue-600" type="radio" name={field} value={value} defaultChecked={existing?.[field] === value} required /></label>)}</div></fieldset>)}</section>)}
      <section className="space-y-3"><div className="border-b border-zinc-200 pb-2"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"><MessageSquareText className="size-4" /> Overall experience</p></div><label className="block rounded-xl border border-zinc-200 bg-white p-4 text-sm font-medium text-zinc-900 sm:p-5">What were the key learnings or skills you gained?<textarea name="keyLearnings" required minLength={3} maxLength={3000} rows={4} defaultValue={existing?.keyLearnings ?? ""} className="mt-3 w-full rounded-lg border border-zinc-300 p-3 text-sm font-normal leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label className="block rounded-xl border border-zinc-200 bg-white p-4 text-sm font-medium text-zinc-900 sm:p-5">Please share your overall experience and feedback.<textarea name="overallFeedback" required minLength={3} maxLength={3000} rows={5} defaultValue={existing?.overallFeedback ?? ""} className="mt-3 w-full rounded-lg border border-zinc-300 p-3 text-sm font-normal leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label></section>
      <PendingSubmitButton pendingLabel="Submitting feedback…" className="h-11 w-full rounded-lg bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800"><Star className="size-4" /> Submit student feedback</PendingSubmitButton>
    </form>
  </div>;
}
