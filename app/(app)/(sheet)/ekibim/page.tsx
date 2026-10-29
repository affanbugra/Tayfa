import { redirect } from "next/navigation";
import { TeamSheetPage } from "@/components/team-sheet-page";
import { requireViewer } from "@/lib/auth";

export default async function MyTeamPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.role === "admin") {
    const { ekip } = await searchParams;
    redirect(ekip ? `/yonetim/ekipler/${ekip}` : "/yonetim");
  }
  if (!viewer.teamId) redirect("/erisim-yok");
  return <TeamSheetPage viewer={viewer} teamId={viewer.teamId} />;
}
