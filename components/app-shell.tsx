import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { NavLinks, type NavItem } from "@/components/nav-links";
import type { Viewer } from "@/lib/auth";
import { tr } from "@/lib/i18n/tr";

const adminNav: NavItem[] = [
  { href: "/yonetim", label: tr.sheet.tabSummary },
  { href: "/yonetim/etkinlikler", label: tr.plan.navTitle },
  { href: "/yonetim/kullanicilar", label: tr.nav.users },
  { href: "/yonetim/ayarlar", label: tr.nav.settings },
];

// Tek üst bant; içerik tam genişlik. Lider doğrudan ekip tablosunu görür (CLAUDE.md §6).
export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-1 bg-brand px-4 py-1 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/tayfa-logo-square.png" alt="" width={32} height={32} className="rounded" />
          <span className="font-display text-base font-semibold text-white md:text-lg">{tr.appName}</span>
        </Link>
        {viewer.role === "admin" && <NavLinks items={adminNav} />}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden max-w-56 truncate font-medium text-text sm:inline">{viewer.fullName ?? viewer.email}</span>
          <form action={signOut}>
            <button type="submit" className="min-h-11 rounded-md px-2 font-medium text-text hover:bg-white/30">
              {tr.auth.signOut}
            </button>
          </form>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
