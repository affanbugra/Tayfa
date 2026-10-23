"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { todayIstanbul } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { toTitleCaseTr } from "@/lib/import/normalize";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function teamParam(role: string, teamId: string) {
  return role === "admin" ? `?ekip=${teamId}` : "";
}

export async function createSession(formData: FormData) {
  const viewer = await requireViewer();
  const input = z
    .object({ teamId: uuid, date: isoDate, typeIds: z.array(uuid) })
    .parse({ teamId: formData.get("teamId"), date: formData.get("date"), typeIds: formData.getAll("typeIds") });
  if (input.date > todayIstanbul()) throw new Error("İleri tarih seçilemez");

  const id = await asUser(viewer.userId, async (tx) => {
    const [existing] = await tx<{ id: string }[]>`select id from public.sessions where team_id = ${input.teamId} and date = ${input.date}`;
    if (existing) return existing.id;
    const [row] = await tx<{ id: string }[]>`
      insert into public.sessions (team_id, date, created_by) values (${input.teamId}, ${input.date}, ${viewer.userId}) returning id`;
    for (const t of input.typeIds) {
      await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${row.id}, ${t})`;
    }
    return row.id;
  });
  revalidatePath("/", "layout");
  redirect(`/yoklama/${id}${teamParam(viewer.role, input.teamId)}`);
}

export type MarkResult = { ok: true } | { ok: false; error: string };

export async function setAttendance(input: {
  sessionId: string;
  studentId: string;
  status: "present" | "absent" | "excused" | null;
  excuseNote?: string | null;
}): Promise<MarkResult> {
  try {
    const viewer = await requireViewer();
    const v = z
      .object({
        sessionId: uuid,
        studentId: uuid,
        status: z.enum(["present", "absent", "excused"]).nullable(),
        excuseNote: z.string().max(500).nullish(),
      })
      .parse(input);
    await asUser(viewer.userId, async (tx) => {
      if (v.status === null) {
        await tx`delete from public.attendance where session_id = ${v.sessionId} and student_id = ${v.studentId}`;
        return;
      }
      const note = v.status === "excused" ? v.excuseNote?.trim() || null : null;
      await tx`
        insert into public.attendance (session_id, student_id, status, excuse_note, updated_by)
        values (${v.sessionId}, ${v.studentId}, ${v.status}, ${note}, ${viewer.userId})
        on conflict (session_id, student_id) do update
          set status = excluded.status, excuse_note = excluded.excuse_note, updated_by = excluded.updated_by`;
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Kaydedilemedi" };
  }
}

export async function markAllPresent(sessionId: string, studentIds: string[]): Promise<MarkResult> {
  try {
    const viewer = await requireViewer();
    const v = z.object({ sessionId: uuid, studentIds: z.array(uuid) }).parse({ sessionId, studentIds });
    await asUser(viewer.userId, async (tx) => {
      for (const sid of v.studentIds) {
        await tx`
          insert into public.attendance (session_id, student_id, status, updated_by)
          values (${v.sessionId}, ${sid}, 'present', ${viewer.userId})
          on conflict (session_id, student_id) do nothing`;
      }
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Kaydedilemedi" };
  }
}

export type FormState = { error?: string; ok?: boolean } | null;

export async function updateSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = z
    .object({
      sessionId: uuid,
      date: isoDate,
      status: z.enum(["held", "postponed", "cancelled"]),
      note: z.string().max(1000),
      typeIds: z.array(uuid),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      date: formData.get("date"),
      status: formData.get("status"),
      note: formData.get("note") ?? "",
      typeIds: formData.getAll("typeIds"),
    });
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  const v = parsed.data;
  if (v.date > todayIstanbul()) return { error: "İleri tarih seçilemez" };
  try {
    await asUser(viewer.userId, async (tx) => {
      await tx`update public.sessions set date = ${v.date}, status = ${v.status}, note = ${v.note.trim() || null} where id = ${v.sessionId}`;
      await tx`delete from public.session_activity_types where session_id = ${v.sessionId}`;
      for (const t of v.typeIds) {
        await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${v.sessionId}, ${t})`;
      }
    });
  } catch (e) {
    if (e instanceof Error && /sessions_team_id_date_key/.test(e.message)) return { error: "Bu tarihte ekibin başka bir buluşması var" };
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSession(formData: FormData) {
  const viewer = await requireViewer();
  const sessionId = uuid.parse(formData.get("sessionId"));
  const teamId = await asUser(viewer.userId, async (tx) => {
    const [row] = await tx<{ team_id: string }[]>`delete from public.sessions where id = ${sessionId} returning team_id`;
    return row?.team_id;
  });
  revalidatePath("/", "layout");
  redirect(`/yoklamalar${teamId ? teamParam(viewer.role, teamId) : ""}`);
}

export async function quickAddStudent(teamId: string, fullName: string): Promise<{ ok: true; id: string; fullName: string } | { ok: false; error: string }> {
  try {
    const viewer = await requireViewer();
    const v = z.object({ teamId: uuid, fullName: z.string().trim().min(2).max(120) }).parse({ teamId, fullName });
    v.fullName = toTitleCaseTr(v.fullName) ?? v.fullName;
    const id = await asUser(viewer.userId, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into public.students (team_id, full_name, source, joined_at) values (${v.teamId}, ${v.fullName}, 'app', ${todayIstanbul()})
        returning id`;
      return row.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, id, fullName: v.fullName };
  } catch {
    return { ok: false, error: "Öğrenci eklenemedi" };
  }
}
