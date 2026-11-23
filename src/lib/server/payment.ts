import "server-only";
import { db } from "./db";

/**
 * Paiement en ligne par SumUp (page de paiement hébergée par SumUp : aucune donnée de carte ne passe par le site).
 * Désactivé tant que SUMUP_API_KEY et SUMUP_MERCHANT_CODE ne sont pas installées ET que le réglage n'est pas activé.
 *
 * Déroulé : commande créée -> paiement créé chez SumUp -> le client paie sur la page SumUp ->
 * retour sur /panier/paiement et notification sur /api/paiement/sumup -> le site redemande le statut à SumUp
 * (on ne croit jamais le navigateur ni le contenu de la notification) -> commande marquée « payée ».
 * À vérifier avec la documentation SumUp au moment du branchement réel (noms de champs de la page hébergée).
 */
const api = () => (process.env.SUMUP_API_URL || "https://api.sumup.com").replace(/\/$/, "");

/** Les clés du prestataire de paiement sont-elles installées sur le serveur ? */
export function paymentConfigured(): boolean {
  return !!(process.env.SUMUP_API_KEY && process.env.SUMUP_MERCHANT_CODE);
}

async function sumup(path: string, init: RequestInit = {}) {
  return fetch(api() + path, {
    ...init,
    headers: { authorization: `Bearer ${process.env.SUMUP_API_KEY}`, "content-type": "application/json", accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
}

/** Crée le paiement chez SumUp et renvoie l'adresse de la page de paiement, ou null si SumUp ne répond pas. */
export async function createPayment(o: { id: string; number: string; totalCents: number }, site: string): Promise<{ checkoutId: string; url: string } | null> {
  if (!paymentConfigured()) return null;
  try {
    const r = await sumup("/v0.1/checkouts", {
      method: "POST",
      body: JSON.stringify({
        checkout_reference: o.number,
        amount: o.totalCents / 100,
        currency: "EUR",
        merchant_code: process.env.SUMUP_MERCHANT_CODE,
        description: `Commande ${o.number}, La Cave Buissonnière`,
        return_url: `${site}/api/paiement/sumup`,
        redirect_url: `${site}/panier/paiement?commande=${o.id}`,
        hosted_checkout: { enabled: true },
      }),
    });
    if (!r.ok) {
      console.error("SumUp : création du paiement refusée", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return null;
    }
    const d = (await r.json()) as { id?: string; hosted_checkout_url?: string };
    if (!d.id || !d.hosted_checkout_url) return null;
    await db.order.update({ where: { id: o.id }, data: { paymentRef: d.id, paymentStatus: "en_attente" } });
    return { checkoutId: d.id, url: d.hosted_checkout_url };
  } catch (e) {
    console.error("SumUp injoignable", e);
    return null;
  }
}

export type PaymentState = "paye" | "en_attente" | "echec" | "a_payer";

/**
 * Vérifie le paiement auprès de SumUp et met la commande à jour.
 * Payée seulement si SumUp confirme « PAID » pour le bon montant, la bonne devise et la bonne commande.
 */
export async function confirmPayment(orderId: string): Promise<PaymentState> {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o) return "echec";
  if (o.paymentStatus === "paye") return "paye";
  if (!o.paymentRef || !paymentConfigured()) return o.paymentStatus as PaymentState;
  try {
    const r = await sumup(`/v0.1/checkouts/${encodeURIComponent(o.paymentRef)}`);
    if (!r.ok) return "en_attente";
    const c = (await r.json()) as { status?: string; amount?: number; currency?: string; checkout_reference?: string };
    const amountOk = Math.round((c.amount ?? -1) * 100) === o.totalCents && c.currency === "EUR" && c.checkout_reference === o.number;
    if (c.status === "PAID" && amountOk) {
      await db.order.update({ where: { id: o.id }, data: { paymentStatus: "paye" } });
      return "paye";
    }
    if (c.status === "PAID" && !amountOk) {
      console.error(`SumUp : paiement ${o.paymentRef} incohérent avec la commande ${o.number}`);
      return "en_attente"; // à vérifier par Guillaume
    }
    if (c.status === "FAILED" || c.status === "EXPIRED") {
      await db.order.update({ where: { id: o.id }, data: { paymentStatus: "echec" } });
      return "echec";
    }
    return "en_attente";
  } catch {
    return "en_attente";
  }
}
