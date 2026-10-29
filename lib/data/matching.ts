// Eşleştirme: kim hangi etkinliği kaç kez yaptı + haftalık plan. Sadece gerçekleşen buluşmalar sayılır.
import "server-only";
import type { Tx } from "@/lib/db";
import { defaultWeights, type History, type Weights } from "@/lib/matching/suggest";

export type MatrixTeam = { id: string; name: string; grade: number; gender: string | null; meeting_day: string | null };
export type MatrixType = { id: string; name: string; order: number; capacity: number; in_rotation: boolean };

export type Matrix = {
  teams: MatrixTeam[];
  types: MatrixType[];
  history: History;
  /** `${teamId}:${typeId}` → yapıldığı tarihler */
  dates: Record<string, string[]>;
  /** Ekibin son 2 rotasyon buluşmasında yaptığı rotasyon türleri */
  recent: Record<string, string[]>;
  /** Rotasyon dışı (Liderlik, Şenlik…) buluşma sayısı */
  common: Record<string, number>;
  weights: Weights;
};

export async function getMatrix(tx: Tx, today: string): Promise<Matrix> {
  const [teams, types, done, settings] = await Promise.all([
    tx<MatrixTeam[]>`select id, name, grade, gender, meeting_day from public.teams where is_active`,
    tx<MatrixType[]>`
      select id, name, sort_order as "order", coalesce(default_capacity, 0) as capacity, in_rotation
      from public.activity_types where is_active order by sort_order, name`,
    tx<{ team_id: string; type_id: string; date: string }[]>`
      select se.team_id, sat.activity_type_id as type_id, se.date
      from public.sessions se
      join public.session_activity_types sat on sat.session_id = se.id
      join public.teams t on t.id = se.team_id and t.is_active
      where se.status = 'held' and se.date <= ${today}
      order by se.date`,
    tx<{ matching_weights: Weights }[]>`select matching_weights from public.settings limit 1`,
  ]);
  teams.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "tr"));
  const rotation = new Set(types.filter((t) => t.in_rotation).map((t) => t.id));
  const history: History = {};
  const dates: Record<string, string[]> = {};
  const common: Record<string, number> = {};
  const rotationSessions: Record<string, { date: string; types: string[] }[]> = {};
  for (const d of done) {
    if (rotation.has(d.type_id)) {
      const h = ((history[d.team_id] ??= {})[d.type_id] ??= { count: 0, last: null });
      h.count++;
      h.last = d.date;
      (dates[`${d.team_id}:${d.type_id}`] ??= []).push(d.date);
      const list = (rotationSessions[d.team_id] ??= []);
      const lastEntry = list[list.length - 1];
      if (lastEntry?.date === d.date) lastEntry.types.push(d.type_id);
      else list.push({ date: d.date, types: [d.type_id] });
    } else {
      common[d.team_id] = (common[d.team_id] ?? 0) + 1;
    }
  }
  const recent: Record<string, string[]> = {};
  for (const [teamId, list] of Object.entries(rotationSessions)) recent[teamId] = list.slice(-2).flatMap((x) => x.types);
  return { teams, types, history, dates, recent, common, weights: { ...defaultWeights, ...(settings[0]?.matching_weights ?? {}) } };
}

export type WeekPlan = {
  entries: Record<string, { typeId: string; date: string | null }>;
  /** Haftaya özel kontenjan (yoksa türün varsayılanı) */
  capacity: Record<string, number>;
};

export async function getWeekPlan(tx: Tx, weekStart: string): Promise<WeekPlan> {
  const [entries, caps] = await Promise.all([
    tx<{ team_id: string; activity_type_id: string; planned_date: string | null }[]>`
      select team_id, activity_type_id, planned_date from public.plan_entries where week_start = ${weekStart} order by created_at`,
    tx<{ activity_type_id: string; max_teams: number }[]>`
      select activity_type_id, max_teams from public.activity_capacity where week_start = ${weekStart}`,
  ]);
  return {
    entries: Object.fromEntries(entries.map((e) => [e.team_id, { typeId: e.activity_type_id, date: e.planned_date }])),
    capacity: Object.fromEntries(caps.map((c) => [c.activity_type_id, c.max_teams])),
  };
}
