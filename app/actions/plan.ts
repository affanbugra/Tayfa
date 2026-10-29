"use server";

// Haftalık plan (CLAUDE.md §6.9-c). Plan kaydedilince her ekibin tablosunda o tarihte etkinliği
// hazır bir buluşma sütunu açılır; lider sadece yoklamayı işaretler (isterse değiştirir).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso } from "@/lib/dates";
import { asUser } from "@/lib/db";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type PlanResult = { ok: true; saved: number } | { ok: false; error: string };

export async function savePlan(input: {
  weekStart: string;
  entries: { teamId: string; typeId: string | null; date: string }[];
  capacity: Record<string, number>;
}): Promise<PlanResult> {
  const parsed = z
    .object({
      weekStart: isoDate,
      entries: z.array(z.object({ teamId: uuid, typeId: uuid.nullable(), date: isoDate })).max(200),
      capacity: z.record(uuid, z.number().int().min(0).max(50)),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bilgiler geçersiz" };
  const v = parsed.data;
  const sunday = addDaysIso(v.weekStart, 1);
  if (new Date(`${v.weekStart}T00:00:00Z`).getUTCDay() !== 6) return { ok: false, error: "Hafta cumartesiyle başlamalı" };
  if (v.entries.some((e) => e.date !== v.weekStart && e.date !== sunday)) return { ok: false, error: "Tarih o hafta sonunda olmalı" };

  try {
    const viewer = await requireAdmin();
    const saved = await asUser(viewer.userId, async (tx) => {
      let saved = 0;
      for (const e of v.entries) {
        const [prev] = await tx<{ activity_type_id: string }[]>`
          delete from public.plan_entries where week_start = ${v.weekStart} and team_id = ${e.teamId} returning activity_type_id`;
        // Ekibin o hafta sonundaki buluşması (cumartesi ya da pazar) ve yoklaması var mı
        const [se] = await tx<{ id: string; date: string; marked: number; types: string[] }[]>`
          select se.id, se.date,
            (select count(*)::int from public.attendance a where a.session_id = se.id) as marked,
            coalesce((select array_agg(activity_type_id) from public.session_activity_types where session_id = se.id), '{}') as types
          from public.sessions se where se.team_id = ${e.teamId} and se.date between ${v.weekStart} and ${sunday}
          order by se.date limit 1`;

        if (!e.typeId) {
          // Plandan çıkarıldı: plandan açılmış ve henüz işaretlenmemiş sütun da kalkar.
          if (prev && se && se.marked === 0 && se.types.length === 1 && se.types[0] === prev.activity_type_id) {
            await tx`delete from public.sessions where id = ${se.id}`;
          }
          continue;
        }

        await tx`
          insert into public.plan_entries (week_start, team_id, activity_type_id, planned_date, created_by)
          values (${v.weekStart}, ${e.teamId}, ${e.typeId}, ${e.date}, ${viewer.userId})`;
        saved++;

        if (!se) {
          const [row] = await tx<{ id: string }[]>`
            insert into public.sessions (team_id, date, status, created_by) values (${e.teamId}, ${e.date}, 'held', ${viewer.userId}) returning id`;
          await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${row.id}, ${e.typeId})`;
        } else if (se.marked === 0) {
          // Henüz yoklama yok: tarih ve etkinlik plana göre güncellenir.
          if (se.date !== e.date) await tx`update public.sessions set date = ${e.date} where id = ${se.id}`;
          await tx`delete from public.session_activity_types where session_id = ${se.id}`;
          await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${se.id}, ${e.typeId})`;
        } else if (se.types.length === 0) {
          // Yoklaması alınmış ama etkinliği boş buluşma: sadece tür eklenir, lider verisi bozulmaz.
          await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${se.id}, ${e.typeId})`;
        }
      }
      await tx`delete from public.activity_capacity where week_start = ${v.weekStart}`;
      for (const [typeId, max] of Object.entries(v.capacity)) {
        await tx`insert into public.activity_capacity (week_start, activity_type_id, max_teams) values (${v.weekStart}, ${typeId}, ${max})`;
      }
      return saved;
    });
    revalidatePath("/", "layout");
    return { ok: true, saved };
  } catch {
    return { ok: false, error: "Plan kaydedilemedi" };
  }
}
