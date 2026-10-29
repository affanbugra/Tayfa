import { LogOut } from "lucide-react";
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

// Tek satırlık üst bant; içerik tam genişlik. Çıkış küçük bir simge: liderler hesap değiştirmez.
export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-12 items-center gap-3 bg-brand pr-1 pl-3 md:h-14 md:gap-6 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={tr.appName}>
          <Image src="/brand/tayfa-logo-square.png" alt="" width={28} height={28} className="rounded md:size-8" />
          <span className={viewer.role === "admin" ? "hidden font-display text-lg font-semibold text-white md:inline" : "font-display text-base font-semibold text-white md:text-lg"}>
            {tr.appName}
          </span>
        </Link>
        {viewer.role === "admin" && (
          <div className="-my-1 min-w-0 flex-1 overflow-x-auto">
            <NavLinks items={adminNav} />
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm">
          <span className="hidden max-w-56 truncate font-medium text-text lg:inline">{viewer.fullName ?? viewer.email}</span>
          <form action={signOut}>
            <button type="submit" aria-label={tr.auth.signOut} title={tr.auth.signOut} className="flex size-10 items-center justify-center rounded-md text-text hover:bg-white/30">
              <LogOut size={18} aria-hidden />
            </button>
          </form>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
