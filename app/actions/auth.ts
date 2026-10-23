"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_AUTH_COOKIE, devAuthEnabled } from "@/lib/auth";
import { rawSql } from "@/lib/db";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  if (!supabaseConfigured()) redirect("/giris?hata=1");
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/giris?hata=1");
  redirect(data.url);
}

/** Sadece yerel geliştirme: e-postayla sahte oturum açar. */
export async function devSignIn(formData: FormData) {
  if (!devAuthEnabled()) redirect("/giris");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/giris");
  const sql = rawSql();
  const [existing] = await sql<{ id: string }[]>`select id from auth.users where lower(email) = ${email}`;
  const id = existing?.id ?? randomUUID();
  if (!existing) await sql`insert into auth.users (id, email) values (${id}, ${email})`;
  (await cookies()).set(DEV_AUTH_COOKIE, `${id}|${email}`, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function signOut() {
  if (devAuthEnabled()) {
    (await cookies()).delete(DEV_AUTH_COOKIE);
  } else if (supabaseConfigured()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/giris");
}
