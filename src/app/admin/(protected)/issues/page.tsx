import { formatDateTime } from "@/lib/format";
import { IssueStatusBadge } from "@/components/team/issue-status-badge";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getAdminIssues, IssueCategory, IssueStatus } from "@/lib/repositories/operations-repository";

export default async function AdminIssuesPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; venueId?: string }> }) {
  const filters = await searchParams;
  const data = await getAdminIssues(filters);
  return <div className="space-y-5">
    <div><p className="text-xs font-medium text-blue-700">Team support</p><h1 className="mt-1 text-2xl font-semibold">Issues</h1><p className="mt-1 text-sm text-zinc-500">Track operational reports and respond to teams.</p></div>
    <form className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3">
      <select name="status" defaultValue={filters.status ?? ""} className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"><option value="">All statuses</option>{Object.values(IssueStatus).map((status) => <option key={status}>{status}</option>)}</select>
      <select name="category" defaultValue={filters.category ?? ""} className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"><option value="">All categories</option>{Object.values(IssueCategory).map((category) => <option key={category}>{category}</option>)}</select>
      <select name="venueId" defaultValue={filters.venueId ?? ""} className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"><option value="">All venues</option>{data.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>
      <button className="h-10 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white sm:col-span-3">Apply filters</button>
    </form>
    <div className="space-y-3">{data.issues.map((issue) => <article key={issue.id} className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold">{issue.title}</p><p className="mt-1 text-xs text-zinc-500">{issue.team.teamCode} · {issue.team.venue.name} · {issue.category} · Open for {issue.ageMinutes} min</p></div><IssueStatusBadge status={issue.status} /></div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{issue.description}</p>
      <form action="/admin/issues/update" method="post" className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-[160px_1fr_auto]"><input type="hidden" name="id" value={issue.id} /><select name="status" defaultValue={issue.status} className="h-10 rounded-lg border border-zinc-300 px-3 text-sm">{Object.values(IssueStatus).map((status) => <option key={status}>{status}</option>)}</select><input name="response" defaultValue={issue.adminResponse ?? ""} maxLength={3000} placeholder="Faculty response" className="h-10 rounded-lg border border-zinc-300 px-3 text-sm" /><PendingSubmitButton pendingLabel="Updating…" className="h-10 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white">Update</PendingSubmitButton></form>
      <p className="mt-2 text-xs text-zinc-400">Submitted {formatDateTime(issue.createdAt.toISOString())}</p>
    </article>)}{data.issues.length === 0 ? <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">No issues match these filters.</p> : null}</div>
  </div>;
}
