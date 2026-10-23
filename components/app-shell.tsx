import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { NavLinks, type NavItem } from "@/components/nav-links";
import type { Viewer } from "@/lib/auth";
import { tr } from "@/lib/i18n/tr";

const leaderNav: NavItem[] = [
  { href: "/ekibim", label: tr.nav.myTeam, icon: "home" },
  { href: "/yoklamalar", label: tr.nav.sessions, icon: "calendar" },
  { href: "/ogrenciler", label: tr.nav.students, icon: "users" },
];

const adminNav: NavItem[] = [
  { href: "/yonetim", label: tr.nav.overview, icon: "chart" },
  { href: "/yonetim/kullanicilar", label: tr.nav.users, icon: "users" },
  { href: "/yonetim/ayarlar", label: tr.nav.settings, icon: "settings" },
];

export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const items = viewer.role === "admin" ? adminNav : leaderNav;
  return (
    <div className="min-h-dvh bg-surface md:flex">
      {/* Masaüstü kenar çubuğu */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg md:flex">
        <Link href="/" className="flex items-center gap-3 bg-brand px-4 py-4">
          <Image src="/brand/tayfa-logo-square.png" alt="" width={32} height={32} className="rounded" />
          <span className="font-display text-lg font-semibold text-white">{tr.appName}</span>
        </Link>
        <nav className="flex-1 p-2">
          <NavLinks items={items} variant="side" />
        </nav>
        <UserBox viewer={viewer} />
      </aside>

      {/* Mobil üst bant */}
      <header className="flex items-center justify-between bg-brand px-4 py-2 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/tayfa-logo-square.png" alt="" width={28} height={28} className="rounded" />
          <span className="font-display text-base font-semibold text-white">{tr.appName}</span>
        </Link>
        <form action={signOut}>
          <button type="submit" className="min-h-11 px-2 text-sm font-medium text-white">
            {tr.auth.signOut}
          </button>
        </form>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-10">{children}</main>
        <footer className="hidden px-8 pb-6 text-xs text-text-muted md:block">
          <Link href="/kvkk" className="hover:underline">{tr.kvkkLink}</Link>
        </footer>
      </div>

      {/* Mobil alt menü */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks items={items} variant="bottom" />
      </nav>
    </div>
  );
}

function UserBox({ viewer }: { viewer: Viewer }) {
  return (
    <div className="border-t border-border p-4 text-sm">
      <p className="truncate font-medium text-text">{viewer.fullName ?? viewer.email}</p>
      <p className="truncate text-xs text-text-muted">{tr.admin.roles[viewer.role]}</p>
      <form action={signOut} className="mt-2">
        <button type="submit" className="text-sm text-brand-strong hover:underline">
          {tr.auth.signOut}
        </button>
      </form>
    </div>
  );
}
