"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { FormState } from "./attendance";

const uuid = z.string().uuid();
const optUuid = z.string().transform((s) => s || null).refine((s) => s === null || uuid.safeParse(s).success);

export async function inviteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"), role: z.enum(["admin", "leader"]), teamId: optUuid })
    .safeParse({ email: formData.get("email"), role: formData.get("role"), teamId: formData.get("teamId") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bilgiler geçersiz" };
  const v = parsed.data;
  if (v.role === "leader" && !v.teamId) return { error: "Lider için ekip seçin" };
  try {
    await asUser(viewer.userId, async (tx) => {
      await tx`
        insert into public.invitations (email, role, team_id, invited_by) values (${v.email}, ${v.role}, ${v.role === "leader" ? v.teamId : null}, ${viewer.userId})
        on conflict (email) do update set role = excluded.role, team_id = excluded.team_id`;
      // Kişi daha önce giriş yaptıysa rolü ve ekibi hemen güncellenir.
      const [p] = await tx<{ id: string }[]>`update public.profiles set role = ${v.role} where email = ${v.email} returning id`;
      if (p && v.role === "leader" && v.teamId) {
        await tx`update public.teams set leader_id = null where leader_id = ${p.id} and id <> ${v.teamId}`;
        await tx`update public.teams set leader_id = ${p.id} where id = ${v.teamId}`;
      }
    });
  } catch {
    return { error: "Kaydedilemedi. Bu ekibin başka bir lideri olabilir." };
  }
  revalidatePath("/yonetim", "layout");
  return { ok: true };
}

export async function deleteInvitation(formData: FormData) {
  const viewer = await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  await asUser(viewer.userId, (tx) => tx`delete from public.invitations where id = ${id}`);
  revalidatePath("/yonetim/kullanicilar");
}

export async function setProfileActive(formData: FormData) {
  const viewer = await requireAdmin();
  const v = z.object({ id: uuid, active: z.enum(["true", "false"]) }).parse({ id: formData.get("id"), active: formData.get("active") });
  if (v.id === viewer.userId) return;
  await asUser(viewer.userId, (tx) => tx`update public.profiles set is_active = ${v.active === "true"} where id = ${v.id}`);
  revalidatePath("/yonetim/kullanicilar");
}

export async function updateTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({
      teamId: uuid,
      name: z.string().trim().min(2).max(120),
      leader_name: z.string().trim().max(120).transform((s) => s || null),
      grade: z.coerce.number().pipe(z.union([z.literal(10), z.literal(11)])),
      gender: z.enum(["K", "E", ""]).transform((s) => s || null),
      meeting_day: z.enum(["saturday", "sunday", ""]).transform((s) => s || null),
      is_active: z.enum(["true", "false"]).transform((s) => s === "true"),
    })
    .safeParse(Object.fromEntries(["teamId", "name", "leader_name", "grade", "gender", "meeting_day", "is_active"].map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  const { teamId, ...data } = parsed.data;
  try {
    await asUser(viewer.userId, (tx) => tx`update public.teams set ${tx(data)} where id = ${teamId}`);
  } catch {
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({ name: z.string().trim().min(2).max(120), grade: z.coerce.number().pipe(z.union([z.literal(10), z.literal(11)])) })
    .safeParse({ name: formData.get("name"), grade: formData.get("grade") });
  if (!parsed.success) return { error: "Ad ve sınıf gerekli" };
  await asUser(viewer.userId, (tx) => tx`insert into public.teams (name, leader_name, grade) values (${parsed.data.name}, ${parsed.data.name}, ${parsed.data.grade})`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveActivityType(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({
      id: optUuid,
      name: z.string().trim().min(2).max(60),
      sort_order: z.coerce.number().int().min(0).max(10000),
      in_rotation: z.string().transform((s) => s === "on"),
      is_active: z.string().transform((s) => s === "on"),
      default_capacity: z.string().transform((s) => (s === "" ? null : Number(s))).refine((n) => n === null || (Number.isInteger(n) && n >= 0 && n <= 50)),
    })
    .safeParse(Object.fromEntries(["id", "name", "sort_order", "in_rotation", "is_active", "default_capacity"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  const { id, ...data } = parsed.data;
  try {
    await asUser(viewer.userId, (tx) => (id ? tx`update public.activity_types set ${tx(data)} where id = ${id}` : tx`insert into public.activity_types ${tx(data)}`));
  } catch {
    return { error: "Kaydedilemedi (aynı adda tür olabilir)" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renameSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z.object({ id: uuid, name: z.string().trim().min(2).max(200) }).safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  try {
    await asUser(viewer.userId, (tx) => tx`update public.schools set name = ${parsed.data.name} where id = ${parsed.data.id}`);
  } catch {
    return { error: "Bu adda bir okul zaten var; birleştirmeyi kullanın" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function mergeSchools(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z.object({ from: uuid, into: uuid }).safeParse({ from: formData.get("from"), into: formData.get("into") });
  if (!parsed.success || parsed.data.from === parsed.data.into) return { error: "İki farklı okul seçin" };
  const { from, into } = parsed.data;
  await asUser(viewer.userId, async (tx) => {
    await tx`update public.students set school_id = ${into} where school_id = ${from}`;
    await tx`delete from public.schools where id = ${from}`;
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const name = z.string().trim().min(2).max(200).safeParse(formData.get("name"));
  if (!name.success) return { error: "Okul adı gerekli" };
  try {
    await asUser(viewer.userId, (tx) => tx`insert into public.schools (name) values (${name.data})`);
  } catch {
    return { error: "Bu okul zaten var" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
