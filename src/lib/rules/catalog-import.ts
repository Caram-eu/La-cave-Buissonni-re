import { normalize } from "./text";

/**
 * Import de la carte des vins (CSV ou Excel).
 * Une ligne = une référence. Les colonnes peuvent être dans n'importe quel ordre ;
 * l'en-tête est reconnu sans tenir compte des accents ni des majuscules.
 */
export const COLUMNS = [
  { key: "domain", label: "Domaine", required: true, aliases: ["domaine", "producteur", "brasserie"] },
  { key: "name", label: "Cuvée", required: true, aliases: ["cuvee", "nom", "produit", "designation"] },
  { key: "category", label: "Catégorie", required: true, aliases: ["categorie", "type"] },
  { key: "color", label: "Couleur du dessin", aliases: ["couleur", "couleur du dessin", "teinte"] },
  { key: "label", label: "Agriculture", aliases: ["agriculture", "label", "bio"] },
  { key: "region", label: "Région", required: true, aliases: ["region"] },
  { key: "appellation", label: "Appellation", aliases: ["appellation", "aoc"] },
  { key: "grapes", label: "Cépages", aliases: ["cepages", "cepage", "assemblage"] },
  { key: "vintage", label: "Millésime", aliases: ["millesime", "annee", "millésime"] },
  { key: "volumeCl", label: "Contenance (cl)", aliases: ["contenance (cl)", "contenance", "volume", "cl"] },
  { key: "price", label: "Prix TTC", required: true, aliases: ["prix ttc", "prix", "tarif"] },
  { key: "noAddedSulfites", label: "Sans sulfites ajoutés", aliases: ["sans sulfites ajoutes", "sans sulfites", "ssa"] },
  { key: "sugar", label: "Sucres résiduels", aliases: ["sucres residuels", "sucres", "sucre"] },
  { key: "style", label: "Style", aliases: ["style"] },
  { key: "tag", label: "Pastille", aliases: ["pastille", "tag"] },
  { key: "available", label: "Disponible", aliases: ["disponible", "dispo", "disponibilite"] },
  { key: "slug", label: "Adresse (ne pas modifier)", aliases: ["adresse (ne pas modifier)", "adresse", "slug", "id"] },
] as const;

export type ColumnKey = (typeof COLUMNS)[number]["key"];

export const CATEGORY_ALIASES: Record<string, string> = {
  rouge: "rouge", rouges: "rouge", blanc: "blanc", blancs: "blanc", bulles: "bulles", petillant: "bulles", effervescent: "bulles",
  champagne: "bulles", "moelleux et liquoreux": "doux", moelleux: "doux", liquoreux: "doux", doux: "doux", "vins de liqueur et cremes": "liqueur",
  liqueur: "liqueur", "vin de liqueur": "liqueur", creme: "liqueur", biere: "biere", bieres: "biere", "jus, sirops et eaux": "sansalcool", jus: "sansalcool",
  sirop: "sansalcool", eau: "sansalcool", "sans alcool": "sansalcool", sansalcool: "sansalcool", coffret: "coffret", coffrets: "coffret", accessoire: "accessoire", accessoires: "accessoire",
};

const DRAWING_COLORS = ["rouge", "blanc", "rose", "bulles", "doux", "liqueur", "kriek", "ipa", "ambree", "blanche", "pomme", "cassis", "peche", "eau", "biere", "coffret"];

export function slugify(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join(" ")).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

const yes = (v: string) => ["oui", "o", "x", "1", "vrai", "true", "yes"].includes(normalize(v.trim()));
const no = (v: string) => ["non", "n", "0", "faux", "false", "no"].includes(normalize(v.trim()));

export type ImportedProduct = {
  slug: string; name: string; domain: string; category: string; color: string; label: string; region: string; appellation: string;
  grapes: string; vintage: string; volumeCl: number; priceCents: number; noAddedSulfites: boolean; sugar: string | null; style: string | null;
  tag: "NOUVEAUTE" | "BEST_SELLER" | null; available: boolean; isBeer: boolean; discountEligible: boolean;
  /** colonnes présentes dans le fichier : les autres gardent leur valeur actuelle lors d'une mise à jour */
  present: ColumnKey[];
};

export type ImportResult = { products: ImportedProduct[]; errors: { line: number; message: string }[]; missingColumns: string[] };

/** Prix « 13,56 », « 13.56 € », « 13,56 EUR » -> 1356 centimes */
export function parsePrice(v: string): number | null {
  const s = v.replace(/\s|€|eur/gi, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function mapCatalog(rows: string[][], noDiscountCategories: string[]): ImportResult {
  const errors: ImportResult["errors"] = [];
  if (!rows.length) return { products: [], errors: [{ line: 1, message: "Le fichier est vide." }], missingColumns: [] };
  const header = rows[0].map((h) => normalize(h.trim()));
  const index = new Map<ColumnKey, number>();
  for (const col of COLUMNS) {
    const i = header.findIndex((h) => h === normalize(col.label) || (col.aliases as readonly string[]).map(normalize).includes(h));
    if (i >= 0) index.set(col.key, i);
  }
  const missingColumns = COLUMNS.filter((c) => "required" in c && c.required && !index.has(c.key)).map((c) => c.label);
  if (missingColumns.length) return { products: [], errors: [], missingColumns };
  const present = [...index.keys()];
  const products: ImportedProduct[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, n) => {
    const line = n + 2;
    const get = (k: ColumnKey) => (index.has(k) ? (r[index.get(k)!] ?? "").trim() : "");
    if (r.every((c) => !c.trim())) return;
    const name = get("name"), domain = get("domain"), region = get("region");
    if (!name || !domain || !region) return errors.push({ line, message: "Cuvée, domaine et région sont obligatoires." });
    const cat = CATEGORY_ALIASES[normalize(get("category"))];
    if (!cat) return errors.push({ line, message: `Catégorie inconnue : « ${get("category")} » (rouge, blanc, bulles, moelleux, liqueur, bière, jus, coffret, accessoire).` });
    const priceCents = parsePrice(get("price"));
    if (priceCents === null || priceCents <= 0) return errors.push({ line, message: `Prix illisible : « ${get("price")} ».` });
    const vintageRaw = get("vintage");
    const vintage = !vintageRaw || /^(nm|non millesime)$/i.test(normalize(vintageRaw)) ? (vintageRaw ? "NM" : "") : vintageRaw;
    if (vintage && vintage !== "NM" && !/^(19|20)\d\d$/.test(vintage)) return errors.push({ line, message: `Millésime illisible : « ${vintageRaw} » (ex. 2023 ou NM).` });
    const vol = get("volumeCl");
    const volumeCl = vol ? Number(vol.replace(",", ".").replace(/cl/i, "")) : 75;
    if (!Number.isFinite(volumeCl) || volumeCl < 0 || volumeCl > 2000) return errors.push({ line, message: `Contenance illisible : « ${vol} » (en cl, ex. 75).` });
    const colorRaw = normalize(get("color"));
    const color = DRAWING_COLORS.includes(colorRaw) ? colorRaw : cat === "biere" ? "ipa" : cat === "sansalcool" ? "pomme" : ["rouge", "blanc", "bulles", "doux", "liqueur", "coffret"].includes(cat) ? cat : "coffret";
    const tagRaw = normalize(get("tag"));
    const tag = tagRaw.startsWith("best") ? "BEST_SELLER" : tagRaw.startsWith("nouv") ? "NOUVEAUTE" : null;
    const dispo = get("available");
    const slug = get("slug") || slugify(domain, name, vintage || "");
    if (seen.has(slug)) return errors.push({ line, message: `Référence en double : ${domain}, ${name} ${vintage}.` });
    seen.add(slug);
    products.push({
      slug, name, domain, category: cat, color, label: get("label"), region, appellation: get("appellation"), grapes: get("grapes"), vintage,
      volumeCl: Math.round(volumeCl), priceCents, noAddedSulfites: yes(get("noAddedSulfites")), sugar: get("sugar") || null, style: get("style") || null,
      tag, available: dispo ? !no(dispo) : true, isBeer: cat === "biere", discountEligible: !noDiscountCategories.includes(cat), present,
    });
  });
  return { products, errors, missingColumns };
}

/** Ligne d'export de la carte, dans l'ordre des colonnes d'import (aller-retour avec Excel). */
export function exportRow(p: {
  slug: string; name: string; domain: string; category: string; color: string; label: string; region: string; appellation: string; grapes: string;
  vintage: string; volumeCl: number; priceCents: number; noAddedSulfites: boolean; sugar: string | null; style: string | null; tag: string | null; available: boolean;
}): (string | number)[] {
  return [
    p.domain, p.name, p.category, p.color, p.label, p.region, p.appellation, p.grapes, p.vintage, p.volumeCl,
    (p.priceCents / 100).toFixed(2).replace(".", ","), p.noAddedSulfites ? "oui" : "", p.sugar ?? "", p.style ?? "",
    p.tag === "BEST_SELLER" ? "Best-seller" : p.tag === "NOUVEAUTE" ? "Nouveauté" : "", p.available ? "oui" : "non", p.slug,
  ];
}
export const EXPORT_HEADER = COLUMNS.map((c) => c.label);
