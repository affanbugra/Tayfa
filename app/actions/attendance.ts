"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { addDaysIso, todayIstanbul } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { toTitleCaseTr } from "@/lib/import/normalize";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type MarkResult = { ok: true } | { ok: false; error: string };
export type SessionResult = { ok: true; id: string } | { ok: false; error: string };

/** Tabloya yeni buluşma sütunu açar ya da var olanı günceller. Sayfa değişmez. */
export async function saveSession(input: {
  sessionId?: string;
  teamId: string;
  date: string;
  status: "held" | "postponed" | "cancelled";
  typeIds: string[];
  note?: string;
}): Promise<SessionResult> {
  const parsed = z
    .object({
      sessionId: uuid.optional(),
      teamId: uuid,
      date: isoDate,
      status: z.enum(["held", "postponed", "cancelled"]),
      typeIds: z.array(uuid).max(10),
      note: z.string().max(1000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bilgiler geçersiz" };
  const v = parsed.data;
  // İleri tarih planlama için açık (en fazla 90 gün); yoklama günü gelince işaretlenir.
  if (v.date > addDaysIso(todayIstanbul(), 90)) return { ok: false, error: "En fazla 3 ay sonrası seçilebilir" };
  try {
    const viewer = await requireViewer();
    const id = await asUser(viewer.userId, async (tx) => {
      const note = v.note?.trim() || null;
      let id = v.sessionId;
      if (id) {
        await tx`update public.sessions set date = ${v.date}, status = ${v.status}, note = ${note} where id = ${id}`;
        await tx`delete from public.session_activity_types where session_id = ${id}`;
      } else {
        const [row] = await tx<{ id: string }[]>`
          insert into public.sessions (team_id, date, status, note, created_by)
          values (${v.teamId}, ${v.date}, ${v.status}, ${note}, ${viewer.userId}) returning id`;
        id = row.id;
      }
      for (const t of v.typeIds) {
        await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${id}, ${t})`;
      }
      return id;
    });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && /sessions_team_id_date_key/.test(e.message)) return { ok: false, error: "Bu tarihte ekibin zaten bir buluşması var" };
    return { ok: false, error: "Kaydedilemedi" };
  }
}

export async function removeSession(sessionId: string): Promise<MarkResult> {
  try {
    const viewer = await requireViewer();
    const id = uuid.parse(sessionId);
    await asUser(viewer.userId, (tx) => tx`delete from public.sessions where id = ${id}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Silinemedi" };
  }
}

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

export type FormState = { error?: string; ok?: boolean } | null;

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
