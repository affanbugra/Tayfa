import { TeamsGrid } from "@/components/teams-grid";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, formatDateTr, todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getTeamsOverview, getWeekTotals } from "@/lib/data/admin";
import { tr } from "@/lib/i18n/tr";

export default async function OverviewPage() {
  const viewer = await requireAdmin();
  const today = todayIstanbul();
  const ws = weekStartOf(today);
  const { teams, thisWeek, lastWeek, atRisk, activeStudents } = await asUser(viewer.userId, async (tx) => {
    const [teams, thisWeek, lastWeek] = await Promise.all([
      getTeamsOverview(tx, ws),
      getWeekTotals(tx, ws, addDaysIso(ws, 6)),
      getWeekTotals(tx, addDaysIso(ws, -7), addDaysIso(ws, -1)),
    ]);
    const [c] = await tx<{ at_risk: number; active: number }[]>`
      select count(*) filter (where status = 'at_risk')::int as at_risk, count(*) filter (where status <> 'removed')::int as active
      from public.students s join public.teams t on t.id = s.team_id where t.is_active`;
    return { teams, thisWeek, lastWeek, atRisk: c.at_risk, activeStudents: c.active };
  });

  const rate = thisWeek.total ? thisWeek.present / thisWeek.total : null;
  const prevRate = lastWeek.total ? lastWeek.present / lastWeek.total : null;
  const delta = rate !== null && prevRate !== null ? Math.round((rate - prevRate) * 100) : null;
  // Gün biliniyorsa o gün geçmiş olmalı; bilinmiyorsa hafta sonu bittiyse (pazar ya da sonrası) "girilmedi" sayılır.
  const sunday = addDaysIso(ws, 1);
  const overdue = (day: string | null) => (day === "saturday" ? today > ws : today > sunday);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-semibold text-text">{tr.sheet.tabSummary}</h1>
        <p className="text-sm text-text-muted">{formatDateTr(ws)} haftası</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={tr.admin.kpiActive} value={String(activeStudents)} />
        <Kpi
          label={tr.admin.kpiWeekRate}
          value={rate === null ? tr.common.none : `%${Math.round(rate * 100)}`}
          sub={delta === null ? undefined : `${delta >= 0 ? "+" : "−"}${Math.abs(delta)} puan ${tr.admin.vsLastWeek}`}
        />
        <Kpi label={tr.admin.kpiTeamsEntered} value={`${thisWeek.teams}/${teams.length}`} />
        <Kpi label={tr.admin.kpiAtRisk} value={String(atRisk)} />
      </div>

      <TeamsGrid
        rows={teams.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.leader_email ?? t.invited_email ?? "",
          signedIn: Boolean(t.leader_email),
          day: t.meeting_day ?? "",
          gender: t.gender ?? "",
          active: t.active_students,
          rate: t.recent_total ? t.recent_present / t.recent_total : null,
          atRisk: t.at_risk,
          week: t.this_week ? "entered" : overdue(t.meeting_day) ? "notEntered" : "waiting",
        }))}
      />
      <p className="text-xs text-text-muted">{tr.sheet.summaryHint}</p>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold tabular-nums text-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
