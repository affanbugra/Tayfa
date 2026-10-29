// Ekip tablosu: Excel'deki sayfanın karşılığı. Öğrenciler × buluşmalar, tek sorgu turunda.
import "server-only";
import type { Tx } from "@/lib/db";
import type { AttendanceStatus, SessionStatus, StudentStatus } from "./queries";

export type SheetStudent = {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  school: string | null;
  class_label: string | null;
  status: StudentStatus;
};

export type SheetSession = {
  id: string;
  date: string;
  status: SessionStatus;
  note: string | null;
  typeIds: string[];
  types: string[];
};

export type SheetMark = { status: AttendanceStatus; note: string | null };

export type TeamSheet = {
  students: SheetStudent[];
  sessions: SheetSession[];
  /** `${studentId}:${sessionId}` → işaret */
  marks: Record<string, SheetMark>;
};

export async function getTeamSheet(tx: Tx, teamId: string): Promise<TeamSheet> {
  const [students, sessions, marks] = await Promise.all([
    tx<SheetStudent[]>`
      select s.id, s.full_name, s.phone, s.parent_phone, coalesce(sc.name, s.school_raw) as school, s.class_label, s.status
      from public.students s left join public.schools sc on sc.id = s.school_id
      where s.team_id = ${teamId}`,
    tx<SheetSession[]>`
      select se.id, se.date, se.status, se.note,
        coalesce(array_agg(at.id order by at.sort_order) filter (where at.id is not null), '{}') as "typeIds",
        coalesce(array_agg(at.name order by at.sort_order) filter (where at.id is not null), '{}') as types
      from public.sessions se
      left join public.session_activity_types sat on sat.session_id = se.id
      left join public.activity_types at on at.id = sat.activity_type_id
      where se.team_id = ${teamId}
      group by se.id order by se.date`,
    tx<{ student_id: string; session_id: string; status: AttendanceStatus; excuse_note: string | null }[]>`
      select a.student_id, a.session_id, a.status, a.excuse_note from public.attendance a
      join public.sessions se on se.id = a.session_id where se.team_id = ${teamId}`,
  ]);
  return {
    students: students.sort((a, b) => a.full_name.localeCompare(b.full_name, "tr")),
    sessions,
    marks: Object.fromEntries(marks.map((m) => [`${m.student_id}:${m.session_id}`, { status: m.status, note: m.excuse_note }])),
  };
}
