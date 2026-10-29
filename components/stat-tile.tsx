import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts";
import { cn } from "@/lib/cn";

/** İstatistik kartı: etiket · değer · (ok + işaretli fark) · küçük eğilim çizgisi. */
export function StatTile({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  trend,
  tone,
  compact,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Puan farkı; artı iyi kabul edilir */
  delta?: number | null;
  deltaLabel?: string;
  trend?: (number | null)[];
  tone?: "warn";
  compact?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-between rounded-lg border border-border bg-bg", compact ? "gap-1 p-3" : "gap-2 p-4")}>
      <p className="truncate text-xs font-medium text-text-muted">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={cn("font-semibold tabular-nums leading-none", compact ? "text-2xl" : "text-3xl", tone === "warn" ? "text-at-risk" : "text-text")}>{value}</p>
        {trend && <Sparkline values={trend} label={`${label} eğilimi`} />}
      </div>
      {(delta !== undefined && delta !== null) || sub ? (
        <p className="truncate text-xs text-text-muted">
          {delta !== undefined && delta !== null && (
            <span className={cn("mr-1 font-semibold", delta > 0 ? "text-present" : delta < 0 ? "text-absent" : "text-text-muted")}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : delta < 0 ? "−" : ""}
              {Math.abs(delta)} puan
            </span>
          )}
          {delta !== undefined && delta !== null ? deltaLabel : sub}
        </p>
      ) : null}
    </div>
  );
}
