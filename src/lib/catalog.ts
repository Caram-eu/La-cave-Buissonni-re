/** Données produit envoyées au navigateur (jamais utilisées pour calculer un prix côté serveur). */
export type ProductView = {
  slug: string;
  kind: "PRODUIT" | "ACCESSOIRE" | "CARTE_CADEAU";
  name: string;
  category: string;
  color: string;
  domain: string;
  label: string;
  region: string;
  appellation: string;
  grapes: string;
  vintage: string;
  volumeCl: number;
  priceCents: number;
  noAddedSulfites: boolean;
  sugar: string | null;
  style: string | null;
  isBeer: boolean;
  bottleLabel: string | null;
  boxKind: string | null;
  tag: "NOUVEAUTE" | "BEST_SELLER" | null;
  discountEligible: boolean;
  available: boolean;
  photoUrl: string | null;
};

export const COLORS: Record<string, string> = {
  rouge: "#7a1f3d", blanc: "#d9b84a", rose: "#e5899e", bulles: "#a9c23f", doux: "#d99a2b", liqueur: "#4a1328",
  kriek: "#a3243f", ipa: "#d9a520", ambree: "#b5651d", blanche: "#e6d58a", pomme: "#e8c35a", cassis: "#3b1030",
  peche: "#ef9a7a", eau: "#8fc3dc", biere: "#d9a520", coffret: "#89ba13",
};

export const CATEGORIES: [string, string][] = [
  ["tous", "Tout"], ["rouge", "Rouges"], ["blanc", "Blancs"], ["bulles", "Bulles"], ["doux", "Moelleux et liquoreux"],
  ["liqueur", "Vins de liqueur et crèmes"], ["biere", "Bières"], ["sansalcool", "Jus, sirops et eaux"],
  ["coffret", "Coffrets et cartes cadeaux"], ["accessoire", "Accessoires"],
];

export const categoryLabel = (c: string) => (CATEGORIES.find((x) => x[0] === c) ?? ["", ""])[1];

export function volumeText(p: Pick<ProductView, "kind" | "boxKind" | "volumeCl">): string {
  if (p.kind !== "PRODUIT" || p.boxKind || !p.volumeCl) return "";
  if (p.volumeCl === 150) return "magnum 150 cl";
  if (p.volumeCl >= 100) return `${p.volumeCl / 100} l`.replace(".", ",");
  return `${p.volumeCl} cl`;
}

export const vintageText = (y: string) => (y === "NM" ? "non millésimé" : y);

export function tagText(tag: ProductView["tag"]): string {
  return tag === "BEST_SELLER" ? "★ Best-seller" : tag === "NOUVEAUTE" ? "Nouveauté" : "";
}

export const glassColor = (p: Pick<ProductView, "color">) => {
  const c = COLORS[p.color] ?? "#7a1f3d";
  return c === "#89ba13" ? "#7a1f3d" : c;
};
