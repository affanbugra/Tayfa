import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

/** Öğrenci sayfalarından ekip tablosuna dönüş. */
export function BackToSheet({ teamId, admin }: { teamId: string; admin: boolean }) {
  return (
    <Link href={admin ? `/yonetim/ekipler/${teamId}` : "/ekibim"} className="mb-2 inline-flex min-h-9 items-center gap-1 text-sm text-brand-strong hover:underline">
      <ChevronLeft size={16} aria-hidden />
      {tr.sheet.backToSheet}
    </Link>
  );
}

export function percent(rate: number | null): string {
  return rate === null ? "—" : `%${Math.round(rate * 100)}`;
}
