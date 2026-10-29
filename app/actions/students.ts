"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireViewer } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { todayIstanbul } from "@/lib/dates";
import { normalizePhone, toTitleCaseTr } from "@/lib/import/normalize";
import { isValidTc } from "@/lib/import/tc";
import type { FormState } from "./attendance";

const uuid = z.string().uuid();
const opt = (max: number) => z.string().trim().max(max).transform((s) => s || null);

const studentSchema = z.object({
  full_name: z.string().trim().min(2, "Ad soyad gerekli").max(120),
  phone: opt(40),
  parent_phone: opt(40),
  tc_no: opt(20),
  birth_date: z.string().trim().transform((s) => s || null).refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), "Tarih geçersiz"),
  school_id: z.string().transform((s) => s || null).refine((s) => s === null || uuid.safeParse(s).success),
  class_label: opt(30),
  school_number: opt(30),
  notes: opt(2000),
});

function readStudent(formData: FormData) {
  return studentSchema.safeParse(Object.fromEntries(["full_name", "phone", "parent_phone", "tc_no", "birth_date", "school_id", "class_label", "school_number", "notes"].map((k) => [k, String(formData.get(k) ?? "")])));
}

function normalized(v: z.infer<typeof studentSchema>) {
  const phone = normalizePhone(v.phone);
  const parent = normalizePhone(v.parent_phone);
  const tc = v.tc_no ? v.tc_no.replace(/\D/g, "") || null : null;
  return {
    full_name: toTitleCaseTr(v.full_name) ?? v.full_name,
    phone: phone.value,
    phone_valid: phone.valid,
    parent_phone: parent.value,
    parent_phone_valid: parent.valid,
    tc_no: tc,
    tc_valid: isValidTc(tc),
    birth_date: v.birth_date,
    school_id: v.school_id,
    class_label: v.class_label,
    school_number: v.school_number,
    notes: v.notes,
  };
}

function teamParam(role: string, teamId: string) {
  return role === "admin" ? `?ekip=${teamId}` : "";
}

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const teamId = uuid.safeParse(formData.get("teamId"));
  const parsed = readStudent(formData);
  if (!teamId.success || !parsed.success) return { error: parsed.error?.issues[0]?.message ?? "Bilgiler geçersiz" };
  const data = normalized(parsed.data);
  let id: string;
  try {
    id = await asUser(viewer.userId, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into public.students ${tx({ ...data, team_id: teamId.data, source: "app", joined_at: todayIstanbul() })} returning id`;
      return row.id;
    });
  } catch {
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/", "layout");
  redirect(`/ogrenciler/${id}${teamParam(viewer.role, teamId.data)}`);
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const id = uuid.safeParse(formData.get("studentId"));
  const parsed = readStudent(formData);
  if (!id.success || !parsed.success) return { error: parsed.error?.issues[0]?.message ?? "Bilgiler geçersiz" };
  const data = normalized(parsed.data);
  let teamId: string | undefined;
  try {
    teamId = await asUser(viewer.userId, async (tx) => {
      const [row] = await tx<{ team_id: string }[]>`update public.students set ${tx(data)} where id = ${id.data} returning team_id`;
      return row?.team_id;
    });
  } catch {
    return { error: "Kaydedilemedi" };
  }
  if (!teamId) return { error: "Öğrenci bulunamadı" };
  revalidatePath("/", "layout");
  redirect(`/ogrenciler/${id.data}${teamParam(viewer.role, teamId)}`);
}

export async function changeStudentStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = z
    .object({ studentId: uuid, status: z.enum(["active", "at_risk", "removed"]), reason: z.string().trim().max(500) })
    .safeParse({ studentId: formData.get("studentId"), status: formData.get("status"), reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  const v = parsed.data;
  if (v.status === "removed" && !v.reason) return { error: "Çıkarıldı için gerekçe zorunlu" };
  try {
    await asUser(viewer.userId, (tx) => tx`update public.students set status = ${v.status}, status_reason = ${v.reason || null} where id = ${v.studentId}`);
  } catch {
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteStudent(formData: FormData) {
  const viewer = await requireAdmin();
  const id = uuid.parse(formData.get("studentId"));
  const teamId = await asUser(viewer.userId, async (tx) => {
    const [row] = await tx<{ team_id: string }[]>`delete from public.students where id = ${id} returning team_id`;
    return row?.team_id;
  });
  revalidatePath("/", "layout");
  redirect(teamId ? `/yonetim/ekipler/${teamId}` : "/yonetim");
}

export async function moveStudent(formData: FormData) {
  const viewer = await requireAdmin();
  const v = z.object({ studentId: uuid, teamId: uuid }).parse({ studentId: formData.get("studentId"), teamId: formData.get("teamId") });
  await asUser(viewer.userId, (tx) => tx`update public.students set team_id = ${v.teamId} where id = ${v.studentId}`);
  revalidatePath("/", "layout");
  redirect(`/ogrenciler/${v.studentId}?ekip=${v.teamId}`);
}
