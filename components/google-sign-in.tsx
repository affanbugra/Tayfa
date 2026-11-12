"use client";

// Google'ın kendi "Google ile oturum aç" düğmesi (Google Identity Services, redirect modu).
// Google ekranında "tayfa-yoklama.vercel.app'e devam et" yazar; dönüş /auth/google'a POST edilir.
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Gis = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleSignIn({ clientId }: { clientId: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const google = (window as unknown as { google?: Gis }).google;
    if (!ready || !google || !box.current) return;
    const el = box.current;
    void (async () => {
      // Tek kullanımlık nonce: ham hali çerezde (sunucu Supabase'e verir), özeti Google'a gider.
      const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
      document.cookie = `g_nonce=${raw}; Path=/auth/google; Max-Age=600; SameSite=None; Secure`;
      google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "redirect",
        login_uri: `${window.location.origin}/auth/google`,
        nonce: await sha256Hex(raw),
        auto_select: false,
        itp_support: true,
      });
      google.accounts.id.renderButton(el, {
        type: "standard",
        theme: "filled_blue",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "tr",
        width: Math.min(400, el.offsetWidth),
      });
    })();
  }, [ready, clientId]);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={box} className="flex min-h-11 w-full justify-center" />
    </>
  );
}
