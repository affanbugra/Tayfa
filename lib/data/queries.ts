// Sunucu tarafı sorgular. Hepsi asUser içinden çağrılır; yetkiyi RLS uygular.
import "server-only";
import type { Tx } from "@/lib/db";

import type { StudentStatus } from "@/lib/students";
export type { StudentStatus };
export type AttendanceStatus = "present" | "absent" | "excused";
export type SessionStatus = "held" | "postponed" | "cancelled";

export type TeamInfo = {
  id: string;
  name: string;
  leader_name: string | null;
  leader_email: string | null;
  grade: 10 | 11;
  gender: "K" | "E" | null;
  meeting_day: "saturday" | "sunday" | null;
  is_active: boolean;
  schools: string[];
};

export async function getTeam(tx: Tx, teamId: string): Promise<TeamInfo | null> {
  const [t] = await tx<TeamInfo[]>`
    select t.id, t.name, t.leader_name, p.email as leader_email, t.grade, t.gender, t.meeting_day, t.is_active,
      coalesce((select array_agg(distinct sc.name order by sc.name) from public.students s
                join public.schools sc on sc.id = s.school_id
                where s.team_id = t.id and s.status in ('active', 'at_risk')), '{}') as schools
    from public.teams t left join public.profiles p on p.id = t.leader_id
    where t.id = ${teamId}`;
  return t ?? null;
}

export type ActivityType = { id: string; name: string; color: string; in_rotation: boolean; is_active: boolean; sort_order: number; default_capacity: number | null };

export async function getActivityTypes(tx: Tx, includeInactive = false): Promise<ActivityType[]> {
  return tx<ActivityType[]>`
    select id, name, color, in_rotation, is_active, sort_order, default_capacity from public.activity_types
    where ${includeInactive} or is_active order by sort_order, name`;
}

export type StudentRow = {
  id: string;
  full_name: string;
  status: StudentStatus;
  status_reason: string | null;
  school_name: string | null;
  school_raw: string | null;
  class_label: string | null;
  present: number;
  absent: number;
  excused: number;
};

/** Ekip öğrencileri ve dönem boyu (sadece gerçekleşen buluşmalar) yoklama sayıları. */
export async function getStudents(tx: Tx, teamId: string): Promise<StudentRow[]> {
  const rows = await tx<StudentRow[]>`
    select s.id, s.full_name, s.status, s.status_reason, sc.name as school_name, s.school_raw, s.class_label,
      count(*) filter (where a.status = 'present')::int as present,
      count(*) filter (where a.status = 'absent')::int as absent,
      count(*) filter (where a.status = 'excused')::int as excused
    from public.students s
    left join public.schools sc on sc.id = s.school_id
    left join public.attendance a on a.student_id = s.id
      and exists (select 1 from public.sessions se where se.id = a.session_id and se.status = 'held')
    where s.team_id = ${teamId}
    group by s.id, sc.name`;
  return rows.sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"));
}

export function attendanceRate(r: { present: number; absent: number; excused: number }): number | null {
  const total = r.present + r.absent + r.excused;
  return total === 0 ? null : r.present / total;
}

export type SessionSummary = {
  id: string;
  date: string;
  status: SessionStatus;
  note: string | null;
  types: string[];
  present: number;
  absent: number;
  excused: number;
};

export async function getSessions(tx: Tx, teamId: string): Promise<SessionSummary[]> {
  return tx<SessionSummary[]>`
    select se.id, se.date, se.status, se.note,
      coalesce((select array_agg(at.name order by at.sort_order) from public.session_activity_types sat
                join public.activity_types at on at.id = sat.activity_type_id where sat.session_id = se.id), '{}') as types,
      count(*) filter (where a.status = 'present')::int as present,
      count(*) filter (where a.status = 'absent')::int as absent,
      count(*) filter (where a.status = 'excused')::int as excused
    from public.sessions se left join public.attendance a on a.session_id = se.id
    where se.team_id = ${teamId}
    group by se.id order by se.date desc`;
}

export type SessionDetail = {
  id: string;
  team_id: string;
  date: string;
  status: SessionStatus;
  note: string | null;
  typeIds: string[];
  marks: Record<string, { status: AttendanceStatus; excuse_note: string | null }>;
};

export async function getSession(tx: Tx, sessionId: string): Promise<SessionDetail | null> {
  const [se] = await tx<{ id: string; team_id: string; date: string; status: SessionStatus; note: string | null }[]>`
    select id, team_id, date, status, note from public.sessions where id = ${sessionId}`;
  if (!se) return null;
  const types = await tx<{ activity_type_id: string }[]>`
    select activity_type_id from public.session_activity_types where session_id = ${sessionId}`;
  const marks = await tx<{ student_id: string; status: AttendanceStatus; excuse_note: string | null }[]>`
    select student_id, status, excuse_note from public.attendance where session_id = ${sessionId}`;
  return {
    ...se,
    typeIds: types.map((t) => t.activity_type_id),
    marks: Object.fromEntries(marks.map((m) => [m.student_id, { status: m.status, excuse_note: m.excuse_note }])),
  };
}

export type PlanEntry = { activity_type_id: string; name: string; planned_date: string | null; week_start: string };

export async function getPlanForWeek(tx: Tx, teamId: string, weekStart: string): Promise<PlanEntry[]> {
  return tx<PlanEntry[]>`
    select pe.activity_type_id, at.name, pe.planned_date, pe.week_start
    from public.plan_entries pe join public.activity_types at on at.id = pe.activity_type_id
    where pe.team_id = ${teamId} and pe.week_start = ${weekStart} order by at.sort_order`;
}

export type StudentDetail = {
  id: string;
  team_id: string;
  team_name: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  school_id: string | null;
  school_name: string | null;
  school_raw: string | null;
  class_label: string | null;
  tc_no: string | null;
  tc_valid: boolean;
  birth_date: string | null;
  school_number: string | null;
  status: StudentStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  joined_at: string | null;
  source: string;
  notes: string | null;
};

export async function getStudent(tx: Tx, studentId: string): Promise<StudentDetail | null> {
  const [s] = await tx<StudentDetail[]>`
    select s.id, s.team_id, t.name as team_name, s.full_name, s.phone, s.parent_phone, s.school_id, sc.name as school_name,
      s.school_raw, s.class_label, s.tc_no, s.tc_valid, s.birth_date, s.school_number, s.status, s.status_reason,
      s.status_changed_at::text, s.joined_at, s.source, s.notes
    from public.students s join public.teams t on t.id = s.team_id left join public.schools sc on sc.id = s.school_id
    where s.id = ${studentId}`;
  return s ?? null;
}

export type StudentHistoryRow = { session_id: string; date: string; session_status: SessionStatus; status: AttendanceStatus | null; excuse_note: string | null; types: string[] };

export async function getStudentHistory(tx: Tx, studentId: string, teamId: string): Promise<StudentHistoryRow[]> {
  return tx<StudentHistoryRow[]>`
    select se.id as session_id, se.date, se.status as session_status, a.status, a.excuse_note,
      coalesce((select array_agg(at.name order by at.sort_order) from public.session_activity_types sat
                join public.activity_types at on at.id = sat.activity_type_id where sat.session_id = se.id), '{}') as types
    from public.sessions se left join public.attendance a on a.session_id = se.id and a.student_id = ${studentId}
    where se.team_id = ${teamId} order by se.date desc`;
}

export async function getSchools(tx: Tx): Promise<{ id: string; name: string; students: number }[]> {
  const rows = await tx<{ id: string; name: string; students: number }[]>`
    select sc.id, sc.name, count(s.id)::int as students from public.schools sc
    left join public.students s on s.school_id = sc.id group by sc.id`;
  return rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
