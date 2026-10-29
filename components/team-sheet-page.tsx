import { notFound } from "next/navigation";
import { TeamSheet } from "@/components/team-sheet";
import type { Viewer } from "@/lib/auth";
import { addDaysIso, todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getActivityTypes, getPlanForWeek, getTeam } from "@/lib/data/queries";
import { getTeamSheet } from "@/lib/data/sheet";
import { tr } from "@/lib/i18n/tr";

/** Lider ve yönetici için aynı ekip tablosu (CLAUDE.md §6.2). */
export async function TeamSheetPage({ viewer, teamId }: { viewer: Viewer; teamId: string }) {
  const today = todayIstanbul();
  const data = await asUser(viewer.userId, async (tx) => {
    const team = await getTeam(tx, teamId);
    if (!team) return null;
    const [sheet, types, plan] = await Promise.all([getTeamSheet(tx, teamId), getActivityTypes(tx), getPlanForWeek(tx, teamId, weekStartOf(today))]);
    return { team, sheet, types, plan };
  });
  if (!data) notFound();
  const { team, sheet, types, plan } = data;
  const active = sheet.students.filter((s) => s.status !== "removed").length;
  // Yeni buluşmanın varsayılan tarihi: hafta sonuysa bugün, değilse ekibin geçen buluşma günü.
  const ws = weekStartOf(today);
  const weekend = today === ws || today === addDaysIso(ws, 1);
  const defaultDate = weekend ? today : team.meeting_day === "sunday" ? addDaysIso(ws, 1) : ws;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3 md:px-6">
        <h1 className="font-display text-lg font-semibold text-text md:text-xl">{team.name}</h1>
        <p className="text-sm text-text-muted">
          {[team.meeting_day ? tr.days[team.meeting_day] : null, `${active} ${tr.sheet.students.toLowerCase()}`].filter(Boolean).join(" · ")}
          {team.schools.length > 0 && <span className="hidden md:inline"> · {team.schools.slice(0, 2).join(", ")}</span>}
        </p>
        {plan.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-text">
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-text">{tr.team.thisWeek}</span>
            {plan.map((p) => p.name).join(", ")}
          </p>
        )}
      </div>
      <TeamSheet
        teamId={team.id}
        students={sheet.students}
        sessions={sheet.sessions}
        marks={sheet.marks}
        types={types.map((t) => ({ id: t.id, name: t.name }))}
        today={today}
        defaultDate={defaultDate}
        defaultTypeIds={plan.map((p) => p.activity_type_id)}
        teamQuery={viewer.role === "admin" ? `?ekip=${team.id}` : ""}
        exportHref={`/api/export/team/${team.id}`}
      />
    </div>
  );
}
