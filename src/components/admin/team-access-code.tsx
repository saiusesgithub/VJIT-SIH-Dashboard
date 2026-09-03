"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

export function TeamAccessCode({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex min-w-56 items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
        <KeyRound className="size-4 text-amber-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-amber-700">Team secret code · faculty only</p>
        <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-wide text-zinc-950">{code ?? "Not provisioned"}</p>
      </div>
      {code ? (
        <button type="button" onClick={copyCode} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-zinc-600 transition-colors hover:bg-amber-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600" aria-label="Copy team secret code">
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      ) : null}
    </div>
  );
}
