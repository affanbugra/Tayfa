import { PageTitle } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";

// Metin belediyeden gelecek (CLAUDE.md §10, §13 #4).
export default function KvkkPage() {
  return <PageTitle>{tr.kvkkLink}</PageTitle>;
}
