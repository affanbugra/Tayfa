import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Google'ın "Google ile oturum aç" düğmesi (redirect modu) kimlik jetonunu buraya POST eder.
// Google ekranında bizim alan adımız görünür (supabase.co değil). Jeton Supabase'e verilir, oturum açılır.
export async function POST(request: NextRequest) {
  const fail = () => NextResponse.redirect(new URL("/giris?hata=1", request.url), 303);
  const form = await request.formData();
  const credential = form.get("credential");
  const csrf = form.get("g_csrf_token");
  // Google'ın çift gönderim CSRF koruması: gövdedeki değer çerezdekiyle aynı olmalı.
  if (typeof credential !== "string" || typeof csrf !== "string" || csrf !== request.cookies.get("g_csrf_token")?.value) return fail();

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce: request.cookies.get("g_nonce")?.value,
  });
  if (error) return fail();
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.delete("g_nonce");
  return res;
}
