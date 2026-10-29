"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/yonetim" ? pathname === "/yonetim" || pathname.startsWith("/yonetim/ekipler") : pathname.startsWith(href);
  return (
    <nav className="flex items-center gap-0.5 md:gap-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center border-b-2 px-2 text-[13px] font-medium whitespace-nowrap text-text md:text-sm",
              active ? "border-accent font-semibold" : "border-transparent hover:border-white/60",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
