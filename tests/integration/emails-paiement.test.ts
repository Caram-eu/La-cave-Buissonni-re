import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { placeOrder } from "@/lib/server/checkout";
import { db } from "@/lib/server/db";
import { sendMail } from "@/lib/server/mail";
import { loadMarkets } from "@/lib/server/markets";
import { notifyNewOrder, notifyQuote, sendMarketReminders } from "@/lib/server/notify";
import { confirmPayment, createPayment } from "@/lib/server/payment";
import { orderableMarkets } from "@/lib/rules/markets";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { fakeService } from "./fakes";

const s = structuredClone(DEFAULT_SETTINGS);
const NOW = new Date("2026-11-23T10:00:00Z");
const outbox = process.env.MAIL_OUTBOX_DIR;
let brevoFail = 0;
const brevo = await fakeService((r) => {
  if (r.headers["api-key"] !== "cle-de-test") return { status: 401, json: { message: "Key not found" } };
  if (brevoFail > 0) { brevoFail--; return { status: 503, json: { message: "indisponible" } }; }
  return { status: 201, json: { messageId: `<msg-${Date.now()}@brevo>` } };
});
const checkouts = new Map<string, { status: string; amount: number; currency: string; checkout_reference: string }>();
const sumup = await fakeService((r) => {
  if (r.headers.authorization !== "Bearer sumup-test") return { status: 401 };
  if (r.method === "POST" && r.url === "/v0.1/checkouts") {
    const b = r.body as { checkout_reference: string; amount: number; currency: string; merchant_code: string; hosted_checkout?: { enabled: boolean } };
    if (b.merchant_code !== "MTEST" || !b.hosted_checkout?.enabled) return { status: 400 };
    const id = `chk_${checkouts.size + 1}`;
    checkouts.set(id, { status: "PENDING", amount: b.amount, currency: b.currency, checkout_reference: b.checkout_reference });
    return { status: 201, json: { id, hosted_checkout_url: `https://pay.sumup.test/${id}` } };
  }
  const m = /^\/v0\.1\/checkouts\/(.+)$/.exec(r.url);
  if (r.method === "GET" && m && checkouts.has(m[1])) return { status: 200, json: { id: m[1], ...checkouts.get(m[1]) } };
  return { status: 404 };
});

let user: { id: string; email: string; firstName: string; lastName: string };
let market: { key: string; date: string };

beforeAll(async () => {
  delete process.env.MAIL_OUTBOX_DIR; // ici on passe par le faux Brevo
  Object.assign(process.env, { BREVO_API_KEY: "cle-de-test", BREVO_API_URL: brevo.url, SUMUP_API_KEY: "sumup-test", SUMUP_MERCHANT_CODE: "MTEST", SUMUP_API_URL: sumup.url, SITE_URL: "https://site.test", ALERT_EMAIL: "guillaume@exemple.fr" });
  user = await db.user.create({ data: { email: "mails@exemple.fr", passwordHash: "x", firstName: "Lou", lastName: "Essai", adultCertifiedAt: NOW } });
  const { weekly, exceptions } = await loadMarkets();
  market = orderableMarkets(NOW, weekly, exceptions, 19, { limit: 1 })[0];
});
beforeEach(() => { brevo.requests.length = 0; brevoFail = 0; });
afterAll(async () => {
  process.env.MAIL_OUTBOX_DIR = outbox;
  for (const k of ["BREVO_API_KEY", "BREVO_API_URL", "SUMUP_API_KEY", "SUMUP_MERCHANT_CODE", "SUMUP_API_URL", "ALERT_EMAIL"]) delete process.env[k];
  await Promise.all([brevo.close(), sumup.close()]);
  await db.$disconnect();
});

const order = async (extra: object = {}) => {
  const r = await placeOrder(user, { mode: "MARCHE", marketKey: market.key, items: [{ slug: "fabien-jouves-les-escures-2024", qty: 2 }], phone: "0612345678", cgv: true, ...extra }, { now: NOW, settings: s });
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe("envoi par Brevo", () => {
  it("envoie depuis l'adresse du domaine, avec texte et HTML, et journalise sans le contenu", async () => {
    expect(await sendMail({ to: "client@exemple.fr", subject: "Essai", text: "Bonjour", html: "<p>Bonjour</p>", kind: "essai" })).toBe(true);
    const b = brevo.requests[0].body as { sender: { email: string }; to: { email: string }[]; textContent: string; htmlContent: string };
    expect(b.sender.email).toBe("contact@lacavebuissonniere.fr");
    expect(b.to[0].email).toBe("client@exemple.fr");
    expect(b.htmlContent).toBe("<p>Bonjour</p>");
    const log = await db.emailLog.findFirstOrThrow({ where: { kind: "essai" } });
    expect(log.status).toBe("envoye");
    expect(Object.values(log).join(" ")).not.toContain("Bonjour");
  });
  it("retente une fois en cas d'erreur passagère, puis journalise l'échec sans planter", async () => {
    brevoFail = 1;
    expect(await sendMail({ to: "a@exemple.fr", subject: "Retenté", text: "x", kind: "retente" })).toBe(true);
    expect(brevo.requests).toHaveLength(2);
    brevoFail = 5;
    expect(await sendMail({ to: "a@exemple.fr", subject: "Échoue", text: "x", kind: "echoue" })).toBe(false);
    expect((await db.emailLog.findFirstOrThrow({ where: { kind: "echoue" } })).status).toBe("echec");
  });
  it("nouvelle commande : confirmation au client et alerte à Guillaume", async () => {
    const r = await order({ note: "Merci !" });
    await notifyNewOrder(r.orderId);
    const sent = brevo.requests.map((x) => x.body as { to: { email: string }[]; subject: string; textContent: string });
    expect(sent.map((m) => m.to[0].email).sort()).toEqual(["guillaume@exemple.fr", "mails@exemple.fr"]);
    const alert = sent.find((m) => m.to[0].email === "guillaume@exemple.fr")!;
    expect(alert.textContent).toContain("0612345678");
    expect(alert.textContent).toContain(`https://site.test/admin/commandes/${r.orderId}`);
  });
  it("une demande de devis alerte Guillaume", async () => {
    await notifyQuote({ type: "Mariage", message: "Juin", name: "Claire", phone: "0699887766" });
    expect((brevo.requests[0].body as { subject: string }).subject).toContain("Mariage");
  });
});

describe("rappel la veille du retrait", () => {
  it("rappelle une seule fois les commandes du marché de demain, pas les annulées", async () => {
    const r1 = await order();
    const r2 = await order();
    await db.order.update({ where: { id: r2.orderId }, data: { status: "ANNULEE" } });
    const eve = new Date(`${market.date}T00:00:00Z`);
    eve.setUTCDate(eve.getUTCDate() - 1);
    eve.setUTCHours(18, 30); // la veille vers 19 h 30 à Paris
    const res = await sendMarketReminders(eve);
    const to = brevo.requests.map((x) => (x.body as { subject: string }).subject);
    expect(res.sent).toBeGreaterThanOrEqual(1);
    expect(to.every((t) => t.includes("demain"))).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: r1.orderId } })).reminderSentAt).not.toBeNull();
    expect((await db.order.findUniqueOrThrow({ where: { id: r2.orderId } })).reminderSentAt).toBeNull();
    brevo.requests.length = 0;
    expect((await sendMarketReminders(eve)).sent).toBe(0); // deuxième passage : rien
    expect(brevo.requests).toHaveLength(0);
  });
  it("un rappel en échec sera retenté au passage suivant", async () => {
    const r = await order();
    const eve = new Date(`${market.date}T18:30:00Z`);
    eve.setUTCDate(eve.getUTCDate() - 1);
    brevoFail = 10;
    await sendMarketReminders(eve);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).reminderSentAt).toBeNull();
  });
});

describe("paiement en ligne SumUp (faux service)", () => {
  it("crée le paiement au bon montant et ne marque « payé » qu'après confirmation par SumUp", async () => {
    const r = await order();
    const p = await createPayment({ id: r.orderId, number: r.number, totalCents: r.totalCents }, "https://site.test");
    expect(p?.url).toMatch(/^https:\/\/pay\.sumup\.test\//);
    const chk = checkouts.get(p!.checkoutId)!;
    expect(chk.amount).toBe(30); // 2 x 15 €
    expect(await confirmPayment(r.orderId)).toBe("en_attente");
    chk.status = "PAID";
    expect(await confirmPayment(r.orderId)).toBe("paye");
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).paymentStatus).toBe("paye");
  });
  it("refuse un paiement dont le montant ne correspond pas à la commande", async () => {
    const r = await order();
    const p = await createPayment({ id: r.orderId, number: r.number, totalCents: r.totalCents }, "https://site.test");
    Object.assign(checkouts.get(p!.checkoutId)!, { status: "PAID", amount: 1 });
    expect(await confirmPayment(r.orderId)).toBe("en_attente");
  });
  it("marque l'échec d'un paiement refusé", async () => {
    const r = await order();
    const p = await createPayment({ id: r.orderId, number: r.number, totalCents: r.totalCents }, "https://site.test");
    checkouts.get(p!.checkoutId)!.status = "FAILED";
    expect(await confirmPayment(r.orderId)).toBe("echec");
  });
  it("ne fait rien sans clés SumUp installées", async () => {
    const key = process.env.SUMUP_API_KEY;
    delete process.env.SUMUP_API_KEY;
    const r = await order();
    expect(await createPayment({ id: r.orderId, number: r.number, totalCents: r.totalCents }, "https://site.test")).toBeNull();
    process.env.SUMUP_API_KEY = key;
  });
});
