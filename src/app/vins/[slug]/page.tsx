import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPicture } from "@/components/BottleArt";
import { BuyBox } from "@/components/catalog/BuyBox";
import { categoryLabel, tagText, vintageText, volumeText } from "@/lib/catalog";
import { formatEuros } from "@/lib/rules/pricing";
import { db } from "@/lib/server/db";
import { productBySlug, toView } from "@/lib/server/products";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await productBySlug((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  const bits = [p.domain, p.appellation, p.vintage && vintageText(p.vintage), volumeText(p)].filter(Boolean).join(", ");
  return {
    title: p.name,
    description: `${p.name}, ${bits}. ${p.label ? p.label + ". " : ""}${formatEuros(p.priceCents)} TTC chez La Cave Buissonnière, caviste ambulant en vins naturels.`,
    alternates: { canonical: `/vins/${p.slug}` },
    openGraph: { images: p.photoUrl ? [p.photoUrl] : undefined },
  };
}

export default async function FichePage({ params }: Props) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const [s, same] = await Promise.all([
    getSettings(),
    db.product.findMany({ where: { hidden: false, domain: p.domain, NOT: { slug: p.slug } }, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);
  const gift = p.kind === "CARTE_CADEAU";
  const rows = [
    ["Domaine", p.domain], ["Agriculture", p.label], ["Région", p.region], ["Appellation", p.appellation],
    ["Couleur ou type", p.style || ({ rouge: "Rouge", blanc: "Blanc" } as Record<string, string>)[p.category] || categoryLabel(p.category)],
    ["Cépages", p.grapes], ["Millésime", p.vintage === "NM" ? "Non millésimé" : p.vintage], ["Contenance", volumeText(p)],
    ["Sulfites", p.noAddedSulfites ? "Sans sulfites ajoutés" : ""], ["Sucres résiduels", p.sugar ? p.sugar + "/l" : ""],
    ["Disponibilité", p.available ? "Disponible" : "Indisponible"],
  ].filter((r) => r[1]);
  const site = process.env.SITE_URL || "";
  const jsonLd = gift
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${p.name}${p.vintage && p.vintage !== "NM" ? " " + p.vintage : ""}`,
        brand: { "@type": "Brand", name: p.domain },
        category: categoryLabel(p.category),
        description: [p.appellation, p.grapes, p.label].filter(Boolean).join(". "),
        image: p.photoUrl ? site + p.photoUrl : undefined,
        sku: p.slug,
        offers: {
          "@type": "Offer",
          price: (p.priceCents / 100).toFixed(2),
          priceCurrency: "EUR",
          availability: p.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${site}/vins/${p.slug}`,
          seller: { "@type": "Organization", name: "La Cave Buissonnière" },
        },
      };

  return (
    <section>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <div className="band">
        <div className="wrap">
          <nav className="crumbs" aria-label="Fil d'Ariane"><Link href="/vins">Nos vins</Link> › {p.region} › {p.domain}</nav>
          <div className="fiche">
            <div className="fiche-pic" id="fichePic">
              {p.tag && <span className={`tag${p.tag === "BEST_SELLER" ? " best" : ""}`}>{tagText(p.tag)}</span>}
              <ProductPicture p={p} />
            </div>
            <div>
              <h1>{p.name}</h1>
              <div className="dom">{p.domain}{p.label && <> <span className="lab">{p.label}</span></>}</div>
              <p className="muted" style={{ marginTop: 4 }}>{p.region}{p.appellation && " · " + p.appellation}</p>
              {gift ? (
                <>
                  <p style={{ marginTop: 14 }}>Le bénéficiaire choisit librement parmi les vins, les articles de cave et les prestations : dégustation à domicile, atelier découverte…</p>
                  <div className="bigprice">{s.giftCardAmounts.map((a) => `${a} €`).join(" · ")}</div>
                  <div className="okbox" style={{ marginTop: 14 }}>
                    <b>La carte cadeau s&apos;achète sur nos marchés.</b> Venez la choisir au stand : Guillaume vous la remet avec son code, utilisable ensuite sur le site ou au marché.
                  </div>
                </>
              ) : (
                <BuyBox p={p} rule={{ percent: s.discountPercent, minQty: s.discountMinQty }} />
              )}
              {!gift && rows.length > 0 && (
                <dl className="carac">
                  {rows.map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              )}
              <div className="infos" style={{ marginTop: gift ? 16 : 0 }}>
                <div><b>Retrait au marché</b>Commandez jusqu&apos;à {s.cutoffHour} h la veille, je vous l&apos;apporte au marché de votre choix.</div>
                <div><b>Un conseil ?</b>Accords mets et vins, garde : demandez-moi au marché ou au <a href={`tel:${s.contact.phoneIntl}`}>{s.contact.phone}</a>.</div>
              </div>
            </div>
          </div>
          {same.length > 0 && (
            <div className="related">
              <h2>Du même domaine</h2>
              <div className="grid">
                {same.map(toView).map((x) => (
                  <article className="prod" key={x.slug}>
                    <Link className="pic" href={`/vins/${x.slug}`} tabIndex={-1} aria-hidden="true"><ProductPicture p={x} /></Link>
                    <h3><Link className="plink" href={`/vins/${x.slug}`}>{x.name}</Link></h3>
                    <div className="meta">{x.appellation}{x.vintage && " · " + vintageText(x.vintage)}{volumeText(x) && " · " + volumeText(x)}</div>
                    <div className="buy"><span className="price">{formatEuros(x.priceCents)}</span><Link className="btn ghost" href={`/vins/${x.slug}`}>Voir</Link></div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
