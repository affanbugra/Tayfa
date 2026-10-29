import { tr } from "@/lib/i18n/tr";
import { cn } from "@/lib/cn";

const styles: Record<string, string> = {
  active: "bg-present-bg text-present",
  at_risk: "bg-excused-bg text-at-risk",
  left: "bg-surface text-removed",
  removed: "bg-surface text-removed",
};

export function StudentStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", styles[status])}>
      {tr.studentStatus[status]}
    </span>
  );
}
