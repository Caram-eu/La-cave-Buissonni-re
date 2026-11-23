import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { BackBar } from "@/components/layout/BackBar";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MarketTicker, type TickerItem } from "@/components/layout/MarketTicker";
import { formatHours, upcomingMarkets } from "@/lib/rules/markets";
import { loadMarkets } from "@/lib/server/markets";
import { SvgDefs } from "@/components/SvgDefs";
import { currentUser } from "@/lib/server/auth";
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

/** Les 8 prochains marchés des deux semaines à venir, pour le bandeau défilant. */
async function tickerItems(): Promise<TickerItem[]> {
  try {
    const { weekly, exceptions } = await loadMarkets();
    return upcomingMarkets(new Date(), weekly, exceptions, { days: 14, limit: 8, hideFinished: true }).map((o) => {
      const d = new Date(o.date + "T12:00:00Z");
      const day = d.toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
      return { key: o.key, day: day.charAt(0).toUpperCase() + day.slice(1), town: o.town, place: o.place, hours: formatHours(o.hours), special: o.special };
    });
  } catch (e) {
    console.error("Bandeau des marchés indisponible", e);
    return [];
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, ticker] = await Promise.all([getSettings(), currentUser().catch(() => null), tickerItems()]);
  return (
    <html lang="fr">
      <body>
        <a className="skip" href="#contenu">Aller au contenu</a>
        <SvgDefs />
        <CartProvider>
          {settings.bannerText ? <div className="banner">{settings.bannerText}</div> : null}
          <MarketTicker items={ticker} cutoffHour={settings.cutoffHour} />
          <Header firstName={user?.firstName} />
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
