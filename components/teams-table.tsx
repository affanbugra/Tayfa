"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

export type TeamTableRow = {
  id: string;
  name: string;
  leader: string;
  grade: number;
  day: string | null;
  active: number;
  rate: number | null;
  weekly: (number | null)[];
  atRisk: number;
  lastSession: string | null;
  lastSessionLabel: string;
};

type Key = "name" | "leader" | "grade" | "day" | "active" | "rate" | "atRisk" | "lastSession";

export function TeamsTable({ rows }: { rows: TeamTableRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === bv) return a.name.localeCompare(b.name, "tr");
      if (av === null) return 1;
      if (bv === null) return -1;
      return (typeof av === "string" ? av.localeCompare(String(bv), "tr") : Number(av) - Number(bv)) * sort.dir;
    });
    return copy;
  }, [rows, sort]);

  const th = (key: Key, label: string, align = "text-left") => (
    <th className={cn("border-b border-border px-3 py-2 font-medium whitespace-nowrap", align)} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-brand-strong" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />)}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg">
      <table className="min-w-full text-sm">
        <thead className="text-text-muted">
          <tr>
            {th("name", tr.admin.colTeam)}
            {th("grade", tr.admin.colGrade)}
            {th("day", tr.admin.colDay)}
            {th("active", tr.admin.colActive, "text-right")}
            {th("rate", tr.admin.colRate, "text-right")}
            {th("atRisk", tr.admin.colAtRisk, "text-right")}
            {th("lastSession", tr.admin.colLastSession, "text-right")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-surface">
              <td className="border-b border-border px-3 py-2">
                <Link href={`/yonetim/ekipler/${r.id}`} className="font-medium text-text hover:text-brand-strong hover:underline">{r.name}</Link>
              </td>
              <td className="border-b border-border px-3 py-2 tabular-nums">{r.grade}</td>
              <td className="border-b border-border px-3 py-2">{r.day ? tr.days[r.day] : <span className="text-text-muted">{tr.common.none}</span>}</td>
              <td className="border-b border-border px-3 py-2 text-right tabular-nums">{r.active}</td>
              <td className="border-b border-border px-3 py-2 text-right">
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Sparkline values={r.weekly} label={`${r.name} haftalık katılım`} />
                  {r.rate === null ? tr.common.none : `%${Math.round(r.rate * 100)}`}
                </span>
              </td>
              <td className={cn("border-b border-border px-3 py-2 text-right tabular-nums", r.atRisk > 0 && "font-medium text-at-risk")}>{r.atRisk}</td>
              <td className="border-b border-border px-3 py-2 text-right whitespace-nowrap">{r.lastSessionLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
