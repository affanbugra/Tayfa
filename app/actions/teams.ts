"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { FormState } from "./attendance";

export async function updateTeamBasics(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = z
    .object({
      teamId: z.string().uuid(),
      meeting_day: z.enum(["saturday", "sunday", ""]).transform((s) => s || null),
      gender: z.enum(["K", "E", ""]).transform((s) => s || null),
    })
    .safeParse({ teamId: formData.get("teamId"), meeting_day: formData.get("meeting_day") ?? "", gender: formData.get("gender") ?? "" });
  if (!parsed.success) return { error: "Bilgiler geçersiz" };
  const v = parsed.data;
  try {
    await asUser(viewer.userId, (tx) => tx`update public.teams set meeting_day = ${v.meeting_day}, gender = ${v.gender} where id = ${v.teamId}`);
  } catch {
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
