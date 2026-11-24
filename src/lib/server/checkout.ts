import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { cgvVersion } from "../legal";
import { checkGiftCard, giftCardAmount, normalizeGiftCode } from "../rules/giftcard";
import { orderableMarkets, type Occurrence } from "../rules/markets";
import { parisNow } from "../rules/paris-time";
import { cartTotals, lineTotalCents } from "../rules/pricing";
import type { Settings } from "../settings-defaults";
import { db } from "./db";
import { type GeoSearch } from "./geocode";
import { deliveryZone } from "./zone";
import { loadMarkets } from "./markets";

/* ------------------------------------------------------------------ */
/* Panier : les prix viennent toujours de la base, jamais du navigateur */
/* ------------------------------------------------------------------ */

export const CartInput = z
  .array(z.object({ slug: z.string().min(1).max(120), qty: z.number().int().min(1).max(99) }))
  .max(200);
export type CartInput = z.infer<typeof CartInput>;

export type PricedLine = {
  slug: string;
  productId: string;
  name: string;
  domain: string;
  vintage: string;
  volumeCl: number;
  color: string;
  kind: string;
  boxKind: string | null;
  isBeer: boolean;
  bottleLabel: string | null;
  photoUrl: string | null;
  unitCents: number;
  qty: number;
  discountEligible: boolean;
  discounted: boolean;
  lineTotalCents: number;
};

export type PricedCart = {
  lines: PricedLine[];
  /** produits retirés du panier (inconnus, masqués, indisponibles ou carte cadeau) */
  removed: { slug: string; reason: string }[];
  grossCents: number;
  discountCents: number;
  totalCents: number;
  count: number;
};

export async function priceCart(items: CartInput, s: Settings): Promise<PricedCart> {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.slug, Math.min(99, (merged.get(i.slug) || 0) + i.qty));
  const products = await db.product.findMany({ where: { slug: { in: [...merged.keys()] } } });
  const rule = { percent: s.discountPercent, minQty: s.discountMinQty };
  const lines: PricedLine[] = [];
  const removed: PricedCart["removed"] = [];
  for (const [slug, qty] of merged) {
    const p = products.find((x) => x.slug === slug);
    if (!p || p.hidden) removed.push({ slug, reason: "Ce produit n'est plus à la carte." });
    else if (p.kind === "CARTE_CADEAU") removed.push({ slug, reason: "La carte cadeau s'achète sur les marchés." });
    else if (!p.available) removed.push({ slug, reason: `« ${p.name} » est indisponible pour le moment.` });
    else {
      const total = lineTotalCents(p.priceCents, qty, p.discountEligible, rule);
      lines.push({
        slug, productId: p.id, name: p.name, domain: p.domain, vintage: p.vintage, volumeCl: p.volumeCl, color: p.color,
        kind: p.kind, boxKind: p.boxKind, isBeer: p.isBeer, bottleLabel: p.bottleLabel, photoUrl: p.photoUrl,
        unitCents: p.priceCents, qty, discountEligible: p.discountEligible, discounted: total < p.priceCents * qty, lineTotalCents: total,
      });
    }
  }
  lines.sort((a, b) => products.findIndex((p) => p.slug === a.slug) - products.findIndex((p) => p.slug === b.slug));
  const t = cartTotals(lines.map((l) => ({ unitCents: l.unitCents, qty: l.qty, eligible: l.discountEligible })), rule);
  return { lines, removed, ...t };
}

/* ------------------------------ Marchés ------------------------------ */

/** Marchés proposés au retrait : ceux dont l'heure limite n'est pas passée. Le marché préféré est remonté. */
export async function marketChoices(now: Date, s: Settings, preferredTown?: string | null): Promise<Occurrence[]> {
  const { weekly, exceptions } = await loadMarkets();
  let up = orderableMarkets(now, weekly, exceptions, s.cutoffHour, { limit: 10 });
  if (preferredTown && !up.some((m) => m.town === preferredTown)) {
    const f = orderableMarkets(now, weekly, exceptions, s.cutoffHour, { days: 60, town: preferredTown })[0];
    if (f) up = [f, ...up];
  }
  return up;
}

/* ------------------------------ Commande ------------------------------ */

const phoneRe = /^[+0-9 .()-]{10,20}$/;

export const CheckoutSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("MARCHE"), marketKey: z.string().min(3).max(120) }),
  z.object({ mode: z.literal("LIVRAISON"), city: z.string().trim().min(2, "Indiquez votre commune.").max(120), address: z.string().trim().min(3, "Indiquez votre adresse (numéro et rue).").max(300) }),
  z.object({ mode: z.literal("EXPEDITION"), shipAddress: z.string().trim().min(10, "Indiquez l'adresse de livraison ou le point relais souhaité.").max(400) }),
]).and(
  z.object({
    items: CartInput.min(1, "Votre panier est vide."),
    phone: z.string().trim().regex(phoneRe, "Indiquez un numéro de téléphone valide pour que Guillaume puisse vous joindre."),
    note: z.string().trim().max(1000).default(""),
    giftCode: z.string().trim().max(40).optional(),
    payment: z.enum(["A_LA_REMISE", "EN_LIGNE"]).default("A_LA_REMISE"),
    cgv: z.literal(true, "Merci d'accepter les conditions générales de vente pour commander."),
  }),
);
export type CheckoutInput = z.input<typeof CheckoutSchema>;

export type CheckoutResult =
  | { ok: true; number: string; orderId: string; totalCents: number; giftCardCents: number }
  | { ok: false; error: string; field?: string };

function orderNumber(now: Date) {
  const d = parisNow(now).date.replace(/-/g, "").slice(2); // AAMMJJ
  const r = [...randomBytes(4)].map((b) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join("");
  return `LCB-${d}-${r}`;
}

/**
 * Crée la commande après avoir tout revérifié côté serveur :
 * prix et remise (depuis la base), disponibilité, heure limite du marché,
 * zone de livraison, carte cadeau, acceptation des CGV.
 */
export async function placeOrder(
  user: Pick<User, "id" | "email" | "firstName" | "lastName">,
  raw: unknown,
  ctx: { now: Date; settings: Settings; geocoder?: GeoSearch },
): Promise<CheckoutResult> {
  const parsed = CheckoutSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i?.message || "Vérifiez le formulaire.", field: i?.path.join(".") };
  }
  const input = parsed.data;
  const { now, settings: s } = ctx;

  if (input.payment === "EN_LIGNE" && !s.onlinePayment.enabled) return { ok: false, error: "Le paiement en ligne n'est pas encore disponible." };

  const cart = await priceCart(input.items, s);
  if (cart.removed.length) return { ok: false, error: cart.removed[0].reason + " Retirez-le du panier pour continuer." };
  if (!cart.lines.length) return { ok: false, error: "Votre panier est vide." };

  let delivery: Partial<Prisma.OrderUncheckedCreateInput> = {};
  if (input.mode === "MARCHE") {
    const { weekly, exceptions } = await loadMarkets();
    const m = orderableMarkets(now, weekly, exceptions, s.cutoffHour, { days: 70 }).find((o) => o.key === input.marketKey);
    if (!m) return { ok: false, error: `Ce marché n'est plus disponible : les commandes sont possibles jusqu'à ${s.cutoffHour} h la veille. Choisissez une autre date.`, field: "marketKey" };
    delivery = { marketDate: m.date, marketTown: m.town, marketPlace: m.place, marketHours: m.hours };
  } else if (input.mode === "LIVRAISON") {
    const z = await deliveryZone(input.city, input.address, s, ctx.geocoder);
    if (z.status === "ambigu")
      return { ok: false, error: `Plusieurs communes portent ce nom (${z.candidates.join(", ")}). Choisissez la vôtre dans la liste, avec son département.`, field: "city" };
    if (z.status === "inconnue") return { ok: false, error: "Adresse introuvable. Vérifiez la commune et l'adresse, ou choisissez le retrait au marché ou l'expédition.", field: "city" };
    if (z.status === "hors-zone")
      return { ok: false, error: `Votre adresse est hors de la zone de livraison (${z.km} km de Dompierre, livraison jusqu'à ${s.deliveryRadiusKm} km). Choisissez le retrait au marché ou l'expédition.`, field: "city" };
    delivery = { address: input.address, city: z.name, distanceKm: z.km, zoneSource: z.source };
  } else {
    delivery = { address: input.shipAddress };
  }

  // Carte cadeau : contrôle et réservation dans la même transaction que la commande
  let giftCode: string | null = null;
  if (input.giftCode) {
    giftCode = normalizeGiftCode(input.giftCode);
    if (!giftCode) return { ok: false, error: "Le code de carte cadeau n'a pas le bon format (ex. LCB-7KQ2-M9XP).", field: "giftCode" };
  }

  try {
    return await db.$transaction(async (tx) => {
      let giftCents = 0;
      let cardId: string | null = null;
      if (giftCode) {
        // verrou de la ligne pour éviter deux utilisations simultanées du même solde
        const rows = await tx.$queryRaw<{ id: string; balanceCents: number; disabled: boolean; expiresAt: Date | null }[]>`
          SELECT id, "balanceCents", disabled, "expiresAt" FROM "GiftCard" WHERE code = ${giftCode} FOR UPDATE`;
        const card = rows[0] ?? null;
        const check = checkGiftCard(card, now);
        if (!check.ok) throw new CheckoutError(check.reason, "giftCode");
        giftCents = giftCardAmount(card!.balanceCents, cart.totalCents);
        cardId = card!.id;
        await tx.giftCard.update({ where: { id: cardId }, data: { balanceCents: { decrement: giftCents } } });
      }
      let number = orderNumber(now);
      for (let i = 0; i < 5 && (await tx.order.findUnique({ where: { number } })); i++) number = orderNumber(now);
      const order = await tx.order.create({
        data: {
          number,
          userId: user.id,
          mode: input.mode,
          customerName: `${user.firstName} ${user.lastName}`,
          customerEmail: user.email,
          phone: input.phone,
          note: input.note,
          grossCents: cart.grossCents,
          discountCents: cart.discountCents,
          giftCardCents: giftCents,
          totalCents: cart.totalCents - giftCents,
          paymentMethod: input.payment,
          cgvVersion: cgvVersion(s, s.onlinePayment.enabled),
          cgvAcceptedAt: now,
          ...delivery,
          items: {
            create: cart.lines.map((l) => ({
              productId: l.productId, slug: l.slug, name: l.name, domain: l.domain, vintage: l.vintage, volumeCl: l.volumeCl,
              unitCents: l.unitCents, qty: l.qty, discountEligible: l.discountEligible, lineTotalCents: l.lineTotalCents,
            })),
          },
          giftCardUses: cardId && giftCents > 0 ? { create: { giftCardId: cardId, amountCents: giftCents } } : undefined,
        },
      });
      return { ok: true as const, number: order.number, orderId: order.id, totalCents: order.totalCents, giftCardCents: order.giftCardCents };
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message, field: e.field };
    throw e;
  }
}

class CheckoutError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}
