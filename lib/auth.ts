// Oturum ve yetki. Kimliği Supabase Auth (Google) verir; profil ve rol veritabanındaki davet
// listesinden gelir. Davet listesinde olmayan kullanıcı "Erişiminiz yok" ekranını görür.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { asUser } from "./db";
import { createSupabaseServer, supabaseConfigured } from "./supabase/server";

export type Role = "admin" | "leader";

export type Viewer = {
  userId: string;
  email: string;
  fullName: string | null;
  role: Role;
  /** Liderin ekibi; yöneticide null */
  teamId: string | null;
};

export type SessionState = { status: "anon" } | { status: "no_access"; email: string } | { status: "ok"; viewer: Viewer };

/** Yerel geliştirme girişi: sadece development'ta ve DEV_AUTH=1 iken. Üretimde asla açılmaz. */
export function devAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "1";
}
export const DEV_AUTH_COOKIE = "tayfa_dev_user";

async function currentIdentity(): Promise<{ id: string; email: string; name: string | null } | null> {
  if (devAuthEnabled()) {
    const raw = (await cookies()).get(DEV_AUTH_COOKIE)?.value;
    if (!raw) return null;
    const [id, email] = raw.split("|");
    return id && email ? { id, email, name: null } : null;
  }
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  const meta = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
  return { id: data.user.id, email: data.user.email, name: meta?.full_name ?? meta?.name ?? null };
}

export const getSessionState = cache(async (): Promise<SessionState> => {
  const identity = await currentIdentity();
  if (!identity) return { status: "anon" };
  const row = await asUser(identity.id, async (tx) => {
    const [p] = await tx<{ id: string | null; email: string; full_name: string | null; role: Role; is_active: boolean }[]>`
      select * from public.accept_invitation(${identity.name})`;
    if (!p?.id || !p.is_active) return null;
    const [t] = await tx<{ id: string | null }[]>`select public.my_team_id() as id`;
    return { ...p, teamId: t?.id ?? null };
  });
  if (!row) return { status: "no_access", email: identity.email };
  return {
    status: "ok",
    viewer: { userId: identity.id, email: row.email, fullName: row.full_name, role: row.role, teamId: row.teamId },
  };
});

export async function requireViewer(): Promise<Viewer> {
  const state = await getSessionState();
  if (state.status === "anon") redirect("/giris");
  if (state.status === "no_access") redirect("/erisim-yok");
  return state.viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/ekibim");
  return viewer;
}

/** Bir ekip sayfasına erişim: lider kendi ekibine, yönetici herkese. RLS ayrıca kontrol eder. */
export async function requireTeamAccess(teamId: string | null | undefined): Promise<{ viewer: Viewer; teamId: string }> {
  const viewer = await requireViewer();
  if (viewer.role === "admin") {
    if (!teamId) redirect("/yonetim");
    return { viewer, teamId };
  }
  if (!viewer.teamId) redirect("/erisim-yok");
  return { viewer, teamId: viewer.teamId };
}
