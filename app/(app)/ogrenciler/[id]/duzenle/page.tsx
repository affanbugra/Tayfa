import { notFound, redirect } from "next/navigation";
import { StudentForm } from "@/components/student-form";
import { Card, PageTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { getSchools, getStudent } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireViewer();
  const { student, schools } = await asUser(viewer.userId, async (tx) => ({ student: await getStudent(tx, id), schools: await getSchools(tx) }));
  if (!student) notFound();
  if (viewer.role === "leader" && viewer.teamId !== student.team_id) redirect("/ogrenciler");
  const q = viewer.role === "admin" ? `?ekip=${student.team_id}` : "";
  return (
    <div>
      <PageTitle sub={student.full_name}>{tr.students.editTitle}</PageTitle>
      <Card>
        <StudentForm teamId={student.team_id} values={student} schools={schools} cancelHref={`/ogrenciler/${student.id}${q}`} />
      </Card>
    </div>
  );
}
