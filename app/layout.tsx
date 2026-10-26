import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import { site } from "@/lib/site.config";
import { hexToRgbTriplet } from "@/lib/color";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: `${site.brand.tagline} · ${site.brand.name}`,
  description:
    "Portal do cliente para escritórios de contabilidade: envio de documentos, prazos fiscais e acompanhamento mensal.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const vars = {
    "--brand": hexToRgbTriplet(site.brand.primary),
    "--brand-dark": hexToRgbTriplet(site.brand.primaryDark),
  } as CSSProperties;

  return (
    <html lang="pt-BR">
      <body style={vars} className="min-h-screen antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
