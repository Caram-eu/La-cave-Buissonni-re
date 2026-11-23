import { describe, expect, it } from "vitest";
import produits from "../../donnees/produits.json";
import { parseCsv, toCsv } from "@/lib/csv";
import { EXPORT_HEADER, exportRow, mapCatalog, parsePrice, slugify } from "@/lib/rules/catalog-import";
import { allowedNext, canMove, giftCardEffect } from "@/lib/rules/orders";
import { NO_DISCOUNT_CATEGORIES } from "@/lib/settings-defaults";

describe("fichiers CSV pour Excel", () => {
  it("échappe les points-virgules, guillemets et retours à la ligne, et relit à l'identique", () => {
    const rows = [["Domaine", "Cuvée"], ['Domaine "Les Cailloux"', "Rouge; vieilles vignes"], ["Ligne\navec retour", "é à ç"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("détecte la virgule comme séparateur", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("ignore les lignes vides", () => {
    expect(parseCsv("a;b\n;\n1;2\n\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("import de la carte", () => {
  it("relit exactement la carte exportée (aller-retour avec Excel)", () => {
    const raw = produits as { id: string; n: string; cat: string; c: string; d: string; lab: string; r: string; app: string; g: string; y: string; v: number; p: number; ssa?: number; su?: string; st?: string; tag?: string }[];
    const rows = [EXPORT_HEADER, ...raw.map((p) => exportRow({
      slug: p.id, name: p.n, domain: p.d, category: p.cat, color: p.c, label: p.lab, region: p.r, appellation: p.app, grapes: p.g, vintage: p.y,
      volumeCl: p.v, priceCents: Math.round(p.p * 100), noAddedSulfites: !!p.ssa, sugar: p.su ?? null, style: p.st ?? null,
      tag: p.tag === "Best-seller" ? "BEST_SELLER" : p.tag === "Nouveauté" ? "NOUVEAUTE" : null, available: true,
    }).map(String))];
    const r = mapCatalog(parseCsv(toCsv(rows)), NO_DISCOUNT_CATEGORIES);
    expect(r.errors).toEqual([]);
    expect(r.products).toHaveLength(164);
    const colin = r.products.find((p) => p.slug === "domaine-colin-vieilles-vignes-blanc-2023")!;
    expect(colin).toMatchObject({ priceCents: 1356, vintage: "2023", volumeCl: 75, discountEligible: true });
    const biere = r.products.find((p) => p.category === "biere")!;
    expect(biere.discountEligible).toBe(false);
    expect(r.products.filter((p) => p.tag === "BEST_SELLER")).toHaveLength(3);
  });
  it("accepte une carte saisie à la main, colonnes dans le désordre", () => {
    const r = mapCatalog(
      [["Prix", "Cuvée", "Domaine", "Région", "Catégorie", "Millésime"], ["12,50 €", "Gamay d'Auvergne", "Domaine Test", "Côtes d'Auvergne", "Rouges", "2025"]],
      NO_DISCOUNT_CATEGORIES,
    );
    expect(r.errors).toEqual([]);
    expect(r.products[0]).toMatchObject({ slug: "domaine-test-gamay-d-auvergne-2025", priceCents: 1250, category: "rouge", color: "rouge", volumeCl: 75, available: true });
  });
  it("signale les colonnes obligatoires manquantes", () => {
    expect(mapCatalog([["Cuvée", "Prix"]], []).missingColumns).toEqual(["Domaine", "Catégorie", "Région"]);
  });
  it("signale les lignes illisibles avec leur numéro, sans bloquer les autres", () => {
    const r = mapCatalog(
      [["Domaine", "Cuvée", "Catégorie", "Région", "Prix", "Millésime"], ["A", "Bonne", "blanc", "Loire", "10", "2024"], ["B", "Prix faux", "blanc", "Loire", "dix euros", ""], ["C", "Catégorie", "whisky", "Loire", "10", ""], ["A", "Bonne", "blanc", "Loire", "10", "2024"]],
      [],
    );
    expect(r.products).toHaveLength(1);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });
  it("lit les prix et fabrique des adresses propres", () => {
    expect(parsePrice("13,56")).toBe(1356);
    expect(parsePrice("9.5 €")).toBe(950);
    expect(parsePrice("abc")).toBeNull();
    expect(slugify("Château de Grand Pré", "Côte de Brouilly", "2023")).toBe("chateau-de-grand-pre-cote-de-brouilly-2023");
  });
});

describe("statuts des commandes", () => {
  it("n'autorise aucun retour depuis une commande annulée", () => {
    expect(allowedNext("ANNULEE")).toEqual([]);
    expect(canMove("NOUVELLE", "REMISE")).toBe(true);
    expect(canMove("ANNULEE", "NOUVELLE")).toBe(false);
  });
  it("débite la carte cadeau à la remise, la rend à l'annulation", () => {
    expect(giftCardEffect("PREPAREE", "REMISE")).toBe("debiter");
    expect(giftCardEffect("REMISE", "ANNULEE")).toBe("liberer");
    expect(giftCardEffect("NOUVELLE", "ANNULEE")).toBe("liberer");
    expect(giftCardEffect("REMISE", "PREPAREE")).toBe("reserver");
    expect(giftCardEffect("NOUVELLE", "CONFIRMEE")).toBeNull();
  });
});
