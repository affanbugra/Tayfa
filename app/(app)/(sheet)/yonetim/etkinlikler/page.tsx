import { ActivityPlanner } from "@/components/activity-planner";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getMatrix, getWeekPlan } from "@/lib/data/matching";
import { tr } from "@/lib/i18n/tr";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ hafta?: string }> }) {
  const viewer = await requireAdmin();
  const today = todayIstanbul();
  const { hafta } = await searchParams;
  // Varsayılan: hafta sonundaysak bu hafta, değilse önümüzdeki hafta sonu.
  const ws = weekStartOf(today);
  const upcoming = today === ws || today === addDaysIso(ws, 1) ? ws : addDaysIso(ws, 7);
  const weekStart = hafta && /^\d{4}-\d{2}-\d{2}$/.test(hafta) ? weekStartOf(hafta) : upcoming;

  const { matrix, plan } = await asUser(viewer.userId, async (tx) => {
    const [matrix, plan] = await Promise.all([getMatrix(tx, today), getWeekPlan(tx, weekStart)]);
    return { matrix, plan };
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 md:px-6">
      <h1 className="font-display text-xl font-semibold text-text">{tr.plan.navTitle}</h1>
      <ActivityPlanner matrix={matrix} weekStart={weekStart} plan={plan} />
    </div>
  );
}
