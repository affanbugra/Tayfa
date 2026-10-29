import { redirect } from "next/navigation";

// Öğrenci listesi artık ekip tablosunun içinde.
export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const { ekip } = await searchParams;
  redirect(ekip ? `/yonetim/ekipler/${ekip}` : "/ekibim");
}
