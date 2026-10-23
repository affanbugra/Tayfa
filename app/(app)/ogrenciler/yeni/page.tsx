import { StudentForm } from "@/components/student-form";
import { Card, PageTitle } from "@/components/ui/card";
import { asUser } from "@/lib/db";
import { getSchools, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";
import { resolveTeam } from "@/lib/team-context";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const { viewer, teamId, withTeam } = await resolveTeam(searchParams);
  const { team, schools } = await asUser(viewer.userId, async (tx) => ({ team: await getTeam(tx, teamId), schools: await getSchools(tx) }));
  return (
    <div>
      <PageTitle sub={team?.name}>{tr.students.newTitle}</PageTitle>
      <Card>
        <StudentForm teamId={teamId} schools={schools} cancelHref={withTeam("/ogrenciler")} />
      </Card>
    </div>
  );
}
