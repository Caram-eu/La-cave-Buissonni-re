import "server-only";
import { marketReminder, orderAlert, orderConfirmation, quoteAlert, type OrderForEmail, type QuoteForEmail } from "../emails";
import { addDays, parisNow } from "../rules/paris-time";
import { purgeExpiredData } from "./account";
import { db } from "./db";
import { sendMail } from "./mail";
import { getSettings } from "./settings";

export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Destinataire des alertes (nouvelle commande, devis) : ALERT_EMAIL, sinon l'e-mail des coordonnées. */
async function alertTo() {
  return process.env.ALERT_EMAIL || (await getSettings()).contact.email;
}

async function orderForEmail(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: true } }) as Promise<(OrderForEmail & { id: string; status: string; reminderSentAt: Date | null }) | null>;
}

/** Nouvelle commande : confirmation au client et alerte à Guillaume. N'échoue jamais. */
export async function notifyNewOrder(orderId: string) {
  try {
    const [o, s] = await Promise.all([orderForEmail(orderId), getSettings()]);
    if (!o) return;
    const ctx = { site: siteUrl(), contact: s.contact, paymentMethods: s.paymentMethods, cutoffHour: s.cutoffHour };
    const c = orderConfirmation(o, ctx);
    const a = orderAlert(o, ctx);
    await Promise.all([
      sendMail({ to: o.customerEmail, toName: o.customerName, ...c, kind: "confirmation", orderId }),
      sendMail({ to: await alertTo(), ...a, kind: "alerte-commande", orderId }),
    ]);
  } catch (e) {
    console.error("Notification de commande impossible", e);
  }
}

export async function notifyQuote(q: QuoteForEmail) {
  try {
    const s = await getSettings();
    await sendMail({ to: await alertTo(), ...quoteAlert(q, { site: siteUrl(), contact: s.contact }), kind: "alerte-devis" });
  } catch (e) {
    console.error("Notification de devis impossible", e);
  }
}

/**
 * Rappel la veille du retrait : commandes du marché de demain (heure de Paris), non annulées, non remises.
 * Chaque commande n'est rappelée qu'une fois, même si la tâche tourne deux fois.
 * À lancer après l'heure limite (19 h) pour inclure les dernières commandes.
 */
export async function sendMarketReminders(now = new Date()) {
  const s = await getSettings();
  const tomorrow = addDays(parisNow(now).date, 1);
  const orders = await db.order.findMany({
    where: { mode: "MARCHE", marketDate: tomorrow, status: { in: ["NOUVELLE", "CONFIRMEE", "PREPAREE"] }, reminderSentAt: null },
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of orders) {
    // réservation de l'envoi : évite un double rappel si deux tâches tournent en même temps
    const claim = await db.order.updateMany({ where: { id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (!claim.count) continue;
    const o = await orderForEmail(id);
    if (!o) continue;
    const ok = await sendMail({ to: o.customerEmail, toName: o.customerName, ...marketReminder(o, { site: siteUrl(), contact: s.contact, paymentMethods: s.paymentMethods }), kind: "rappel", orderId: id });
    if (ok) sent++;
    else await db.order.update({ where: { id }, data: { reminderSentAt: null } }); // sera retenté au prochain passage
  }
  return { date: tomorrow, candidates: orders.length, sent };
}

/** Tâche quotidienne : rappels de la veille, puis durées de conservation (RGPD). */
export async function dailyTasks(now = new Date()) {
  const reminders = await sendMarketReminders(now);
  const purge = await purgeExpiredData(now);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const logs = await db.emailLog.deleteMany({ where: { createdAt: { lt: yearAgo } } });
  return { reminders, purge: { ...purge, emailLogs: logs.count } };
}
