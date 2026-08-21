import { cn } from "@/lib/cn";
import type { ReviewStatus } from "@/types/domain";

const config: Record<ReviewStatus, { label: string; dot: string; className: string }> = {
  completed: { label: "Completed", dot: "bg-emerald-500", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  in_progress: { label: "In Progress", dot: "bg-amber-500", className: "border-amber-200 bg-amber-50 text-amber-700" },
  pending: { label: "Pending", dot: "bg-zinc-400", className: "border-zinc-200 bg-zinc-50 text-zinc-600" },
};

export function StatusBadge({ status, compact = false }: { status: ReviewStatus; compact?: boolean }) {
  const item = config[status];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md border font-medium", compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs", item.className)}>
      <span className={cn("size-1.5 rounded-full", item.dot)} />
      {item.label}
    </span>
  );
}
