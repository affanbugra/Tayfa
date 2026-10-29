import Link from "next/link";
import type { ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

// Form ve detay sayfaları: ortalanmış, okunaklı genişlik.
export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-4 pb-10 md:px-8 md:pt-8">
      {children}
      <footer className="mt-10 text-xs text-text-muted">
        <Link href="/kvkk" className="hover:underline">{tr.kvkkLink}</Link>
      </footer>
    </div>
  );
}
