import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/nunito-sans";
import { tr } from "@/lib/i18n/tr";
import "./globals.css";

export const metadata: Metadata = {
  title: tr.appName,
  description: tr.appDescription,
  robots: { index: false, follow: false },
  icons: { icon: "/brand/tayfa-logo-square.png", apple: "/brand/tayfa-logo-square.png" },
};

export const viewport: Viewport = {
  themeColor: "#4BBACD",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
