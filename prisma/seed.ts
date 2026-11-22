/**
 * Script d'initialisation : charge donnees/produits.json et donnees/marches.json dans la base.
 * Relançable sans risque : les produits sont mis à jour par leur adresse (slug),
 * les marchés sont remplacés seulement si la base n'en contient aucun (option --marches pour forcer).
 */
import { PrismaClient, ProductTag } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NO_DISCOUNT_CATEGORIES } from "../src/lib/settings-defaults";

const db = new PrismaClient();
const dir = path.join(__dirname, "..", "donnees");
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));

type Raw = {
  id: string; n: string; cat: string; c: string; d: string; lab: string; r: string; app: string; g: string;
  y: string; v: number; p: number; ssa?: number; su?: string; st?: string; tag?: string; beer?: number; lbl?: string; box?: string;
};

async function seedProducts() {
  const raw: Raw[] = read("produits.json");
  let i = 0;
  for (const p of raw) {
    const data = {
      name: p.n, category: p.cat, color: p.c, domain: p.d, label: p.lab, region: p.r, appellation: p.app,
      grapes: p.g, vintage: p.y, volumeCl: p.v, priceCents: Math.round(p.p * 100), noAddedSulfites: !!p.ssa,
      sugar: p.su ?? null, style: p.st ?? null, isBeer: !!p.beer, bottleLabel: p.lbl ?? null, boxKind: p.box ?? null,
      tag: p.tag === "Best-seller" ? ProductTag.BEST_SELLER : p.tag === "Nouveauté" ? ProductTag.NOUVEAUTE : null,
      discountEligible: !NO_DISCOUNT_CATEGORIES.includes(p.cat), sortOrder: i++,
    };
    await db.product.upsert({ where: { slug: p.id }, create: { slug: p.id, ...data }, update: data });
  }
  // Produits ajoutés par le site (comme dans la maquette)
  await db.product.upsert({
    where: { slug: "carte-cadeau" },
    update: {},
    create: {
      slug: "carte-cadeau", kind: "CARTE_CADEAU", name: "Carte cadeau La Cave Buissonnière", category: "coffret", color: "coffret",
      domain: "La Cave Buissonnière", region: "Cartes cadeaux",
      appellation: "Le bénéficiaire choisit parmi les vins, les articles de cave et les prestations",
      priceCents: 2000, discountEligible: false, sortOrder: 10000,
    },
  });
  await db.product.upsert({
    where: { slug: "ethylotest" },
    update: {},
    create: {
      slug: "ethylotest", kind: "ACCESSOIRE", name: "Éthylotest chimique", category: "accessoire", color: "coffret",
      domain: "Norme NF", region: "Accessoires", appellation: "Contrôle du taux d'alcoolémie, usage unique",
      priceCents: 150, discountEligible: false, sortOrder: 10001,
    },
  });
  console.log(`${raw.length + 2} produits chargés.`);
}

async function seedMarkets(force: boolean) {
  if (!force && (await db.market.count()) > 0) {
    console.log("Marchés déjà présents : non modifiés (ajoutez --marches pour les remplacer).");
    return;
  }
  const m = read("marches.json");
  await db.marketException.deleteMany();
  await db.market.deleteMany();
  let i = 0;
  for (const h of m.habituels) {
    await db.market.create({
      data: { town: h.ville, department: h.departement, weekday: h.jour, place: h.lieu, hours: h.horaires, lon: h.lon, lat: h.lat, sortOrder: i++ },
    });
  }
  for (const e of m.exceptionnels) {
    await db.marketException.create({
      data: { kind: "EXCEPTIONNEL", date: e.date, town: e.ville, place: e.lieu, hours: e.horaires, note: e.note ?? null },
    });
  }
  console.log(`${m.habituels.length} marchés habituels et ${m.exceptionnels.length} marchés exceptionnels chargés.`);
}

seedProducts()
  .then(() => seedMarkets(process.argv.includes("--marches")))
  .finally(() => db.$disconnect());
