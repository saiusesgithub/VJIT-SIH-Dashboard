import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon?: LucideIcon }) {
  return (
    <div className="min-w-0 border-r border-zinc-200 px-4 py-4 first:pl-5 last:border-r-0 last:pr-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-zinc-500">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-zinc-400" strokeWidth={1.8} /> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">{value}</p>
        {detail ? <span className="text-xs text-zinc-500">{detail}</span> : null}
      </div>
    </div>
  );
}
