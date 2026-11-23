"use server";

import { currentUser } from "@/lib/server/auth";
import { CartInput, marketChoices, placeOrder, priceCart, type CheckoutResult } from "@/lib/server/checkout";
import { rateLimit } from "@/lib/server/rate-limit";
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
    loggedIn: !!user,
    phone: user?.phone ?? "",
    preferredTown: preferredTown || user?.habitualTown || null,
    markets: markets.map((m) => ({ key: m.key, date: m.date, town: m.town, place: m.place, hours: m.hours, special: m.special })),
  };
}

export async function submitOrder(raw: unknown): Promise<CheckoutResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Connectez-vous pour valider votre commande." };
  if (!(await rateLimit(`commande:${user.id}`, 10, 3600))) return { ok: false, error: "Trop de commandes en peu de temps. Appelez Guillaume si besoin." };
  const settings = await getSettings();
  const res = await placeOrder(user, raw, { now: new Date(), settings });
  // L'e-mail de confirmation et l'alerte à Guillaume seront branchés à l'étape « E-mails ».
  return res;
}
