import { cn } from "@/lib/cn";

const styles = {
  OPEN: "border-red-200 bg-red-50 text-red-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-zinc-200 bg-zinc-100 text-zinc-600",
} as const;

export function IssueStatusBadge({ status }: { status: keyof typeof styles }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold", styles[status])}>
    <span className="size-1.5 rounded-full bg-current opacity-70" />{status.replace("_", " ")}
  </span>;
}
