import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

/** Yönetici bir ekibin lider ekranlarındayken ekip detayına dönüş. */
export function TeamBackLink({ teamId }: { teamId: string }) {
  return (
    <Link href={`/yonetim/ekipler/${teamId}`} className="mb-2 inline-flex min-h-9 items-center gap-1 text-sm text-brand-strong hover:underline">
      <ChevronLeft size={16} aria-hidden />
      {tr.admin.teamDetail}
    </Link>
  );
}

export function percent(rate: number | null): string {
  return rate === null ? "—" : `%${Math.round(rate * 100)}`;
}
