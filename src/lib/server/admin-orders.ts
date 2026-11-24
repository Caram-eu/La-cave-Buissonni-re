import "server-only";
import type { Prisma } from "@prisma/client";
import { canMove, giftCardEffect, type OrderStatus } from "../rules/orders";
import { db } from "./db";

export type OrderFilters = { from?: string; to?: string; town?: string; status?: string; q?: string };

/** Commandes filtrées par date de commande ou de marché, marché et statut. */
export function orderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (f.from) and.push({ OR: [{ marketDate: { gte: f.from } }, { marketDate: null, createdAt: { gte: new Date(f.from + "T00:00:00+01:00") } }] });
  if (f.to) and.push({ OR: [{ marketDate: { lte: f.to } }, { marketDate: null, createdAt: { lte: new Date(f.to + "T23:59:59+01:00") } }] });
  if (f.town === "__livraison") and.push({ mode: "LIVRAISON" });
  else if (f.town === "__expedition") and.push({ mode: "EXPEDITION" });
  else if (f.town) and.push({ marketTown: f.town });
  if (f.status) and.push({ status: f.status as OrderStatus });
  if (f.q) and.push({ OR: [{ number: { contains: f.q, mode: "insensitive" } }, { customerName: { contains: f.q, mode: "insensitive" } }, { phone: { contains: f.q } }] });
  return and.length ? { AND: and } : {};
}

/**
 * Change le statut d'une commande et applique l'effet sur la carte cadeau éventuelle
 * (débit à la remise, montant rendu à l'annulation), dans une seule transaction.
 */
export async function setOrderStatus(orderId: string, to: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { giftCardUses: true } });
    if (!o) return { ok: false, error: "Commande introuvable." };
    if (o.status === to) return { ok: true };
    if (!canMove(o.status, to)) return { ok: false, error: "Ce changement de statut n'est pas possible." };
    const effect = giftCardEffect(o.status, to);
    for (const u of o.giftCardUses) {
      if (effect === "liberer" && u.status !== "LIBERE") {
        await tx.giftCard.update({ where: { id: u.giftCardId }, data: { balanceCents: { increment: u.amountCents } } });
        await tx.giftCardUse.update({ where: { id: u.id }, data: { status: "LIBERE" } });
      } else if (effect === "debiter" && u.status === "RESERVE") {
        await tx.giftCardUse.update({ where: { id: u.id }, data: { status: "DEBITE" } });
      } else if (effect === "reserver" && u.status === "DEBITE") {
        await tx.giftCardUse.update({ where: { id: u.id }, data: { status: "RESERVE" } });
      }
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(to === "REMISE" && o.paymentMethod === "A_LA_REMISE" ? { paymentStatus: "paye" } : {}),
        ...(o.status === "REMISE" && to !== "REMISE" && o.paymentMethod === "A_LA_REMISE" ? { paymentStatus: "a_payer" } : {}),
      },
    });
    return { ok: true };
  });
}

/** Fiche de préparation : bouteilles à charger dans le camion pour un marché, et commandes par client. */
export async function preparation(date: string, town: string) {
  const orders = await db.order.findMany({
    where: { marketDate: date, marketTown: town, status: { not: "ANNULEE" } },
    include: { items: true },
    orderBy: { customerName: "asc" },
  });
  const totals = new Map<string, { name: string; domain: string; vintage: string; volumeCl: number; qty: number }>();
  for (const o of orders)
    for (const i of o.items) {
      const t = totals.get(i.slug) ?? { name: i.name, domain: i.domain, vintage: i.vintage, volumeCl: i.volumeCl, qty: 0 };
      t.qty += i.qty;
      totals.set(i.slug, t);
    }
  const bottles = [...totals.values()].sort((a, b) => a.domain.localeCompare(b.domain, "fr") || a.name.localeCompare(b.name, "fr"));
  return { orders, bottles, count: bottles.reduce((a, b) => a + b.qty, 0) };
}
