import "server-only";
import type { Tx } from "@/lib/db";

export type MatrixCell = "present" | "absent" | "excused";

export async function getTeamMatrix(tx: Tx, teamId: string) {
  const sessions = await tx<{ id: string; date: string; status: string; types: string }[]>`
    select se.id, se.date, se.status,
      coalesce((select string_agg(at.name, ', ' order by at.sort_order) from public.session_activity_types sat
                join public.activity_types at on at.id = sat.activity_type_id where sat.session_id = se.id), '') as types
    from public.sessions se where se.team_id = ${teamId} order by se.date`;
  const cells = await tx<{ session_id: string; student_id: string; status: MatrixCell }[]>`
    select a.session_id, a.student_id, a.status from public.attendance a
    join public.sessions se on se.id = a.session_id where se.team_id = ${teamId}`;
  const map = new Map<string, MatrixCell>();
  for (const c of cells) map.set(`${c.student_id}:${c.session_id}`, c.status);
  return { sessions, cell: (studentId: string, sessionId: string) => map.get(`${studentId}:${sessionId}`) };
}
