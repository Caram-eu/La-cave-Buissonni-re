import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { BackBar } from "@/components/layout/BackBar";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SvgDefs } from "@/components/SvgDefs";
import { getSettings } from "@/lib/server/settings";

const SITE = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "La Cave Buissonnière, caviste ambulant en vins naturels", template: "%s | La Cave Buissonnière" },
  description:
    "La Cave Buissonnière, caviste ambulant en vins naturels et bières artisanales sur les marchés de l'Allier, de la Saône-et-Loire et de la Nièvre.",
  openGraph: { siteName: "La Cave Buissonnière", locale: "fr_FR", type: "website", images: ["/video/poster.jpg"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light", themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="fr">
      <body>
        <a className="skip" href="#contenu">Aller au contenu</a>
        <SvgDefs />
        <CartProvider>
          {settings.bannerText ? <div className="banner">{settings.bannerText}</div> : null}
          <Header />
          <main id="contenu">
            <BackBar />
            {children}
          </main>
          <Footer contact={settings.contact} />
          <CookieNotice />
        </CartProvider>
      </body>
    </html>
  );
}
