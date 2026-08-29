"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function PendingSubmitButton({ children, pendingLabel = "Saving…", className }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-disabled={pending} className={cn("inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-wait disabled:opacity-65", className)}>
    {pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /><span>{pendingLabel}</span></> : children}
  </button>;
}
