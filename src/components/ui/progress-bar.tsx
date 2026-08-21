import { cn } from "@/lib/cn";

export function ProgressBar({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-zinc-200", className)} role="progressbar" aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-blue-600 transition-[width] duration-200", indicatorClassName)} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
