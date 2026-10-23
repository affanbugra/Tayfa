"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StudentStatusBadge } from "@/components/status-badge";
import { inputClass } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

export type StudentListItem = {
  id: string;
  fullName: string;
  status: "active" | "at_risk" | "removed";
  school: string | null;
  classLabel: string | null;
  rate: string;
  absent: number;
  href: string;
};

const filters = [
  { value: "current", label: tr.students.filterCurrent },
  { value: "active", label: tr.studentStatus.active },
  { value: "at_risk", label: tr.studentStatus.at_risk },
  { value: "removed", label: tr.studentStatus.removed },
  { value: "all", label: tr.students.filterAll },
];

export function StudentList({ items }: { items: StudentListItem[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("current");
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return items.filter(
      (s) =>
        (filter === "all" || (filter === "current" ? s.status !== "removed" : s.status === filter)) &&
        (!needle || s.fullName.toLocaleLowerCase("tr").includes(needle)),
    );
  }, [items, q, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr.students.search} className={inputClass} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputClass, "sm:w-64")} aria-label={tr.students.fields.status}>
          {filters.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-text-muted">{shown.length} / {items.length}</p>
      {shown.length === 0 ? (
        <p className="text-sm text-text-muted">{tr.students.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
          {shown.map((s) => (
            <li key={s.id}>
              <Link href={s.href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{s.fullName}</p>
                  <p className="truncate text-xs text-text-muted">{[s.school, s.classLabel].filter(Boolean).join(" · ") || tr.common.none}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StudentStatusBadge status={s.status} />
                  <span className="text-xs tabular-nums text-text-muted">
                    {tr.students.attendanceRate} {s.rate}
                    {s.absent > 0 && ` · ${s.absent} ${tr.attendance.absent.toLowerCase()}`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
