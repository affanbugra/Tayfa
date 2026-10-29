import { RateBars, RateLineChart, SplitBar } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { TeamsGrid } from "@/components/teams-grid";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, formatDateShort, formatDateTr, todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getTeamsOverview } from "@/lib/data/admin";
import { countFrequentAbsentees, getProgramTrend, getTypeRates } from "@/lib/data/stats";
import { tr } from "@/lib/i18n/tr";

const rate = (p: number, t: number) => (t ? p / t : null);

export default async function OverviewPage() {
  const viewer = await requireAdmin();
  const today = todayIstanbul();
  const ws = weekStartOf(today);
  const { teams, trend, types, atRisk, activeStudents, absentees } = await asUser(viewer.userId, async (tx) => {
    const [teams, trend, types, absentees] = await Promise.all([getTeamsOverview(tx, ws), getProgramTrend(tx), getTypeRates(tx), countFrequentAbsentees(tx)]);
    const [c] = await tx<{ at_risk: number; active: number }[]>`
      select count(*) filter (where status = 'at_risk')::int as at_risk, count(*) filter (where status <> 'removed')::int as active
      from public.students s join public.teams t on t.id = s.team_id where t.is_active`;
    return { teams, trend, types, atRisk: c.at_risk, activeStudents: c.active, absentees };
  });

  const byWeek = new Map(trend.map((w) => [w.week_start, w]));
  const thisWeek = byWeek.get(ws);
  const lastWeek = byWeek.get(addDaysIso(ws, -7));
  const weekRate = (w?: (typeof trend)[number]) => (w ? rate(w.present, w.present + w.absent + w.excused) : null);
  const nowRate = weekRate(thisWeek);
  const prevRate = weekRate(lastWeek);
  // Bu hafta henüz yoklama yoksa kart geçen haftayı gösterir.
  const shownRate = nowRate ?? prevRate;
  const delta = nowRate !== null && prevRate !== null ? Math.round((nowRate - prevRate) * 100) : null;
  const recent = trend.slice(-12);

  const sunday = addDaysIso(ws, 1);
  const overdue = (day: string | null) => (day === "saturday" ? today > ws : today > sunday);
  const totals = teams.reduce((a, t) => ({ p: a.p + t.recent_present, t: a.t + t.recent_total }), { p: 0, t: 0 });
  const average = rate(totals.p, totals.t);
  const typeTotals = types.reduce((a, t) => ({ p: a.p + t.present, t: a.t + t.total }), { p: 0, t: 0 });
  const split = thisWeek ?? lastWeek;
  // Erkek / kız ekipleri ayrı çizgi. Hiçbir ekibin cinsiyeti girilmemişse tek çizgi: tüm ekipler.
  const missingGender = teams.filter((t) => !t.gender).length;
  const hasGender = trend.some((w) => w.byGender.E.total + w.byGender.K.total > 0);
  const genderSeries = hasGender
    ? [
        { name: tr.sheet.boys, color: "var(--chart-1)", values: trend.map((w) => rate(w.byGender.E.present, w.byGender.E.total)) },
        { name: tr.sheet.girls, color: "var(--chart-2)", values: trend.map((w) => rate(w.byGender.K.present, w.byGender.K.total)) },
      ]
    : [{ name: tr.sheet.allTeams, color: "var(--chart-1)", values: trend.map((w) => weekRate(w)) }];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-semibold text-text">{tr.sheet.tabSummary}</h1>
        <p className="text-sm text-text-muted">{formatDateTr(ws)} haftası</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tr.admin.kpiActive} value={activeStudents} sub={`${teams.length} ekip`} />
        <StatTile
          label={nowRate === null ? `${tr.admin.kpiWeekRate} (geçen hafta)` : tr.admin.kpiWeekRate}
          value={shownRate === null ? tr.common.none : `%${Math.round(shownRate * 100)}`}
          delta={delta}
          deltaLabel={tr.admin.vsLastWeek}
          trend={recent.map((w) => weekRate(w))}
        />
        <StatTile
          label={tr.admin.kpiTeamsEntered}
          value={
            <>
              {thisWeek?.teams ?? 0}
              <span className="text-lg font-medium text-text-muted">/{teams.length}</span>
            </>
          }
          sub={lastWeek ? `Geçen hafta ${lastWeek.teams}/${teams.length}` : undefined}
          trend={recent.map((w) => w.teams)}
        />
        <StatTile label={tr.sheet.watch} value={atRisk + absentees} sub={`${atRisk} sınırda · ${absentees} kişi 3+ kez gelmedi`} tone={atRisk + absentees > 0 ? "warn" : undefined} />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <section className="rounded-lg border border-border bg-bg p-4 lg:col-span-3">
          <h2 className="text-sm font-semibold text-text">{tr.sheet.weeklyTrend}</h2>
          <p className="mb-3 text-xs text-text-muted">{tr.sheet.weeklyTrendSub}</p>
          {missingGender > 0 && (
            <p className="mb-2 text-xs text-text-muted">{tr.sheet.genderMissing(missingGender, !hasGender)}</p>
          )}
          {trend.length ? (
            <RateLineChart
              caption={tr.sheet.weeklyTrend}
              labels={trend.map((w) => formatDateShort(w.week_start))}
              series={genderSeries}
            />
          ) : (
            <p className="text-sm text-text-muted">{tr.common.none}</p>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold text-text">
              {tr.sheet.thisWeekSplit}
              {!thisWeek && lastWeek && <span className="font-normal text-text-muted"> (geçen hafta)</span>}
            </h3>
            <SplitBar
              caption={tr.sheet.thisWeekSplit}
              parts={[
                { label: tr.attendance.present, value: split?.present ?? 0, color: "var(--present)" },
                { label: tr.attendance.excused, value: split?.excused ?? 0, color: "var(--excused)" },
                { label: tr.attendance.absent, value: split?.absent ?? 0, color: "var(--absent)" },
              ]}
            />
          </div>
        </section>
        <section className="rounded-lg border border-border bg-bg p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text">{tr.sheet.typeCompare}</h2>
          <p className="mb-3 text-xs text-text-muted">{tr.sheet.typeCompareSub}</p>
          <RateBars
            caption={tr.sheet.typeCompare}
            rows={types
              .map((t) => ({ label: t.name, value: rate(t.present, t.total), detail: `${t.sessions} buluşma · ${t.present}/${t.total}` }))
              .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))}
            average={rate(typeTotals.p, typeTotals.t)}
            averageLabel={tr.sheet.programAvg}
          />
        </section>
      </div>

      <TeamsGrid
        average={average}
        rows={teams.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.leader_email ?? t.invited_email ?? "",
          signedIn: Boolean(t.leader_email),
          day: t.meeting_day ?? "",
          gender: t.gender ?? "",
          active: t.active_students,
          rate: t.recent_total ? t.recent_present / t.recent_total : null,
          weekly: t.weekly,
          atRisk: t.at_risk,
          lastSession: t.last_session ? formatDateShort(t.last_session) : tr.common.none,
          week: t.this_week ? "entered" : overdue(t.meeting_day) ? "notEntered" : "waiting",
        }))}
      />
      <p className="text-xs text-text-muted">{tr.sheet.summaryHint}</p>
    </div>
  );
}
