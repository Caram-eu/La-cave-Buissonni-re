import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { preparation, setOrderStatus, orderWhere } from "@/lib/server/admin-orders";
import { applyImport, analyseImport } from "@/lib/server/catalog-import";
import { placeOrder } from "@/lib/server/checkout";
import { db } from "@/lib/server/db";
import { loadMarkets } from "@/lib/server/markets";
import { orderableMarkets } from "@/lib/rules/markets";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

const s = structuredClone(DEFAULT_SETTINGS);
const NOW = new Date("2026-11-23T10:00:00Z");
let user: { id: string; email: string; firstName: string; lastName: string };
let market: { key: string; date: string; town: string };

beforeAll(async () => {
  user = await db.user.create({ data: { email: "admin-test@exemple.fr", passwordHash: "x", firstName: "Sacha", lastName: "Test", adultCertifiedAt: NOW } });
  const { weekly, exceptions } = await loadMarkets();
  market = orderableMarkets(NOW, weekly, exceptions, 19, { limit: 1 })[0];
});
afterAll(async () => {
  // remet la carte de test dans son état initial pour les autres fichiers de test
  await db.product.updateMany({ where: { kind: "PRODUIT" }, data: { hidden: false } });
  await db.product.update({ where: { slug: "fabien-jouves-les-escures-2024" }, data: { priceCents: 1500 } });
  await db.product.deleteMany({ where: { slug: "domaine-nouveau-premiere-2025" } });
  await db.$disconnect();
});

const order = async (items: { slug: string; qty: number }[], giftCode?: string) => {
  const r = await placeOrder(user, { mode: "MARCHE", marketKey: market.key, items, phone: "0612345678", cgv: true, giftCode }, { now: NOW, settings: s });
  if (!r.ok) throw new Error(r.error);
  return r.orderId;
};

describe("statuts et carte cadeau", () => {
  it("débite la carte à la remise et rend le montant à l'annulation", async () => {
    await db.giftCard.create({ data: { code: "LCB-ADMN-WAAA", initialCents: 5000, balanceCents: 5000 } });
    const id = await order([{ slug: "fabien-jouves-les-escures-2024", qty: 2 }], "LCB-ADMN-WAAA"); // 30 €
    const card = () => db.giftCard.findUniqueOrThrow({ where: { code: "LCB-ADMN-WAAA" }, include: { uses: true } });
    expect((await card()).balanceCents).toBe(2000);
    expect(await setOrderStatus(id, "REMISE")).toEqual({ ok: true });
    expect((await card()).uses[0].status).toBe("DEBITE");
    expect((await db.order.findUniqueOrThrow({ where: { id } })).paymentStatus).toBe("paye");
    expect(await setOrderStatus(id, "ANNULEE")).toEqual({ ok: true });
    const c = await card();
    expect(c.balanceCents).toBe(5000);
    expect(c.uses[0].status).toBe("LIBERE");
    // une commande annulée reste annulée, et le montant n'est pas rendu deux fois
    expect((await setOrderStatus(id, "NOUVELLE")).ok).toBe(false);
    expect((await card()).balanceCents).toBe(5000);
  });
});

describe("fiche de préparation par marché", () => {
  it("additionne les bouteilles de toutes les commandes du marché, hors commandes annulées", async () => {
    const a = await order([{ slug: "domaine-d-aupilhac-lou-maset-2023", qty: 3 }, { slug: "ethylotest", qty: 1 }]);
    await order([{ slug: "domaine-d-aupilhac-lou-maset-2023", qty: 4 }]);
    const c = await order([{ slug: "domaine-d-aupilhac-lou-maset-2023", qty: 10 }]);
    await setOrderStatus(c, "ANNULEE");
    const prep = await preparation(market.date, market.town);
    expect(prep.bottles.find((b) => b.name === "Lou Maset")!.qty).toBe(7);
    expect(prep.orders.map((o) => o.id)).toContain(a);
    expect(prep.orders.map((o) => o.id)).not.toContain(c);
  });
  it("filtre les commandes par marché et par statut", async () => {
    const n = await db.order.count({ where: orderWhere({ town: market.town, status: "ANNULEE" }) });
    expect(n).toBeGreaterThanOrEqual(2);
    expect(await db.order.count({ where: orderWhere({ town: "Ville inconnue" }) })).toBe(0);
  });
});

describe("import d'une nouvelle carte", () => {
  const csv = (body: string) => new File([body], "carte.csv", { type: "text/csv" });
  it("met à jour, crée, et masque les références absentes sans les supprimer", async () => {
    const file = csv("Domaine;Cuvée;Catégorie;Région;Prix TTC;Millésime;Adresse (ne pas modifier)\nFabien Jouves;Les Escures;rouge;Sud-Ouest;16,00;2024;fabien-jouves-les-escures-2024\nDomaine Nouveau;Première;blanc;Vallée de la Loire;11;2025;\n");
    const a = await analyseImport(file);
    expect(a.errors).toEqual([]);
    expect(a).toMatchObject({ created: 1, updated: 1 });
    expect(a.missing.length).toBeGreaterThan(100);
    await applyImport(a.products, true);
    const escures = await db.product.findUniqueOrThrow({ where: { slug: "fabien-jouves-les-escures-2024" } });
    expect(escures).toMatchObject({ priceCents: 1600, hidden: false, appellation: "AOC Cahors", noAddedSulfites: true }); // colonnes absentes : inchangées
    expect(await db.product.findUnique({ where: { slug: "domaine-nouveau-premiere-2025" } })).not.toBeNull();
    expect((await db.product.findUniqueOrThrow({ where: { slug: "domaine-d-aupilhac-lou-maset-2023" } })).hidden).toBe(true);
    // l'éthylotest et la carte cadeau ne sont pas concernés par l'import
    expect((await db.product.findUniqueOrThrow({ where: { slug: "ethylotest" } })).hidden).toBe(false);
    // les commandes passées gardent leurs lignes
    expect(await db.orderItem.count({ where: { slug: "domaine-d-aupilhac-lou-maset-2023" } })).toBeGreaterThan(0);
  });
});
