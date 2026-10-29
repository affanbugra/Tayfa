import { notFound } from "next/navigation";
import { TeamSheetPage } from "@/components/team-sheet-page";
import { requireAdmin } from "@/lib/auth";

export default async function AdminTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireAdmin();
  return <TeamSheetPage viewer={viewer} teamId={id} />;
}
