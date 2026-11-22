import type { Metadata } from "next";
import { Catalogue } from "@/components/catalog/Catalogue";
import { visibleProducts } from "@/lib/server/products";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nos vins",
  description: "Vins naturels, bio et en biodynamie, bières artisanales, jus et sirops : toute la carte de La Cave Buissonnière, région par région.",
  alternates: { canonical: "/vins" },
};

export default async function VinsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [products, s, sp] = await Promise.all([visibleProducts(), getSettings(), searchParams]);
  return (
    <section>
      <div className="band">
        <div className="wrap">
          <h1>Nos vins &amp; bières</h1>
          <p className="muted" style={{ marginTop: 8 }}>Vins naturels, bio et en biodynamie, bières artisanales, jus et sirops : toute ma carte, région par région.</p>
          <div className="infos">
            <div><b>Commandez à l&apos;avance</b>J&apos;ai plus du double des cuvées que je peux emmener sur un marché : commandez ici, par e-mail ou par SMS, jusqu&apos;à {s.cutoffHour} h la veille du marché de votre choix.</div>
            <div><b>−{s.discountPercent} % dès {s.discountMinQty} bouteilles</b>D&apos;une même référence de vin, appliqué automatiquement dans le panier (hors bières, jus et eaux).</div>
            <div><b>Livraison et expédition</b>Livraison à domicile jusqu&apos;à {s.deliveryRadiusKm} km autour de Dompierre, expédition UPS sous 72 h au-delà.</div>
          </div>
          <Catalogue products={products} initialFilter={sp.type} />
        </div>
      </div>
    </section>
  );
}
