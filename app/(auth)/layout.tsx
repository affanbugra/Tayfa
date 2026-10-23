import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-brand px-4 py-10">
      <Image src="/brand/tayfa-logo-square.png" alt="Tayfa" width={144} height={144} priority />
      <div className="w-full max-w-sm rounded-lg bg-bg p-6">{children}</div>
    </main>
  );
}

// Oturuma bağlı: asla statik üretilmez.
export const dynamic = "force-dynamic";
