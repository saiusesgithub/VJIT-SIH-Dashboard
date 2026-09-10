"use client";

import { RotateCcw } from "lucide-react";

export function ReviewResetControl({ reviewId, teamId, roundNumber }: { reviewId: string; teamId: string; roundNumber: number }) {
  return <form action="/admin/reviews/reset" method="post" onSubmit={(event) => { if (!window.confirm(`Reset Review ${roundNumber}? Scores, feedback and the assigned judge will be cleared.`)) event.preventDefault(); }}><input type="hidden" name="reviewId" value={reviewId} /><input type="hidden" name="teamId" value={teamId} /><button type="submit" className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"><RotateCcw className="size-3" /> Reset review</button></form>;
}
