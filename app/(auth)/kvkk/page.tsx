import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

// Herkese açık (Google giriş ekranındaki gizlilik politikası bağlantısı buraya gelir).
// Metin belediyeden gelecek (CLAUDE.md §10, §13 #4).
export default function KvkkPage() {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-lg font-semibold text-text">{tr.kvkkLink}</h1>
      <p className="text-sm text-text">{tr.kvkk.placeholder}</p>
      <p className="text-sm text-text-muted">{tr.kvkk.contact}</p>
      <Link href="/giris" className="inline-block text-sm text-brand-strong hover:underline">{tr.kvkk.back}</Link>
    </div>
  );
}
