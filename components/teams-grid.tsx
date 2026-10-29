"use client";

// Yönetim özeti: ekip listesi istatistik odaklıdır. Tek seferlik ayarlar (lider e-postası, gün, cinsiyet)
// ekip adının yanındaki küçük etiketten açılan pencerede düzenlenir.
import { Mail, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setTeamField, setTeamLeaderEmail } from "@/app/actions/admin";
import { Sparkline } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

export type TeamGridRow = {
  id: string;
  name: string;
  email: string;
  signedIn: boolean;
  day: string;
  gender: string;
  active: number;
  rate: number | null;
  /** Son 4 haftanın haftalık oranları (eski → yeni) */
  weekly: (number | null)[];
  atRisk: number;
  lastSession: string;
  week: "entered" | "notEntered" | "waiting";
};

const weekLook = {
  entered: "bg-present-bg text-present",
  notEntered: "bg-absent-bg text-absent",
  waiting: "border border-border text-text-muted",
};
const dayShort: Record<string, string> = { saturday: "Cmt", sunday: "Paz" };

type SortKey = "name" | "rate" | "atRisk" | "active";

export function TeamsGrid({ rows, average }: { rows: TeamGridRow[]; average: number | null }) {
  const [edit, setEdit] = useState<TeamGridRow | null>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const sorted = [...rows].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name, "tr") : sort === "rate" ? (b.rate ?? -1) - (a.rate ?? -1) : sort === "atRisk" ? b.atRisk - a.atRisk : b.active - a.active,
  );
  const head = (key: SortKey, label: string, className?: string) => (
    <th className={cn("border-b border-border bg-surface px-3 py-2 font-semibold", className)} aria-sort={sort === key ? (key === "name" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort(key)} className={cn("hover:text-text", sort === key && "text-text")}>
        {label}
        {sort === key && " ↓"}
      </button>
    </th>
  );

  return (
    <>
      {/* Telefon: her ekip iki satır, yana kaydırma yok */}
      <ul className="divide-y divide-border rounded-lg border border-border bg-bg md:hidden">
        {sorted.map((r) => (
          <li key={r.id} className="space-y-1.5 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/yonetim/ekipler/${r.id}`} className="font-medium text-brand-strong">{r.name}</Link>
              <TeamTags row={r} onEdit={() => setEdit(r)} />
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="w-16 shrink-0 tabular-nums">{r.active} {tr.sheet.students.toLowerCase()}</span>
              <div className="min-w-0 flex-1">
                <RateCell value={r.rate} average={average} />
              </div>
              {r.atRisk > 0 && <span className="shrink-0 font-semibold text-at-risk">{tr.sheet.atRisk} {r.atRisk}</span>}
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold", weekLook[r.week])}>
                {r.week === "entered" ? tr.sheet.entered : r.week === "notEntered" ? tr.sheet.notEntered : tr.sheet.waiting}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-bg md:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              {head("name", tr.admin.colTeam)}
              {head("active", tr.sheet.students, "text-right")}
              {head("rate", tr.sheet.last4, "w-64")}
              <th className="border-b border-border bg-surface px-3 py-2 font-semibold">{tr.sheet.trend}</th>
              {head("atRisk", tr.admin.colAtRisk, "text-right")}
              <th className="border-b border-border bg-surface px-3 py-2 font-semibold">{tr.admin.colLastSession}</th>
              <th className="border-b border-border bg-surface px-3 py-2 font-semibold">{tr.sheet.thisWeek}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <td className="border-b border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/yonetim/ekipler/${r.id}`} className="font-medium whitespace-nowrap text-brand-strong hover:underline">{r.name}</Link>
                    <TeamTags row={r} onEdit={() => setEdit(r)} />
                  </div>
                </td>
                <td className="border-b border-border px-3 py-2 text-right tabular-nums">{r.active}</td>
                <td className="border-b border-border px-3 py-2">
                  <RateCell value={r.rate} average={average} />
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Sparkline values={r.weekly} label={`${r.name} ${tr.sheet.trend}`} />
                </td>
                <td className={cn("border-b border-border px-3 py-2 text-right tabular-nums", r.atRisk > 0 && "font-semibold text-at-risk")}>{r.atRisk}</td>
                <td className="border-b border-border px-3 py-2 whitespace-nowrap text-text-muted">{r.lastSession}</td>
                <td className="border-b border-border px-3 py-2">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", weekLook[r.week])}>
                    {r.week === "entered" ? tr.sheet.entered : r.week === "notEntered" ? tr.sheet.notEntered : tr.sheet.waiting}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <TeamSettings row={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

/** Ekip adının yanındaki küçük ayar etiketleri: gün · cinsiyet ve lider e-postası durumu. */
function TeamTags({ row: r, onEdit }: { row: TeamGridRow; onEdit: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${r.name}: ${tr.sheet.teamSettings}`}
        className="inline-flex h-6 items-center gap-1 rounded border border-border px-1.5 text-[11px] text-text-muted hover:border-brand-strong hover:text-brand-strong"
      >
        {r.day || r.gender ? [dayShort[r.day], tr.gender[r.gender]].filter(Boolean).join(" · ") : <Settings2 size={12} aria-hidden />}
      </button>
      {!r.email ? (
        <button type="button" onClick={onEdit} className="inline-flex h-6 items-center gap-1 text-[11px] font-medium text-brand-strong hover:underline">
          <Mail size={12} aria-hidden />
          {tr.sheet.addEmail}
        </button>
      ) : (
        <span title={r.email} className={cn("inline-flex h-6 items-center gap-1 text-[11px]", r.signedIn ? "text-present" : "text-text-muted")}>
          <Mail size={12} aria-hidden />
          {r.signedIn ? tr.sheet.signedInShort : tr.sheet.invitedShort}
        </span>
      )}
    </>
  );
}

/** Katılım: çubuk + yüzde; ince dikey çizgi program ortalaması. */
function RateCell({ value, average }: { value: number | null; average: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative h-2.5 flex-1 rounded-full bg-surface">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(value ?? 0) * 100}%`, background: "var(--chart-1)" }} />
        {average !== null && <span aria-hidden className="absolute -inset-y-1 w-px bg-text-muted" style={{ left: `${average * 100}%` }} />}
      </span>
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{value === null ? tr.common.none : `%${Math.round(value * 100)}`}</span>
    </div>
  );
}

function TeamSettings({ row, onClose }: { row: TeamGridRow; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState(row.email);
  const [day, setDay] = useState(row.day);
  const [gender, setGender] = useState(row.gender);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setPending(true);
    setError(null);
    const results = await Promise.all([
      email.trim().toLowerCase() !== row.email ? setTeamLeaderEmail(row.id, email) : null,
      day !== row.day ? setTeamField(row.id, "meeting_day", day) : null,
      gender !== row.gender ? setTeamField(row.id, "gender", gender) : null,
    ]);
    setPending(false);
    const failed = results.find((r) => r && !r.ok);
    if (failed && !failed.ok) return setError(failed.error);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${row.name}: ${tr.sheet.teamSettings}`} className="w-full max-w-md rounded-t-xl bg-bg p-5 shadow-lg sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{row.name}</h2>
          <button type="button" onClick={onClose} aria-label={tr.common.cancel} className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface">
            <X size={18} aria-hidden />
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">{tr.sheet.leaderEmail}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr.sheet.emailPlaceholder} className={inputClass} autoFocus={!row.email} />
            <span className="mt-1 block text-xs text-text-muted">{tr.sheet.emailHint}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">{tr.admin.colDay}</span>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
                <option value="">{tr.common.none}</option>
                <option value="saturday">{tr.days.saturday}</option>
                <option value="sunday">{tr.days.sunday}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">{tr.sheet.gender}</span>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                <option value="">{tr.common.none}</option>
                <option value="K">{tr.gender.K}</option>
                <option value="E">{tr.gender.E}</option>
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-absent" role="alert">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{tr.common.save}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
