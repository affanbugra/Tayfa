// Yönetim ekranları için toplu sorgular.
import "server-only";
import type { Tx } from "@/lib/db";

export type TeamOverviewRow = {
  id: string;
  name: string;
  leader_name: string | null;
  leader_email: string | null;
  grade: number;
  gender: string | null;
  meeting_day: string | null;
  active_students: number;
  at_risk: number;
  last_session: string | null;
  recent_present: number;
  recent_total: number;
  this_week: boolean;
  /** Son 4 haftanın haftalık katılım oranları (eski → yeni), buluşma yoksa null */
  weekly: (number | null)[];
};

export async function getTeamsOverview(tx: Tx, weekStart: string): Promise<TeamOverviewRow[]> {
  const rows = await tx<(Omit<TeamOverviewRow, "weekly"> & { weekly: { w: number; p: number; t: number }[] | null })[]>`
    with weeks as (select generate_series(0, 3) as w),
    held as (
      select se.team_id, se.date,
        floor((${weekStart}::date - (se.date - ((extract(isodow from se.date)::int + 1) % 7))) / 7)::int as w,
        count(*) filter (where a.status = 'present')::int as pc, count(a.*)::int as tc
      from public.sessions se left join public.attendance a on a.session_id = se.id
      where se.status = 'held'
      group by se.id
    )
    select t.id, t.name, t.leader_name, pr.email as leader_email, t.grade, t.gender, t.meeting_day,
      (select count(*)::int from public.students s where s.team_id = t.id and s.status <> 'removed') as active_students,
      (select count(*)::int from public.students s where s.team_id = t.id and s.status = 'at_risk') as at_risk,
      (select max(date) from public.sessions se where se.team_id = t.id) as last_session,
      coalesce((select sum(h.pc)::int from held h where h.team_id = t.id and h.w between 0 and 3), 0) as recent_present,
      coalesce((select sum(h.tc)::int from held h where h.team_id = t.id and h.w between 0 and 3), 0) as recent_total,
      exists (select 1 from public.sessions se where se.team_id = t.id and se.date between ${weekStart}::date and ${weekStart}::date + 6) as this_week,
      (select json_agg(json_build_object('w', wk.w, 'p', coalesce(h.p, 0), 't', coalesce(h.n, 0)) order by wk.w desc)
         from weeks wk left join (select hh.w, sum(hh.pc)::int p, sum(hh.tc)::int n from held hh where hh.team_id = t.id group by hh.w) h on h.w = wk.w) as weekly
    from public.teams t left join public.profiles pr on pr.id = t.leader_id
    where t.is_active`;
  return rows
    .map((r) => ({ ...r, weekly: (r.weekly ?? []).map((x) => (x.t ? x.p / x.t : null)) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function getWeekTotals(tx: Tx, from: string, to: string): Promise<{ present: number; total: number; teams: number }> {
  const [r] = await tx<{ present: number; total: number; teams: number }[]>`
    select count(*) filter (where a.status = 'present')::int as present, count(a.*)::int as total,
      count(distinct se.team_id)::int as teams
    from public.sessions se left join public.attendance a on a.session_id = se.id
    where se.date between ${from} and ${to}`;
  return r;
}

export async function getInvitations(tx: Tx) {
  return tx<{
    id: string;
    email: string;
    role: "admin" | "leader";
    team_id: string | null;
    team_name: string | null;
    accepted_at: string | null;
    profile_id: string | null;
    is_active: boolean | null;
    last_seen_at: string | null;
    full_name: string | null;
  }[]>`
    select i.id, i.email, i.role, i.team_id, t.name as team_name, i.accepted_at::text,
      p.id as profile_id, p.is_active, p.last_seen_at::text, p.full_name
    from public.invitations i
    left join public.teams t on t.id = i.team_id
    left join public.profiles p on p.email = i.email
    order by i.role, t.name nulls first, i.email`;
}

export async function getTeamTypeStats(tx: Tx, teamId: string) {
  return tx<{ name: string; sessions: number; present: number; total: number }[]>`
    select at.name, count(distinct se.id)::int as sessions,
      count(a.*) filter (where a.status = 'present')::int as present, count(a.*)::int as total
    from public.sessions se
    join public.session_activity_types sat on sat.session_id = se.id
    join public.activity_types at on at.id = sat.activity_type_id
    left join public.attendance a on a.session_id = se.id
    where se.team_id = ${teamId} and se.status = 'held'
    group by at.name, at.sort_order order by at.sort_order`;
}
