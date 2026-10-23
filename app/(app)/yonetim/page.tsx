import Link from "next/link";
import { TeamsTable } from "@/components/teams-table";
import { Card, PageTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, formatDateShort, formatDateTr, todayIstanbul, weekStartOf } from "@/lib/dates";
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
  // Gün biliniyorsa o gün geçmiş olmalı; bilinmiyorsa hafta sonu bittiyse (pazar ya da sonrası) listelenir.
  const sunday = addDaysIso(ws, 1);
  const missing = teams.filter((t) => !t.this_week && (t.meeting_day === "saturday" ? today > ws : today > sunday));

  return (
    <div className="space-y-6">
      <PageTitle sub={`${formatDateTr(ws)} haftası`}>{tr.admin.overviewTitle}</PageTitle>

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

      <Card title={`${tr.admin.missingTitle} (${missing.length})`}>
        {missing.length === 0 ? (
          <p className="text-sm text-text-muted">{tr.admin.missingEmpty}</p>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {missing.map((t) => (
              <li key={t.id} className="flex min-h-10 items-center justify-between gap-3 border-b border-border text-sm last:border-0">
                <Link href={`/yonetim/ekipler/${t.id}`} className="text-text hover:text-brand-strong hover:underline">{t.name}</Link>
                <span className="text-text-muted">{t.meeting_day ? tr.days[t.meeting_day] : tr.unknown}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-text">{tr.admin.teamsTitle}</h2>
        <TeamsTable
          rows={teams.map((t) => ({
            id: t.id,
            name: t.name,
            leader: t.leader_name ?? "",
            grade: t.grade,
            day: t.meeting_day,
            active: t.active_students,
            rate: t.recent_total ? t.recent_present / t.recent_total : null,
            weekly: t.weekly,
            atRisk: t.at_risk,
            lastSession: t.last_session,
            lastSessionLabel: t.last_session ? formatDateShort(t.last_session) : tr.common.none,
          }))}
        />
      </section>
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
