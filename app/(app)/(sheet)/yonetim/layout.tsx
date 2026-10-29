import type { ReactNode } from "react";
import { SheetTabs } from "@/components/sheet-tabs";
import { requireAdmin } from "@/lib/auth";
import { asUser } from "@/lib/db";

// Yönetim: Excel'deki gibi altta sekmeler. "Özet" + her ekip.
export default async function AdminSheetLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAdmin();
  const teams = await asUser(viewer.userId, (tx) => tx<{ id: string; name: string }[]>`select id, name from public.teams where is_active`);
  teams.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <SheetTabs teams={teams} />
    </div>
  );
}
