"use client";

import { useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";

interface VenueOption { id: string; name: string; roomNumber: string }

export function RequalifyTeamControl({ teamId, teamCode, venues }: { teamId: string; teamCode: string; venues: VenueOption[] }) {
  const [submitting, setSubmitting] = useState(false);
  if (!venues.length) return <p className="mt-2 text-xs text-red-700">No active Day 2 rooms are configured. Add or configure a Day 2 venue before restoring this team.</p>;

  return <form action="/admin/teams/requalify" method="post" onSubmit={(event) => {
    if (!window.confirm(`Restore ${teamCode} to active participation? Its existing reviews and scores will remain unchanged.`)) event.preventDefault();
    else setSubmitting(true);
  }} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
    <input type="hidden" name="teamId" value={teamId} />
    <label className="text-xs font-medium text-zinc-700">New Day 2 room<select name="venueId" required disabled={submitting} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600">{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.roomNumber}</option>)}</select></label>
    <button disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}{submitting ? "Restoring…" : "Restore and assign room"}</button>
  </form>;
}
