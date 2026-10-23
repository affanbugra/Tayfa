import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";

export default async function Home() {
  const viewer = await requireViewer();
  redirect(viewer.role === "admin" ? "/yonetim" : "/ekibim");
}

// Oturuma bağlı: asla statik üretilmez.
export const dynamic = "force-dynamic";
