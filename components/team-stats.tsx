// Ekip tablosunun üstündeki küçük istatistik satırı: dört kutu, kaydırmadan hepsi görünür.
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
    <dl className="grid grid-cols-4 divide-x divide-border md:max-w-2xl" aria-label={tr.sheet.statsTitle}>
      <Stat label={tr.sheet.lastShort} value={data.last ? pct(data.last.total ? data.last.present / data.last.total : null) : tr.common.none} sub={data.last ? `${data.last.present}/${data.last.total}` : undefined} />
      <Stat
        label={tr.sheet.last4Short}
        value={pct(data.last4)}
        sub={delta === null ? undefined : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"}${Math.abs(delta)}`}
        subTone={delta === null ? undefined : delta > 0 ? "up" : delta < 0 ? "down" : undefined}
      />
      <Stat
        label={tr.sheet.programShort}
        value={pct(data.program4)}
        sub={vsProgram === null ? undefined : vsProgram >= 0 ? `+${vsProgram}` : `−${-vsProgram}`}
        subTone={vsProgram === null ? undefined : vsProgram >= 0 ? "up" : "down"}
      />
      <Stat label={tr.sheet.watch} value={String(data.watch)} tone={data.watch > 0 ? "warn" : undefined} />
    </dl>
  );
}

function Stat({ label, value, sub, tone, subTone }: { label: string; value: string; sub?: string; tone?: "warn"; subTone?: "up" | "down" }) {
  return (
    <div className="min-w-0 px-2 first:pl-0 md:px-4">
      <dt className="truncate text-[10px] text-text-muted md:text-[11px]">{label}</dt>
      <dd className="flex items-baseline gap-1 whitespace-nowrap">
        <span className={cn("text-sm font-semibold tabular-nums", tone === "warn" ? "text-at-risk" : "text-text")}>{value}</span>
        {sub && <span className={cn("text-[10px] tabular-nums md:text-[11px]", subTone === "up" ? "text-present" : subTone === "down" ? "text-absent" : "text-text-muted")}>{sub}</span>}
      </dd>
    </div>
  );
}
