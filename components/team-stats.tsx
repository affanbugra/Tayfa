// Ekip tablosunun araç çubuğundaki küçük istatistik etiketleri: tek satır, yer kaplamaz.
import { Sparkline } from "@/components/charts";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

const pct = (v: number | null) => (v === null ? tr.common.none : `%${Math.round(v * 100)}`);

export type TeamStatsData = {
  last: { label: string; present: number; total: number } | null;
  last4: number | null;
  prev4: number | null;
  program4: number | null;
  active: number;
  held: number;
  watch: number;
  /** Buluşma başına katılım (eski → yeni) */
  trend: (number | null)[];
};

export function TeamStats({ data }: { data: TeamStatsData }) {
  const delta = data.last4 !== null && data.prev4 !== null ? Math.round((data.last4 - data.prev4) * 100) : null;
  const vsProgram = data.last4 !== null && data.program4 !== null ? Math.round((data.last4 - data.program4) * 100) : null;
  return (
    <ul className="flex items-center gap-1.5 whitespace-nowrap" aria-label={tr.sheet.statsTitle}>
      <Chip label={tr.sheet.lastSession} value={data.last ? pct(data.last.total ? data.last.present / data.last.total : null) : tr.common.none} sub={data.last ? `${data.last.present}/${data.last.total}` : undefined} />
      <Chip
        label={tr.sheet.last4Rate}
        value={pct(data.last4)}
        sub={delta === null ? undefined : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"}${Math.abs(delta)}`}
        subTone={delta === null ? undefined : delta > 0 ? "up" : delta < 0 ? "down" : undefined}
      />
      <Chip
        label={tr.sheet.programAvg}
        value={pct(data.program4)}
        sub={vsProgram === null ? undefined : vsProgram >= 0 ? `+${vsProgram} önde` : `${-vsProgram} geride`}
        subTone={vsProgram === null ? undefined : vsProgram >= 0 ? "up" : "down"}
      />
      <Chip label={tr.sheet.watch} value={String(data.watch)} tone={data.watch > 0 ? "warn" : undefined} />
      {data.trend.filter((v) => v !== null).length > 1 && (
        <li className="hidden items-center pl-1 lg:flex">
          <Sparkline values={data.trend} label={tr.sheet.perSession} />
        </li>
      )}
    </ul>
  );
}

function Chip({ label, value, sub, tone, subTone }: { label: string; value: string; sub?: string; tone?: "warn"; subTone?: "up" | "down" }) {
  return (
    <li className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone === "warn" ? "text-at-risk" : "text-text")}>{value}</span>
      {sub && <span className={cn("tabular-nums", subTone === "up" ? "text-present" : subTone === "down" ? "text-absent" : "text-text-muted")}>{sub}</span>}
    </li>
  );
}
