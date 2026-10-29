import { notFound } from "next/navigation";
import { TeamSheet } from "@/components/team-sheet";
import { TeamStats, type TeamStatsData } from "@/components/team-stats";
import type { Viewer } from "@/lib/auth";
import { addDaysIso, formatDateShort, todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getActivityTypes, getPlanForWeek, getTeam } from "@/lib/data/queries";
import { getTeamSheet, type TeamSheet as Sheet } from "@/lib/data/sheet";
import { getProgramWeekRates } from "@/lib/data/stats";
import { tr } from "@/lib/i18n/tr";

/** Lider ve yönetici için aynı ekip tablosu (CLAUDE.md §6.2). */
export async function TeamSheetPage({ viewer, teamId }: { viewer: Viewer; teamId: string }) {
  const today = todayIstanbul();
  const data = await asUser(viewer.userId, async (tx) => {
    const team = await getTeam(tx, teamId);
    if (!team) return null;
    const [sheet, types, plan, program] = await Promise.all([
      getTeamSheet(tx, teamId),
      getActivityTypes(tx),
      getPlanForWeek(tx, teamId, weekStartOf(today)),
      getProgramWeekRates(tx),
    ]);
    return { team, sheet, types, plan, program };
  });
  if (!data) notFound();
  const { team, sheet, types, plan, program } = data;
  const active = sheet.students.filter((s) => s.status !== "removed").length;
  // Yeni buluşmanın varsayılan tarihi: hafta sonuysa bugün, değilse ekibin geçen buluşma günü.
  const ws = weekStartOf(today);
  const weekend = today === ws || today === addDaysIso(ws, 1);
  const defaultDate = weekend ? today : team.meeting_day === "sunday" ? addDaysIso(ws, 1) : ws;

  const stats = teamStats(sheet, program, today);

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
      <TeamStats data={stats} />
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

/** Tablodaki işaretlerden ekip istatistikleri; program ortalaması sadece toplam sayılardan. */
function teamStats(sheet: Sheet, program: { week_start: string; present: number; total: number }[], today: string): TeamStatsData {
  const held = sheet.sessions.filter((se) => se.status === "held");
  const perSession = held.map((se) => {
    let present = 0;
    let total = 0;
    for (const st of sheet.students) {
      const m = sheet.marks[`${st.id}:${se.id}`];
      if (!m) continue;
      total++;
      if (m.status === "present") present++;
    }
    return { se, present, total };
  });
  const since = (days: number) => addDaysIso(today, -days);
  const sum = (rows: { present: number; total: number }[]) => rows.reduce((a, r) => ({ present: a.present + r.present, total: a.total + r.total }), { present: 0, total: 0 });
  const ratio = (r: { present: number; total: number }) => (r.total ? r.present / r.total : null);
  const last4 = sum(perSession.filter((r) => r.se.date > since(28)));
  const prev4 = sum(perSession.filter((r) => r.se.date > since(56) && r.se.date <= since(28)));
  const program4 = sum(program.filter((w) => w.week_start > since(34)));
  const absences = new Map<string, number>();
  for (const r of perSession)
    for (const st of sheet.students) if (sheet.marks[`${st.id}:${r.se.id}`]?.status === "absent") absences.set(st.id, (absences.get(st.id) ?? 0) + 1);
  const current = sheet.students.filter((st) => st.status !== "removed");
  const lastMarked = [...perSession].reverse().find((r) => r.total > 0);
  return {
    last: lastMarked ? { label: formatDateShort(lastMarked.se.date), present: lastMarked.present, total: lastMarked.total } : null,
    last4: ratio(last4),
    prev4: ratio(prev4),
    program4: ratio(program4),
    active: current.length,
    held: held.length,
    watch: current.filter((st) => st.status === "at_risk" || (absences.get(st.id) ?? 0) >= 3).length,
    columns: perSession.slice(-12).map((r) => ({
      label: formatDateShort(r.se.date),
      sub: r.se.types.join(", ") || "—",
      value: ratio(r),
      detail: `${r.present}/${r.total}`,
    })),
  };
}
