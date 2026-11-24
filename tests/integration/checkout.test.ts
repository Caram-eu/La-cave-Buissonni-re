import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { placeOrder, priceCart } from "@/lib/server/checkout";
import type { GeoHit, GeoSearch } from "@/lib/server/geocode";
import { orderableMarkets } from "@/lib/rules/markets";
import { loadMarkets } from "@/lib/server/markets";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

const s = structuredClone(DEFAULT_SETTINGS);
const NOW = new Date("2026-11-23T10:00:00Z"); // lundi 23 novembre 2026, 11 h à Paris
const hit = (city: string, citycode: string, lon: number, lat: number, type = "municipality", score = 0.95): GeoHit => ({ lon, lat, label: city, city, citycode, postcode: "", score, type });
// Simule l'IGN : communes homonymes et rues homonymes comme dans la réalité
const fakeIgn: GeoSearch = async (q, o = {}) => {
  if (o.type === "municipality") {
    if (/^moulins$/i.test(q)) return [hit("Moulins", "03190", 3.333, 46.566), hit("Moulins", "35198", -1.37, 47.97, "municipality", 0.93)];
    if (/^paris$/i.test(q)) return [hit("Paris", "75056", 2.35, 48.85)];
    if (/^vichy$/i.test(q)) return [hit("Vichy", "03310", 3.42, 46.13)];
    return [];
  }
  if (o.citycode === "03190" && /rue de paris/i.test(q)) return [hit("Moulins", "03190", 3.331, 46.567, "housenumber", 0.97)];
  if (o.citycode === "75056") return [hit("Paris", "75056", 2.35, 48.86, "housenumber", 0.9)];
  // sans filtre de commune, l'IGN renverrait une rue homonyme à Paris : ce cas ne doit jamais servir
  return [hit("Paris", "75103", 2.36, 48.86, "housenumber", 0.5)];
};
const geoDown: GeoSearch = async () => null;

let user: { id: string; email: string; firstName: string; lastName: string };
let marketKey: string;
const base = { phone: "06 12 34 56 78", cgv: true };

beforeAll(async () => {
  user = await db.user.create({ data: { email: "test@exemple.fr", passwordHash: "x", firstName: "Camille", lastName: "Test", adultCertifiedAt: NOW } });
  const { weekly, exceptions } = await loadMarkets();
  marketKey = orderableMarkets(NOW, weekly, exceptions, 19, { limit: 1 })[0].key;
});
afterAll(() => db.$disconnect());

describe("panier recalculé par le serveur", () => {
  it("prend les prix de la base et applique la remise sur les vins seulement", async () => {
    const c = await priceCart([{ slug: "fabien-jouves-les-escures-2024", qty: 6 }, { slug: "brasserie-du-pere-st-oy-la-kraken", qty: 6 }], s);
    const vin = c.lines.find((l) => l.slug === "fabien-jouves-les-escures-2024")!;
    expect(vin.lineTotalCents).toBe(8550);
    const biere = c.lines.find((l) => l.isBeer);
    if (biere) expect(biere.discounted).toBe(false);
  });
  it("refuse la carte cadeau et les produits inconnus", async () => {
    const c = await priceCart([{ slug: "carte-cadeau", qty: 1 }, { slug: "inexistant", qty: 1 }], s);
    expect(c.lines).toHaveLength(0);
    expect(c.removed).toHaveLength(2);
  });
});

describe("création de commande", () => {
  it("ignore tout prix envoyé par le navigateur", async () => {
    const r = await placeOrder(
      user,
      { ...base, mode: "MARCHE", marketKey, items: [{ slug: "domaine-colin-vieilles-vignes-blanc-2023", qty: 6, priceCents: 1 }], totalCents: 1 },
      { now: NOW, settings: s },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = await db.order.findUniqueOrThrow({ where: { id: r.orderId }, include: { items: true } });
    expect(o.items[0].unitCents).toBe(1356);
    expect(o.totalCents).toBe(7729); // 6 x 13,56 € - 5 %
    expect(o.cgvVersion).toBeTruthy();
    expect(o.status).toBe("NOUVELLE");
  });
  it("refuse un marché dont l'heure limite est passée", async () => {
    // lundi 23 à 11 h : le marché du lundi 23 (Marcigny) n'est plus commandable
    const { weekly } = await loadMarkets();
    const marcigny = weekly.find((m) => m.town === "Marcigny")!;
    const r = await placeOrder(user, { ...base, mode: "MARCHE", marketKey: `m:${marcigny.id}:2026-11-23`, items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s });
    expect(r).toMatchObject({ ok: false, field: "marketKey" });
  });
  it("refuse 19 h pile la veille, accepte 18 h 59", async () => {
    const { weekly } = await loadMarkets();
    const decize = weekly.find((m) => m.town === "Decize")!; // vendredi 27
    const order = (now: Date) => placeOrder(user, { ...base, mode: "MARCHE", marketKey: `m:${decize.id}:2026-11-27`, items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now, settings: s });
    expect((await order(new Date("2026-11-26T17:59:00Z"))).ok).toBe(true);
    expect((await order(new Date("2026-11-26T18:00:00Z"))).ok).toBe(false);
  });
  it("accepte une livraison dans la zone (géocodage IGN)", async () => {
    const r = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Moulins (03)", address: "12 rue de Paris", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 2 }] }, { now: NOW, settings: s, geocoder: fakeIgn });
    expect(r.ok).toBe(true);
    if (r.ok) expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).distanceKm).toBe(27);
  });
  it("demande de préciser une commune homonyme sans département", async () => {
    const r = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Moulins", address: "12 rue de Paris", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s, geocoder: fakeIgn });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Plusieurs communes/);
  });
  it("refuse une livraison hors zone", async () => {
    const r = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Paris", address: "1 rue de Rivoli", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 2 }] }, { now: NOW, settings: s, geocoder: fakeIgn });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/hors de la zone/);
  });
  it("utilise la liste des communes si l'IGN ne répond pas", async () => {
    const ok = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Vichy (03)", address: "3 rue du Parc", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s, geocoder: geoDown });
    expect(ok.ok).toBe(true);
    const ko = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Marseille", address: "1 La Canebière", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s, geocoder: geoDown });
    expect(ko.ok).toBe(false);
  });
  it("suit le rayon réglé dans l'administration", async () => {
    const r = await placeOrder(user, { ...base, mode: "LIVRAISON", city: "Moulins (03)", address: "12 rue de Paris", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: { ...s, deliveryRadiusKm: 20 }, geocoder: fakeIgn });
    expect(r.ok).toBe(false);
  });
  it("exige le téléphone et l'acceptation des CGV", async () => {
    const items = [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }];
    expect((await placeOrder(user, { mode: "EXPEDITION", shipAddress: "10 rue des Lilas 69001 Lyon", items, cgv: true, phone: "" }, { now: NOW, settings: s })).ok).toBe(false);
    expect((await placeOrder(user, { mode: "EXPEDITION", shipAddress: "10 rue des Lilas 69001 Lyon", items, phone: "0612345678", cgv: false }, { now: NOW, settings: s })).ok).toBe(false);
    expect((await placeOrder(user, { mode: "EXPEDITION", shipAddress: "10 rue des Lilas 69001 Lyon", items, phone: "0612345678", cgv: true }, { now: NOW, settings: s })).ok).toBe(true);
  });
  it("refuse un produit indisponible et le paiement en ligne désactivé", async () => {
    await db.product.update({ where: { slug: "domaine-d-aupilhac-le-cinsault-2022" }, data: { available: false } });
    const r = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, items: [{ slug: "domaine-d-aupilhac-le-cinsault-2022", qty: 1 }] }, { now: NOW, settings: s });
    expect(r.ok).toBe(false);
    const p = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, payment: "EN_LIGNE", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s });
    expect(p.ok).toBe(false);
  });
});

describe("carte cadeau utilisée sur une commande", () => {
  it("déduit le solde, le réserve, et refuse quand il est épuisé", async () => {
    await db.giftCard.create({ data: { code: "LCB-TEST-AAAA", initialCents: 3000, balanceCents: 3000 } });
    const items = [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }]; // 15 €
    const r1 = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, giftCode: "lcb test aaaa", items }, { now: NOW, settings: s });
    expect(r1).toMatchObject({ ok: true, giftCardCents: 1500, totalCents: 0 });
    const r2 = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, giftCode: "LCB-TEST-AAAA", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 2 }] }, { now: NOW, settings: s });
    expect(r2).toMatchObject({ ok: true, giftCardCents: 1500, totalCents: 1500 });
    const card = await db.giftCard.findUniqueOrThrow({ where: { code: "LCB-TEST-AAAA" }, include: { uses: true } });
    expect(card.balanceCents).toBe(0);
    expect(card.uses.map((u) => u.status)).toEqual(["RESERVE", "RESERVE"]);
    const r3 = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, giftCode: "LCB-TEST-AAAA", items }, { now: NOW, settings: s });
    expect(r3).toMatchObject({ ok: false, field: "giftCode" });
  });
  it("refuse un code inconnu sans créer de commande", async () => {
    const before = await db.order.count();
    const r = await placeOrder(user, { ...base, mode: "MARCHE", marketKey, giftCode: "LCB-ZZZZ-ZZZZ", items: [{ slug: "fabien-jouves-les-escures-2024", qty: 1 }] }, { now: NOW, settings: s });
    expect(r.ok).toBe(false);
    expect(await db.order.count()).toBe(before);
  });
});
