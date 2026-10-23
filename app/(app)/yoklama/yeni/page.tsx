import { createSession } from "@/app/actions/attendance";
import { TypeChips } from "@/components/type-chips";
import { Button } from "@/components/ui/button";
import { Card, Field, PageTitle, inputClass } from "@/components/ui/card";
import { todayIstanbul, weekStartOf } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getActivityTypes, getPlanForWeek, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";
import { resolveTeam } from "@/lib/team-context";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const { viewer, teamId } = await resolveTeam(searchParams);
  const today = todayIstanbul();
  const { team, types, plan } = await asUser(viewer.userId, async (tx) => ({
    team: await getTeam(tx, teamId),
    types: await getActivityTypes(tx),
    plan: await getPlanForWeek(tx, teamId, weekStartOf(today)),
  }));
  const plannedDate = plan[0]?.planned_date && plan[0].planned_date <= today ? plan[0].planned_date : today;

  return (
    <div className="space-y-4">
      <PageTitle sub={team?.name}>{tr.session.newTitle}</PageTitle>
      <Card>
        <form action={createSession} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />
          <Field label={tr.session.date}>
            <input type="date" name="date" required max={today} defaultValue={plannedDate} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-text">{tr.session.types}</legend>
            <p className="mb-2 text-xs text-text-muted">{tr.session.typesHint}</p>
            <TypeChips types={types} selected={plan.map((p) => p.activity_type_id)} />
          </fieldset>
          <Button type="submit" className="min-h-12 w-full">{tr.session.start}</Button>
        </form>
      </Card>
    </div>
  );
}
