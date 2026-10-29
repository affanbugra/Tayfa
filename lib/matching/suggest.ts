// Haftalık eşleştirme önerisi (CLAUDE.md §6.9-d). Saf fonksiyon: aynı girdiye her zaman aynı çıktı.
// Amaç adalet: her ekip her rotasyon etkinliğini eşit sayıda yapsın.

export type Weights = { never: number; deficit: number; waitWeeksMax: number; repeatPenalty: number };
export const defaultWeights: Weights = { never: 100, deficit: 10, waitWeeksMax: 12, repeatPenalty: -50 };

export type SuggestTeam = { id: string; name: string };
export type SuggestType = { id: string; name: string; order: number };
/** Ekibin bir türü bu dönem kaç kez yaptığı ve en son ne zaman */
export type History = Record<string, Record<string, { count: number; last: string | null }>>;

export type SuggestInput = {
  weekStart: string;
  teams: SuggestTeam[];
  types: SuggestType[];
  history: History;
  /** Ekibin son 2 rotasyon buluşmasında yaptığı türler (tekrar cezası) */
  recent: Record<string, string[]>;
  /** Tür başına bu hafta en fazla kaç ekip */
  capacity: Record<string, number>;
  /** Yönetimin elle seçtikleri: sabit kabul edilir, kontenjandan düşülür */
  fixed: Record<string, string>;
  weights?: Weights;
};

export type Option = { typeId: string; score: number; reason: string };
export type TeamSuggestion = { teamId: string; pick: Option | null; alternatives: Option[]; /** Tüm türler, puana göre */ all: Option[] };
export type SuggestResult = {
  byTeam: Record<string, TeamSuggestion>;
  /** Hiç yapılmamış (ekip, tür) çifti: şimdi ve bu plan uygulanırsa */
  neverBefore: number;
  neverAfter: number;
};

const weeksBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / (7 * 86_400_000));

export function suggest(input: SuggestInput): SuggestResult {
  const w = input.weights ?? defaultWeights;
  const typeById = new Map(input.types.map((t) => [t.id, t]));
  const countOf = (teamId: string, typeId: string) => input.history[teamId]?.[typeId]?.count ?? 0;
  const maxCount = new Map(input.types.map((t) => [t.id, Math.max(0, ...input.teams.map((tm) => countOf(tm.id, t.id)))]));
  const neverCount = new Map(input.teams.map((tm) => [tm.id, input.types.filter((t) => countOf(tm.id, t.id) === 0).length]));

  function score(teamId: string, typeId: string): Option {
    const h = input.history[teamId]?.[typeId];
    const count = h?.count ?? 0;
    const max = maxCount.get(typeId) ?? 0;
    const waited = count === 0 || !h?.last ? w.waitWeeksMax : Math.min(w.waitWeeksMax, Math.max(0, weeksBetween(h.last, input.weekStart)));
    const repeat = input.recent[teamId]?.includes(typeId) ? w.repeatPenalty : 0;
    const total = (count === 0 ? w.never : 0) + (max - count) * w.deficit + waited + repeat;
    const name = typeById.get(typeId)?.name ?? "";
    const reason =
      count === 0
        ? `${name} hiç yapılmadı`
        : max > count
          ? `${name}: ekip ${count} kez, en çok ${max}`
          : repeat
            ? `${name}: yakın zamanda yapıldı`
            : `${name} ${waited} haftadır yapılmadı`;
    return { typeId, score: total, reason };
  }

  const remaining = new Map(input.types.map((t) => [t.id, input.capacity[t.id] ?? 0]));
  for (const typeId of Object.values(input.fixed)) remaining.set(typeId, (remaining.get(typeId) ?? 0) - 1);

  const teamOrder = new Map(
    [...input.teams]
      .sort((a, b) => (neverCount.get(b.id) ?? 0) - (neverCount.get(a.id) ?? 0) || a.name.localeCompare(b.name, "tr"))
      .map((t, i) => [t.id, i]),
  );
  const free = input.teams.filter((t) => !input.fixed[t.id]);
  const options = new Map(free.map((t) => [t.id, input.types.map((ty) => score(t.id, ty.id))]));

  // Açgözlü atama: en yüksek puanlı (ekip, tür) çifti önce; eşitlikte daha çok "hiç yapmadığı" olan ekip, sonra ad, sonra tür sırası.
  const pairs = free.flatMap((t) => options.get(t.id)!.map((o) => ({ teamId: t.id, ...o })));
  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      (teamOrder.get(a.teamId) ?? 0) - (teamOrder.get(b.teamId) ?? 0) ||
      (typeById.get(a.typeId)?.order ?? 0) - (typeById.get(b.typeId)?.order ?? 0),
  );
  const picks = new Map<string, Option>();
  for (const p of pairs) {
    if (picks.has(p.teamId) || (remaining.get(p.typeId) ?? 0) <= 0) continue;
    picks.set(p.teamId, { typeId: p.typeId, score: p.score, reason: p.reason });
    remaining.set(p.typeId, (remaining.get(p.typeId) ?? 0) - 1);
  }

  const byTeam: Record<string, TeamSuggestion> = {};
  for (const t of input.teams) {
    const fixedType = input.fixed[t.id];
    const all = (options.get(t.id) ?? input.types.map((ty) => score(t.id, ty.id))).slice().sort((a, b) => b.score - a.score || (typeById.get(a.typeId)?.order ?? 0) - (typeById.get(b.typeId)?.order ?? 0));
    const pick = fixedType ? null : (picks.get(t.id) ?? null);
    const taken = pick?.typeId ?? fixedType;
    byTeam[t.id] = { teamId: t.id, pick, alternatives: all.filter((o) => o.typeId !== taken).slice(0, 2), all };
  }

  let neverBefore = 0;
  let neverAfter = 0;
  for (const t of input.teams) {
    const chosen = input.fixed[t.id] ?? picks.get(t.id)?.typeId;
    for (const ty of input.types) {
      if (countOf(t.id, ty.id) > 0) continue;
      neverBefore++;
      if (chosen !== ty.id) neverAfter++;
    }
  }
  return { byTeam, neverBefore, neverAfter };
}
