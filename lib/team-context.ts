import "server-only";
import { requireTeamAccess } from "./auth";

/** Lider sayfalarında hangi ekip: lider kendi ekibi, yönetici ?ekip= parametresi. */
export async function resolveTeam(searchParams: Promise<{ ekip?: string }>) {
  const { ekip } = await searchParams;
  const { viewer, teamId } = await requireTeamAccess(ekip);
  const q = viewer.role === "admin" ? `?ekip=${teamId}` : "";
  return { viewer, teamId, q, withTeam: (href: string) => `${href}${viewer.role === "admin" ? `${href.includes("?") ? "&" : "?"}ekip=${teamId}` : ""}` };
}
