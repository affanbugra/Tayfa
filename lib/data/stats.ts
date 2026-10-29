// İstatistik sorguları: özet kartları ve grafikler. Sadece toplam sayılar döner, kişi verisi yok.
import "server-only";
import type { Tx } from "@/lib/db";

export type WeekPoint = {
  week_start: string;
  present: number;
  absent: number;
  excused: number;
  /** O hafta yoklama giren ekip sayısı */
  teams: number;
  /** Sınıf seviyesine göre katılım (geldi / işaretli) */
  g10: { present: number; total: number };
  g11: { present: number; total: number };
};

/** Yönetim: program boyunca haftalık katılım, 10. ve 11. sınıf ayrı. RLS'e göre admin her şeyi görür. */
export async function getProgramTrend(tx: Tx): Promise<WeekPoint[]> {
  const rows = await tx<{ week_start: string; grade: number; present: number; absent: number; excused: number; teams: number }[]>`
    select (se.date - ((extract(isodow from se.date)::int + 1) % 7))::date as week_start, t.grade,
      count(*) filter (where a.status = 'present')::int as present,
      count(*) filter (where a.status = 'absent')::int as absent,
      count(*) filter (where a.status = 'excused')::int as excused,
      count(distinct se.team_id) filter (where a.session_id is not null)::int as teams
    from public.sessions se
    join public.teams t on t.id = se.team_id and t.is_active
    left join public.attendance a on a.session_id = se.id
    where se.status = 'held'
    group by 1, 2 order by 1`;
  const byWeek = new Map<string, WeekPoint>();
  for (const r of rows) {
    const w = byWeek.get(r.week_start) ?? {
      week_start: r.week_start,
      present: 0,
      absent: 0,
      excused: 0,
      teams: 0,
      g10: { present: 0, total: 0 },
      g11: { present: 0, total: 0 },
    };
    w.present += r.present;
    w.absent += r.absent;
    w.excused += r.excused;
    w.teams += r.teams;
    const g = r.grade === 10 ? w.g10 : w.g11;
    g.present += r.present;
    g.total += r.present + r.absent + r.excused;
    byWeek.set(r.week_start, w);
  }
  return [...byWeek.values()];
}

/** Lider dahil herkes: program geneli haftalık oran (security definer fonksiyon, sadece toplamlar). */
export async function getProgramWeekRates(tx: Tx): Promise<{ week_start: string; present: number; total: number }[]> {
  return tx<{ week_start: string; present: number; total: number }[]>`select * from public.program_week_rates()`;
}

/** Etkinlik türüne göre katılım (hangi etkinlik daha çok katılım getiriyor). */
export async function getTypeRates(tx: Tx): Promise<{ name: string; sessions: number; present: number; total: number }[]> {
  return tx<{ name: string; sessions: number; present: number; total: number }[]>`
    select at.name, count(distinct se.id)::int as sessions,
      count(a.*) filter (where a.status = 'present')::int as present, count(a.*)::int as total
    from public.sessions se
    join public.teams t on t.id = se.team_id and t.is_active
    join public.session_activity_types sat on sat.session_id = se.id
    join public.activity_types at on at.id = sat.activity_type_id
    left join public.attendance a on a.session_id = se.id
    where se.status = 'held'
    group by at.name, at.sort_order
    having count(a.*) > 0
    order by at.sort_order`;
}

/** Gerçekleşen buluşmalarda 3 ve üzeri kez gelmeyen (çıkarılmamış) öğrenci sayısı. */
export async function countFrequentAbsentees(tx: Tx): Promise<number> {
  const [r] = await tx<{ n: number }[]>`
    select count(*)::int as n from (
      select s.id from public.students s
      join public.teams t on t.id = s.team_id and t.is_active
      join public.attendance a on a.student_id = s.id and a.status = 'absent'
      join public.sessions se on se.id = a.session_id and se.status = 'held'
      where s.status <> 'removed'
      group by s.id having count(*) >= 3
    ) x`;
  return r.n;
}
