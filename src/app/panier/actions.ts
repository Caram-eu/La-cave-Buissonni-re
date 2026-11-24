"use server";

import { currentUser } from "@/lib/server/auth";
import { CartInput, marketChoices, placeOrder, priceCart, type CheckoutResult } from "@/lib/server/checkout";
import { rateLimit } from "@/lib/server/rate-limit";
import { db } from "@/lib/server/db";
import { notifyNewOrder, siteUrl } from "@/lib/server/notify";
import { createPayment, paymentConfigured } from "@/lib/server/payment";
import { getSettings } from "@/lib/server/settings";

/** Recalcule le panier avec les prix de la base (affichage). */
export async function previewCart(items: unknown) {
  const parsed = CartInput.safeParse(items);
  const s = await getSettings();
  const cart = await priceCart(parsed.success ? parsed.data : [], s);
  return cart;
}

/** Marchés encore ouverts à la commande, le marché préféré en premier. */
export async function checkoutOptions(preferredTown?: string | null) {
  const [s, user] = await Promise.all([getSettings(), currentUser()]);
  const markets = await marketChoices(new Date(), s, preferredTown || user?.habitualTown);
  return {
    onlinePayment: s.onlinePayment.enabled && paymentConfigured(),
    loggedIn: !!user,
    phone: user?.phone ?? "",
    preferredTown: preferredTown || user?.habitualTown || null,
    markets: markets.map((m) => ({ key: m.key, date: m.date, town: m.town, place: m.place, hours: m.hours, special: m.special })),
  };
}

export async function submitOrder(raw: unknown): Promise<CheckoutResult & { redirectUrl?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Connectez-vous pour valider votre commande." };
  if (!(await rateLimit(`commande:${user.id}`, 10, 3600))) return { ok: false, error: "Trop de commandes en peu de temps. Appelez Guillaume si besoin." };
  const settings = await getSettings();
  const online = settings.onlinePayment.enabled && paymentConfigured();
  const res = await placeOrder(user, raw, { now: new Date(), settings: { ...settings, onlinePayment: { ...settings.onlinePayment, enabled: online } } });
  if (!res.ok) return res;
  let redirectUrl: string | undefined;
  const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId }, select: { paymentMethod: true } });
  if (order.paymentMethod === "EN_LIGNE") {
    if (res.totalCents > 0) {
      const pay = await createPayment({ id: res.orderId, number: res.number, totalCents: res.totalCents }, siteUrl());
      if (pay) redirectUrl = pay.url;
      // SumUp injoignable : la commande reste valable, réglée à la remise
      else await db.order.update({ where: { id: res.orderId }, data: { paymentMethod: "A_LA_REMISE" } });
    } else await db.order.update({ where: { id: res.orderId }, data: { paymentStatus: "paye" } }); // entièrement réglée par carte cadeau
  }
  await notifyNewOrder(res.orderId); // confirmation au client et alerte à Guillaume
  return { ...res, redirectUrl };
}
