"use client";

// Ekip tablosunun üstündeki istatistik şeridi. Gizlenebilir; tercih bu tarayıcıda hatırlanır.
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { RateColumns, type ColumnItem } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { tr } from "@/lib/i18n/tr";

const KEY = "tayfa.stats.hidden";
const pct = (v: number | null) => (v === null ? tr.common.none : `%${Math.round(v * 100)}`);

export type TeamStatsData = {
  last: { label: string; present: number; total: number } | null;
  last4: number | null;
  prev4: number | null;
  program4: number | null;
  active: number;
  held: number;
  watch: number;
  columns: ColumnItem[];
};

export function TeamStats({ data }: { data: TeamStatsData }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);
  const toggle = () => {
    setHidden((h) => {
      try {
        localStorage.setItem(KEY, h ? "0" : "1");
      } catch {}
      return !h;
    });
  };

  const delta = data.last4 !== null && data.prev4 !== null ? Math.round((data.last4 - data.prev4) * 100) : null;
  const vsProgram = data.last4 !== null && data.program4 !== null ? Math.round((data.last4 - data.program4) * 100) : null;

  return (
    <section aria-label={tr.sheet.statsTitle} className="px-4 pt-2 md:px-6">
      <div className="flex justify-end">
        <button type="button" onClick={toggle} aria-expanded={!hidden} className="flex min-h-9 items-center gap-1 text-xs font-medium text-text-muted hover:text-text">
          {hidden ? tr.sheet.showStats : tr.sheet.hideStats}
          {hidden ? <ChevronDown size={14} aria-hidden /> : <ChevronUp size={14} aria-hidden />}
        </button>
      </div>
      {!hidden && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Telefonda yana kayan tek satır, masaüstünde 4'lü ızgara */}
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0 md:pb-0 [&>*]:w-40 [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
            <StatTile
              compact
              label={tr.sheet.lastSession}
              value={data.last ? pct(data.last.total ? data.last.present / data.last.total : null) : tr.common.none}
              sub={data.last ? `${data.last.label} · ${data.last.present}/${data.last.total} geldi` : undefined}
            />
            <StatTile compact label={tr.sheet.last4Rate} value={pct(data.last4)} delta={delta} deltaLabel={tr.sheet.vsPrev} />
            <StatTile
              compact
              label={tr.sheet.programAvg}
              value={pct(data.program4)}
              sub={vsProgram === null ? undefined : vsProgram >= 0 ? `Ekip ${vsProgram} puan önde` : `Ekip ${-vsProgram} puan geride`}
            />
            <StatTile compact label={tr.sheet.watch} value={data.watch} sub={tr.sheet.watchSub} tone={data.watch > 0 ? "warn" : undefined} />
          </div>
          <div className="hidden rounded-lg border border-border bg-bg p-3 lg:block">
            <p className="text-xs font-medium text-text-muted">
              {tr.sheet.perSession} <span className="font-normal">· {data.held} {tr.sheet.sessionsHeld.toLowerCase()}</span>
            </p>
            {data.columns.length ? (
              <RateColumns caption={tr.sheet.perSession} items={data.columns} average={data.program4} averageLabel={tr.sheet.programAvg} height={88} />
            ) : (
              <p className="py-6 text-sm text-text-muted">{tr.team.noSessions}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
