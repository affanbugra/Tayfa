"use client";

// Etkinlikler: (a) kim hangi rotasyon etkinliğini kaç kez yaptı matrisi, (b) haftalık plan ve öneriler.
// Öneriyi sistem yapar, kararı yönetim verir; "Planı kaydet" her ekibin tablosunda sütun açar.
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { savePlan } from "@/app/actions/plan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Matrix, WeekPlan } from "@/lib/data/matching";
import { addDaysIso, formatDateShort, formatDateTr } from "@/lib/dates";
import { tr } from "@/lib/i18n/tr";
import { suggest } from "@/lib/matching/suggest";

type Row = { typeId: string; date: string };
type Filter = { gender: "" | "E" | "K"; day: "" | "saturday" | "sunday" };

const cellTone = (count: number, mean: number) =>
  count === 0 ? "bg-accent font-semibold text-text" : count < mean - 0.5 ? "bg-accent-tint text-text" : count > mean + 0.5 ? "bg-surface text-text-muted" : "bg-bg text-text";

export function ActivityPlanner({ matrix, weekStart, plan }: { matrix: Matrix; weekStart: string; plan: WeekPlan }) {
  const [filter, setFilter] = useState<Filter>({ gender: "", day: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const rotation = matrix.types.filter((t) => t.in_rotation);
  const teams = matrix.teams.filter((t) => (!filter.gender || t.gender === filter.gender) && (!filter.day || t.meeting_day === filter.day));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtre">
        <Seg label="Ekip" value={filter.gender} options={[["", "Tümü"], ["E", tr.sheet.boys], ["K", tr.sheet.girls]]} onChange={(gender) => setFilter((f) => ({ ...f, gender: gender as Filter["gender"] }))} />
        <Seg label="Gün" value={filter.day} options={[["", "Tümü"], ["saturday", "Cmt"], ["sunday", "Paz"]]} onChange={(day) => setFilter((f) => ({ ...f, day: day as Filter["day"] }))} />
      </div>
      <MatrixTable matrix={matrix} teams={teams} rotation={rotation} />
      {/* Sunucudaki plan değişince form taze verilerle yeniden kurulur */}
      <Planner key={`${weekStart}:${JSON.stringify(plan)}`} matrix={matrix} teams={teams} rotation={rotation} weekStart={weekStart} plan={plan} notice={notice} onSaved={setNotice} />
    </div>
  );
}

function Seg({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-sm">
      <span className="px-2 text-xs text-text-muted">{label}</span>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={cn("min-h-9 rounded-md px-3", value === v ? "bg-brand-tint font-semibold text-brand-strong" : "text-text hover:bg-surface")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function MatrixTable({ matrix, teams, rotation }: { matrix: Matrix; teams: Matrix["teams"]; rotation: Matrix["types"] }) {
  const count = (teamId: string, typeId: string) => matrix.history[teamId]?.[typeId]?.count ?? 0;
  const mean = (typeId: string) => (teams.length ? teams.reduce((s, t) => s + count(t.id, typeId), 0) / teams.length : 0);
  const means = new Map(rotation.map((ty) => [ty.id, mean(ty.id)]));

  return (
    <section className="rounded-lg border border-border bg-bg">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text">{tr.plan.matrixTitle}</h2>
          <p className="text-xs text-text-muted">{tr.plan.matrixSub}</p>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-text" aria-label="Renk anahtarı">
          <Key className="bg-accent" label={tr.plan.never} />
          <Key className="bg-accent-tint" label={tr.plan.below} />
          <Key className="border border-border bg-bg" label={tr.plan.average} />
          <Key className="bg-surface" label={tr.plan.above} />
        </ul>
      </header>
      <div className="max-h-[70dvh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs text-text-muted">
              <th className="sticky top-0 left-0 z-30 min-w-40 border-r border-b border-border bg-surface px-3 py-2 text-left font-semibold">{tr.admin.colTeam}</th>
              {rotation.map((ty) => (
                <th key={ty.id} className="sticky top-0 z-20 min-w-16 border-b border-border bg-surface px-1 py-2 text-center font-semibold">
                  <span className="block max-w-20 truncate" title={ty.name}>{ty.name}</span>
                </th>
              ))}
              <th className="sticky top-0 z-20 border-b border-l border-border bg-surface px-2 py-2 text-center font-semibold" title={tr.plan.neverColHint}>{tr.plan.neverCol}</th>
              <th className="sticky top-0 z-20 border-b border-border bg-surface px-2 py-2 text-center font-semibold" title={tr.plan.commonHint}>{tr.plan.commonCol}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const nevers = rotation.filter((ty) => count(t.id, ty.id) === 0).length;
              return (
                <tr key={t.id}>
                  <td className="sticky left-0 z-10 border-r border-b border-border bg-bg px-3 py-1.5 whitespace-nowrap">
                    <Link href={`/yonetim/ekipler/${t.id}`} className="font-medium text-text hover:text-brand-strong">{t.name}</Link>
                  </td>
                  {rotation.map((ty) => {
                    const c = count(t.id, ty.id);
                    const ds = matrix.dates[`${t.id}:${ty.id}`] ?? [];
                    return (
                      <td key={ty.id} className="border-b border-border p-0.5">
                        <span
                          title={ds.length ? `${ty.name}: ${ds.map(formatDateShort).join(", ")}` : `${ty.name}: ${tr.plan.never.toLowerCase()}`}
                          className={cn("flex h-8 items-center justify-center rounded tabular-nums", cellTone(c, means.get(ty.id) ?? 0))}
                        >
                          {c}
                        </span>
                      </td>
                    );
                  })}
                  <td className={cn("border-b border-l border-border px-2 text-center tabular-nums", nevers > 0 ? "font-semibold text-text" : "text-text-muted")}>{nevers}</td>
                  <td className="border-b border-border px-2 text-center text-text-muted tabular-nums">{matrix.common[t.id] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-xs">
              <td className="sticky bottom-0 left-0 z-30 border-r border-border bg-surface px-3 py-1.5 font-semibold text-text-muted">{tr.plan.avgRow}</td>
              {rotation.map((ty) => (
                <td key={ty.id} className="sticky bottom-0 z-20 bg-surface px-1 py-1.5 text-center font-semibold text-text tabular-nums">
                  {(means.get(ty.id) ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
                </td>
              ))}
              <td className="sticky bottom-0 z-20 border-l border-border bg-surface" />
              <td className="sticky bottom-0 z-20 bg-surface" />
            </tr>
            <tr className="text-xs">
              <td className="sticky bottom-0 left-0 z-30 border-r border-border bg-surface px-3 py-1.5 font-semibold text-text-muted">{tr.plan.neverRow}</td>
              {rotation.map((ty) => {
                const n = teams.filter((t) => count(t.id, ty.id) === 0).length;
                return (
                  <td key={ty.id} className={cn("sticky bottom-0 z-20 bg-surface px-1 py-1.5 text-center tabular-nums", n ? "font-semibold text-text" : "text-text-muted")}>
                    {n}
                  </td>
                );
              })}
              <td className="sticky bottom-0 z-20 border-l border-border bg-surface" />
              <td className="sticky bottom-0 z-20 bg-surface" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block size-3 rounded-sm", className)} />
      {label}
    </li>
  );
}

function Planner({
  matrix,
  teams,
  rotation,
  weekStart,
  plan,
  notice,
  onSaved,
}: {
  matrix: Matrix;
  teams: Matrix["teams"];
  rotation: Matrix["types"];
  weekStart: string;
  plan: WeekPlan;
  notice: string | null;
  onSaved: (message: string | null) => void;
}) {
  const router = useRouter();
  const sunday = addDaysIso(weekStart, 1);
  const defaultDate = (t: Matrix["teams"][number]) => (t.meeting_day === "sunday" ? sunday : weekStart);
  const initial = useMemo(
    () => Object.fromEntries(matrix.teams.map((t) => [t.id, { typeId: plan.entries[t.id]?.typeId ?? "", date: plan.entries[t.id]?.date ?? defaultDate(t) }])) as Record<string, Row>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [rows, setRows] = useState(initial);
  const [capacity, setCapacity] = useState<Record<string, number>>(() => Object.fromEntries(rotation.map((t) => [t.id, plan.capacity[t.id] ?? t.capacity])));
  const [common, setCommon] = useState("");
  const [state, setState] = useState<{ pending?: boolean; error?: string }>({});
  const typeName = new Map(matrix.types.map((t) => [t.id, t.name]));

  const fixed = Object.fromEntries(Object.entries(rows).filter(([, r]) => r.typeId).map(([id, r]) => [id, r.typeId]));
  const result = suggest({
    weekStart,
    teams: matrix.teams,
    types: rotation.map((t) => ({ id: t.id, name: t.name, order: t.order })),
    history: matrix.planHistory,
    recent: matrix.planRecent,
    capacity,
    fixed,
    weights: matrix.weights,
  });
  const used = new Map<string, number>();
  for (const r of Object.values(rows)) if (r.typeId) used.set(r.typeId, (used.get(r.typeId) ?? 0) + 1);
  const dirty = matrix.teams.filter((t) => rows[t.id].typeId !== initial[t.id].typeId || rows[t.id].date !== initial[t.id].date);
  const empty = teams.filter((t) => !rows[t.id].typeId).length;
  // Hiç yapılmamış (ekip, rotasyon türü) çiftleri: şimdi → bu form kaydedilirse
  const neverNow = result.neverBefore;
  const neverAfter = result.neverAfter;

  const set = (teamId: string, patch: Partial<Row>) => {
    onSaved(null);
    setRows((r) => ({ ...r, [teamId]: { ...r[teamId], ...patch } }));
  };

  function applySuggestions() {
    setRows((r) => {
      const copy = { ...r };
      for (const t of teams) if (!copy[t.id].typeId && result.byTeam[t.id]?.pick) copy[t.id] = { ...copy[t.id], typeId: result.byTeam[t.id].pick!.typeId };
      return copy;
    });
  }

  async function save() {
    setState({ pending: true });
    const res = await savePlan({
      weekStart,
      entries: dirty.map((t) => ({ teamId: t.id, typeId: rows[t.id].typeId || null, date: rows[t.id].date })),
      capacity,
    });
    if (!res.ok) return setState({ error: res.error });
    setState({});
    onSaved(tr.plan.saved);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-border bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text">{tr.plan.plannerTitle}</h2>
          <p className="text-xs text-text-muted">{tr.plan.plannerSub}</p>
        </div>
        <nav className="flex items-center gap-1" aria-label={tr.plan.week}>
          <Link href={`?hafta=${addDaysIso(weekStart, -7)}`} aria-label={tr.plan.prevWeek} className="flex size-10 items-center justify-center rounded-lg border border-border hover:bg-surface">
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <span className="min-w-44 px-2 text-center text-sm font-semibold text-text">{formatDateTr(weekStart)}</span>
          <Link href={`?hafta=${addDaysIso(weekStart, 7)}`} aria-label={tr.plan.nextWeek} className="flex size-10 items-center justify-center rounded-lg border border-border hover:bg-surface">
            <ChevronRight size={18} aria-hidden />
          </Link>
        </nav>
      </header>

      {/* Kontenjanlar: canlı sayaç, haftaya özel değiştirilebilir */}
      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3" aria-label={tr.plan.capacity}>
        {rotation.map((ty) => {
          const n = used.get(ty.id) ?? 0;
          const over = n > (capacity[ty.id] ?? 0);
          return (
            <label key={ty.id} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", over ? "border-absent bg-absent-bg text-absent" : "border-border text-text")}>
              <span className="font-medium">{ty.name}</span>
              <span className="tabular-nums">{n}/</span>
              <input
                type="number"
                min={0}
                max={50}
                value={capacity[ty.id] ?? 0}
                onChange={(e) => setCapacity((c) => ({ ...c, [ty.id]: Math.max(0, Math.min(50, Number(e.target.value) || 0)) }))}
                aria-label={`${ty.name} ${tr.plan.capacity}`}
                className="w-10 rounded border border-border bg-bg px-1 text-center tabular-nums"
              />
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Button type="button" onClick={applySuggestions} disabled={empty === 0}>
          <Sparkles size={16} aria-hidden />
          {tr.plan.applySuggestions}
        </Button>
        <span className="text-xs text-text-muted">{tr.plan.or}</span>
        <select value={common} onChange={(e) => setCommon(e.target.value)} aria-label={tr.plan.commonAll} className="min-h-11 rounded-lg border border-border bg-bg px-2 text-sm">
          <option value="">{tr.plan.commonAll}</option>
          {matrix.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Button type="button" variant="secondary" disabled={!common} onClick={() => setRows((r) => Object.fromEntries(Object.entries(r).map(([id, row]) => [id, teams.some((t) => t.id === id) ? { ...row, typeId: common } : row])))}>
          {tr.plan.applyAll}
        </Button>
        <p className="ml-auto text-xs text-text-muted">
          {tr.plan.neverSummary} <span className="font-semibold text-text tabular-nums">{neverNow}</span> → <span className="font-semibold text-text tabular-nums">{neverAfter}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="border-y border-border bg-surface px-4 py-2 font-semibold">{tr.admin.colTeam}</th>
              <th className="border-y border-border bg-surface px-2 py-2 font-semibold">{tr.admin.colDay}</th>
              <th className="border-y border-border bg-surface px-2 py-2 font-semibold">{tr.plan.suggestion}</th>
              <th className="border-y border-border bg-surface px-2 py-2 font-semibold">{tr.plan.choice}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const row = rows[t.id];
              const sug = result.byTeam[t.id];
              const chosenReason = row.typeId ? sug?.all.find((o) => o.typeId === row.typeId)?.reason : null;
              const changed = row.typeId !== initial[t.id].typeId || row.date !== initial[t.id].date;
              return (
                <tr key={t.id} className={changed ? "bg-brand-tint/40" : undefined}>
                  <td className="border-b border-border px-4 py-2 font-medium whitespace-nowrap text-text">{t.name}</td>
                  <td className="border-b border-border px-2 py-2">
                    <select value={row.date} onChange={(e) => set(t.id, { date: e.target.value })} aria-label={`${t.name} ${tr.admin.colDay}`} className="h-9 rounded-md border border-border bg-bg px-2 text-sm">
                      <option value={weekStart}>{tr.days.saturday} {formatDateShort(weekStart)}</option>
                      <option value={sunday}>{tr.days.sunday} {formatDateShort(sunday)}</option>
                    </select>
                  </td>
                  <td className="border-b border-border px-2 py-2">
                    {row.typeId ? (
                      <span className="text-xs text-text-muted">{chosenReason ?? ""}</span>
                    ) : sug?.pick ? (
                      <button type="button" onClick={() => set(t.id, { typeId: sug.pick!.typeId })} className="group flex items-center gap-2 text-left" aria-label={`${tr.plan.useSuggestion}: ${typeName.get(sug.pick.typeId)}`}>
                        <span className="rounded-full border border-dashed border-brand-strong px-2.5 py-0.5 text-xs font-semibold text-brand-strong group-hover:bg-brand-tint">{typeName.get(sug.pick.typeId)}</span>
                        <span className="text-xs text-text-muted">{sug.pick.reason}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">{tr.plan.noRoom}</span>
                    )}
                  </td>
                  <td className="border-b border-border px-2 py-2">
                    <select value={row.typeId} onChange={(e) => set(t.id, { typeId: e.target.value })} aria-label={`${t.name} ${tr.plan.choice}`} className={cn("h-9 w-48 rounded-md border bg-bg px-2 text-sm", row.typeId ? "border-brand-strong font-medium" : "border-border text-text-muted")}>
                      <option value="">{tr.common.none}</option>
                      <optgroup label={tr.plan.rotation}>
                        {rotation.map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
                      </optgroup>
                      <optgroup label={tr.plan.commonGroup}>
                        {matrix.types.filter((ty) => !ty.in_rotation).map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
                      </optgroup>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-11 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3">
        <p className="text-sm text-text" aria-live="polite">
          {state.error ? <span className="text-absent">{state.error}</span> : notice && dirty.length === 0 ? <span className="text-present">{notice}</span> : dirty.length ? `${dirty.length} ${tr.plan.unsaved}` : tr.plan.noChanges}
        </p>
        <Button type="button" onClick={save} disabled={state.pending || dirty.length === 0}>
          {tr.plan.save}
        </Button>
      </div>
    </section>
  );
}
