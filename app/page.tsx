import Image from "next/image";
import { tr } from "@/lib/i18n/tr";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-brand px-4">
      <Image src="/brand/tayfa-logo-square.png" alt="Tayfa" width={160} height={160} priority />
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-6 text-center">
        <h1 className="font-display text-xl font-semibold text-text">{tr.appName}</h1>
        <p className="mt-2 text-sm text-text-muted">{tr.setupInProgress}</p>
      </div>
    </main>
  );
}
