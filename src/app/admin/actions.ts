"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { parsePrice, slugify } from "@/lib/rules/catalog-import";
import { generateGiftCode } from "@/lib/rules/giftcard";
import type { OrderStatus } from "@/lib/rules/orders";
import { DAYS, formatDateFr, parisNow, weekdayOf } from "@/lib/rules/paris-time";
import { formatEuros } from "@/lib/rules/pricing";
import { requireAdmin } from "@/lib/server/admin";
import { setOrderStatus } from "@/lib/server/admin-orders";
import { analyseImport, applyImport } from "@/lib/server/catalog-import";
import { db } from "@/lib/server/db";
import { sendMail } from "@/lib/server/mail";
import { paymentConfigured } from "@/lib/server/payment";
import { saveSetting } from "@/lib/server/settings";
import { resolveCommune } from "@/lib/server/zone";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

export type AdminState = { ok?: string; error?: string };

/* ------------------------------ Commandes ------------------------------ */

export async function changeOrderStatus(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const to = z.enum(["NOUVELLE", "CONFIRMEE", "PREPAREE", "REMISE", "ANNULEE"]).parse(form.get("status")) as OrderStatus;
  await setOrderStatus(id, to);
  revalidatePath("/admin", "layout");
}

export async function saveOrderNotes(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const d = z.object({ id: z.string(), shippingNote: z.string().max(500), adminNote: z.string().max(2000) }).parse(Object.fromEntries(form));
  await db.order.update({ where: { id: d.id }, data: { shippingNote: d.shippingNote || null, adminNote: d.adminNote || null } });
  revalidatePath(`/admin/commandes/${d.id}`);
  return { ok: "Enregistré." };
}

export async function markPrepared(form: FormData) {
  await requireAdmin();
  const date = String(form.get("date")), town = String(form.get("town"));
  const orders = await db.order.findMany({ where: { marketDate: date, marketTown: town, status: { in: ["NOUVELLE", "CONFIRMEE"] } }, select: { id: true } });
  for (const o of orders) await setOrderStatus(o.id, "PREPAREE");
  revalidatePath("/admin", "layout");
}

/* ------------------------------ Produits ------------------------------ */

const euros = z.string().trim().transform((v, ctx) => {
  const c = parsePrice(v);
  if (c === null || c <= 0) { ctx.addIssue({ code: "custom", message: "Prix illisible (ex. 13,50)." }); return z.NEVER; }
  return c;
});
const ProductForm = z.object({
  name: z.string().trim().min(1, "Le nom de la cuvée est obligatoire.").max(160),
  domain: z.string().trim().min(1, "Le domaine est obligatoire.").max(160),
  category: z.enum(["rouge", "blanc", "bulles", "doux", "liqueur", "biere", "sansalcool", "coffret", "accessoire"]),
  color: z.string().max(20),
  label: z.string().trim().max(80),
  region: z.string().trim().min(1, "La région est obligatoire.").max(80),
  appellation: z.string().trim().max(160),
  grapes: z.string().trim().max(300),
  vintage: z.string().trim().max(4).regex(/^((19|20)\d\d|NM|)$/, "Millésime : une année (ex. 2023) ou NM."),
  volumeCl: z.coerce.number().int().min(0).max(2000),
  price: euros,
  sugar: z.string().trim().max(40),
  style: z.string().trim().max(60),
  tag: z.enum(["", "NOUVEAUTE", "BEST_SELLER"]),
  noAddedSulfites: z.literal("on").optional(),
  available: z.literal("on").optional(),
  hidden: z.literal("on").optional(),
  discountEligible: z.literal("on").optional(),
});

export async function saveProduct(_: AdminState, form: FormData): Promise<AdminState & { id?: string }> {
  await requireAdmin();
  const p = ProductForm.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  const data = {
    name: d.name, domain: d.domain, category: d.category, color: d.color || d.category, label: d.label, region: d.region, appellation: d.appellation,
    grapes: d.grapes, vintage: d.vintage, volumeCl: d.volumeCl, priceCents: d.price, sugar: d.sugar || null, style: d.style || null,
    tag: d.tag || null, noAddedSulfites: !!d.noAddedSulfites, available: !!d.available, hidden: !!d.hidden, discountEligible: !!d.discountEligible,
    isBeer: d.category === "biere",
  };
  const id = String(form.get("id") || "");
  if (id) {
    await db.product.update({ where: { id }, data });
    revalidatePath("/", "layout");
    return { ok: "Produit enregistré.", id };
  }
  let slug = slugify(d.domain, d.name, d.vintage);
  for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = slugify(d.domain, d.name, d.vintage, String(i));
  const max = await db.product.aggregate({ _max: { sortOrder: true }, where: { kind: "PRODUIT" } });
  const created = await db.product.create({ data: { ...data, slug, sortOrder: Math.min(9999, (max._max.sortOrder ?? 0) + 1) } });
  revalidatePath("/", "layout");
  redirect(`/admin/produits/${created.id}?cree=1`);
}

export async function duplicateProduct(form: FormData) {
  await requireAdmin();
  const p = await db.product.findUniqueOrThrow({ where: { id: String(form.get("id")) } });
  const { id: _id, createdAt: _c, updatedAt: _u, slug: _s, ...rest } = p;
  let slug = slugify(p.domain, p.name, p.vintage, "copie");
  for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = slugify(p.domain, p.name, p.vintage, "copie", String(i));
  const copy = await db.product.create({ data: { ...rest, slug, name: `${p.name} (copie)`, hidden: true, sortOrder: p.sortOrder } });
  redirect(`/admin/produits/${copy.id}?copie=1`);
}

export async function toggleProduct(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const field = z.enum(["available", "hidden"]).parse(form.get("field"));
  const p = await db.product.findUniqueOrThrow({ where: { id } });
  await db.product.update({ where: { id }, data: { [field]: !p[field] } });
  revalidatePath("/", "layout");
}

/** Photo de bouteille : JPEG, PNG ou WebP, 3 Mo maximum, vérifiée par son contenu (pas seulement son nom). */
export async function uploadPhoto(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Choisissez une photo." };
  if (file.size > 3 * 1024 * 1024) return { error: "Photo trop lourde (3 Mo maximum). Réduisez-la avant de l'envoyer." };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime =
    buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" :
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "image/png" :
    buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
  if (!mime) return { error: "Format non reconnu : envoyez une photo JPEG, PNG ou WebP." };
  const old = await db.product.findUniqueOrThrow({ where: { id } });
  const photo = await db.productPhoto.create({ data: { mime, data: buf } });
  await db.product.update({ where: { id }, data: { photoUrl: `/photos/${photo.id}` } });
  if (old.photoUrl?.startsWith("/photos/")) await db.productPhoto.deleteMany({ where: { id: old.photoUrl.slice(8) } });
  revalidatePath("/", "layout");
  return { ok: "Photo enregistrée." };
}

export async function removePhoto(form: FormData) {
  await requireAdmin();
  const p = await db.product.findUniqueOrThrow({ where: { id: String(form.get("id")) } });
  await db.product.update({ where: { id: p.id }, data: { photoUrl: null } });
  if (p.photoUrl?.startsWith("/photos/")) await db.productPhoto.deleteMany({ where: { id: p.photoUrl.slice(8) } });
  revalidatePath("/", "layout");
}

/* ------------------------------ Import de la carte ------------------------------ */

export type ImportPreview = AdminState & {
  created?: number; updated?: number; missing?: { slug: string; name: string }[]; errors?: { line: number; message: string }[];
  missingColumns?: string[]; sample?: { name: string; domain: string; price: string }[]; done?: boolean;
};

export async function importCatalog(_: ImportPreview, form: FormData): Promise<ImportPreview> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choisissez un fichier CSV ou Excel." };
  try {
    const a = await analyseImport(file);
    if (a.missingColumns.length) return { error: `Colonnes obligatoires absentes : ${a.missingColumns.join(", ")}.`, missingColumns: a.missingColumns };
    if (!a.products.length) return { error: "Aucune ligne utilisable dans ce fichier.", errors: a.errors };
    if (form.get("confirm") === "1") {
      if (a.errors.length) return { error: "Corrigez d'abord les lignes en erreur." , errors: a.errors };
      await applyImport(a.products, form.get("hideMissing") === "on");
      revalidatePath("/", "layout");
      return { ok: `Carte importée : ${a.created} référence(s) ajoutée(s), ${a.updated} mise(s) à jour${form.get("hideMissing") === "on" ? `, ${a.missing.length} masquée(s)` : ""}.`, done: true };
    }
    return {
      created: a.created, updated: a.updated, missing: a.missing, errors: a.errors,
      sample: a.products.slice(0, 5).map((p) => ({ name: `${p.name}${p.vintage ? " " + p.vintage : ""}`, domain: p.domain, price: (p.priceCents / 100).toFixed(2).replace(".", ",") + " €" })),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fichier illisible." };
  }
}

/* ------------------------------ Marchés ------------------------------ */

const hoursRe = /^\d{1,2}h(\d{2})?-\d{1,2}h(\d{2})?$/;
const MarketForm = z.object({
  town: z.string().trim().min(1, "Indiquez la ville.").max(80),
  department: z.string().trim().regex(/^\d[\dAB]$/, "Département sur 2 chiffres (ex. 03)."),
  weekday: z.coerce.number().int().min(0).max(6),
  place: z.string().trim().min(1, "Indiquez le lieu.").max(160),
  hours: z.string().transform((v) => v.replace(/\s/g, "")).pipe(z.string().regex(hoursRe, "Horaires au format 8h-12h30.")),
  lon: z.coerce.number().min(-5).max(10).optional(),
  lat: z.coerce.number().min(41).max(52).optional(),
  active: z.literal("on").optional(),
});

/** Ajoute ou modifie un marché habituel. Sans coordonnées, la ville est localisée avec l'IGN. */
export async function saveMarket(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const raw = Object.fromEntries(form);
  const p = MarketForm.safeParse({ ...raw, lon: raw.lon || undefined, lat: raw.lat || undefined });
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  let { lon, lat } = d;
  if (lon === undefined || lat === undefined) {
    const existing = await db.market.findFirst({ where: { town: d.town }, select: { lon: true, lat: true } });
    if (existing) ({ lon, lat } = existing);
    else {
      const c = await resolveCommune(`${d.town} (${d.department})`);
      if (c.status !== "ok") return { error: "Ville introuvable : vérifiez l'orthographe et le département, ou indiquez la longitude et la latitude." };
      ({ lon, lat } = c.hit);
    }
  }
  const data = { town: d.town, department: d.department, weekday: d.weekday, place: d.place, hours: d.hours, lon: lon!, lat: lat!, active: !!d.active };
  const id = String(form.get("id") || "");
  if (id) await db.market.update({ where: { id }, data });
  else await db.market.create({ data: { ...data, active: true } });
  revalidatePath("/", "layout");
  return { ok: id ? "Marché enregistré." : "Marché ajouté." };
}

export async function deleteMarket(form: FormData) {
  await requireAdmin();
  await db.market.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/", "layout");
}

const ExceptionForm = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("EXCEPTIONNEL"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date."),
    town: z.string().trim().min(1, "Indiquez la ville.").max(80),
    place: z.string().trim().min(1, "Indiquez le lieu.").max(160),
    hours: z.string().transform((v) => v.replace(/\s/g, "")).pipe(z.string().regex(hoursRe, "Horaires au format 9h-19h.")),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({ kind: z.literal("ANNULE"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date."), marketId: z.string().min(1, "Choisissez le marché annulé."), note: z.string().trim().max(200).optional() }),
]);

export async function addException(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const p = ExceptionForm.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  if (d.kind === "ANNULE") {
    const m = await db.market.findUnique({ where: { id: d.marketId } });
    if (!m) return { error: "Marché introuvable." };
    if (weekdayOf(d.date) !== m.weekday) return { error: `Le ${formatDateFr(d.date)} n'est pas un jour de marché à ${m.town} (${DAYS[m.weekday].toLowerCase()}).` };
    const orders = await db.order.count({ where: { marketDate: d.date, marketTown: m.town, status: { not: "ANNULEE" } } });
    await db.marketException.create({ data: { kind: "ANNULE", date: d.date, town: m.town, place: m.place, hours: m.hours, marketId: m.id, note: d.note || null } });
    revalidatePath("/", "layout");
    return { ok: orders ? `Marché annulé. Attention : ${orders} commande(s) étaient prévues ce jour-là, prévenez les clients (voir Commandes).` : "Marché annulé : il n'est plus proposé aux clients." };
  }
  const known = await db.market.findFirst({ where: { town: d.town }, select: { lon: true, lat: true } });
  let coords = known;
  if (!coords) {
    const c = await resolveCommune(d.town);
    coords = c.status === "ok" ? { lon: c.hit.lon, lat: c.hit.lat } : null;
  }
  await db.marketException.create({ data: { kind: "EXCEPTIONNEL", date: d.date, town: d.town, place: d.place, hours: d.hours, note: d.note || null, lon: coords?.lon ?? null, lat: coords?.lat ?? null } });
  revalidatePath("/", "layout");
  return { ok: "Marché exceptionnel ajouté." };
}

export async function deleteException(form: FormData) {
  await requireAdmin();
  await db.marketException.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/", "layout");
}

export async function deletePastExceptions() {
  await requireAdmin();
  await db.marketException.deleteMany({ where: { date: { lt: parisNow(new Date()).date } } });
  revalidatePath("/", "layout");
}

/* ------------------------------ Devis ------------------------------ */

export async function setQuoteStatus(form: FormData) {
  await requireAdmin();
  const status = z.enum(["nouvelle", "en cours", "traitée"]).parse(form.get("status"));
  await db.quote.update({ where: { id: String(form.get("id")) }, data: { status } });
  revalidatePath("/admin", "layout");
}

/* ------------------------------ Cartes cadeaux ------------------------------ */

const GiftForm = z.object({
  amount: euros,
  buyerName: z.string().trim().max(120).optional(),
  recipientEmail: z.string().trim().toLowerCase().max(200).optional().refine((v) => !v || z.email().safeParse(v).success, "Adresse e-mail du bénéficiaire invalide."),
  expiresAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function createGiftCard(_: AdminState & { code?: string }, form: FormData): Promise<AdminState & { code?: string }> {
  await requireAdmin();
  const p = GiftForm.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  let code = generateGiftCode((n) => randomBytes(n));
  while (await db.giftCard.findUnique({ where: { code } })) code = generateGiftCode((n) => randomBytes(n));
  const amount = formatEuros(d.amount);
  const expires = d.expiresAt ? new Date(d.expiresAt + "T23:59:59+01:00") : null;
  await db.giftCard.create({ data: { code, initialCents: d.amount, balanceCents: d.amount, buyerName: d.buyerName || null, recipientEmail: d.recipientEmail || null, expiresAt: expires, note: d.note || null } });
  if (d.recipientEmail) {
    await sendMail({
      to: d.recipientEmail,
      subject: "Votre carte cadeau La Cave Buissonnière",
      text: `Bonjour,\n\n${d.buyerName ? d.buyerName + " vous offre" : "Vous avez reçu"} une carte cadeau La Cave Buissonnière de ${amount}.\n\nVotre code : ${code}\n${expires ? `Valable jusqu'au ${expires.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.\n` : ""}\nChoisissez parmi les vins, les articles de cave et les prestations (dégustation à domicile, atelier…) : sur le site, saisissez le code au moment de commander, ou présentez-le sur un marché.\n\nÀ bientôt,\nGuillaume, La Cave Buissonnière`,
    });
  }
  revalidatePath("/admin/cartes-cadeaux");
  return { ok: d.recipientEmail ? `Carte créée et envoyée à ${d.recipientEmail}.` : "Carte créée.", code };
}

export async function setGiftCardDisabled(form: FormData) {
  await requireAdmin();
  await db.giftCard.update({ where: { id: String(form.get("id")) }, data: { disabled: form.get("disabled") === "1" } });
  revalidatePath("/admin/cartes-cadeaux");
}

/** Utilisation au marché : Guillaume déduit un montant du solde. */
export async function applyGiftCardAtMarket(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const p = z.object({ id: z.string(), amount: euros }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const r = await db.giftCard.updateMany({ where: { id: p.data.id, balanceCents: { gte: p.data.amount }, disabled: false }, data: { balanceCents: { decrement: p.data.amount } } });
  if (!r.count) return { error: "Solde insuffisant ou carte désactivée." };
  const c = await db.giftCard.findUniqueOrThrow({ where: { id: p.data.id } });
  await db.giftCard.update({ where: { id: c.id }, data: { note: `${c.note ? c.note + "\n" : ""}${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} : ${formatEuros(p.data.amount)} utilisés au marché` } });
  revalidatePath("/admin/cartes-cadeaux");
  return { ok: `${formatEuros(p.data.amount)} déduits. Nouveau solde : ${formatEuros(c.balanceCents)}.` };
}

/* ------------------------------ Réglages ------------------------------ */

const SettingsForms = {
  commerce: z.object({
    deliveryRadiusKm: z.coerce.number().int().min(1, "Rayon de livraison : au moins 1 km.").max(300),
    discountPercent: z.coerce.number().min(0).max(50),
    discountMinQty: z.coerce.number().int().min(2).max(60),
    cutoffHour: z.coerce.number().int().min(0, "Heure limite entre 0 et 23 h.").max(23),
    paymentMethods: z.string().trim().min(3).max(120),
    giftCardAmounts: z.string().transform((v) => v.split(/[;, ]+/).map((x) => Number(x.replace(",", "."))).filter((x) => x > 0)),
    bannerText: z.string().trim().max(200),
  }),
  contact: z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().min(10).max(20), email: z.string().trim().pipe(z.email()), facebook: z.string().trim().url().or(z.literal("")) }),
  legal: z.object({
    siret: z.string().trim().max(40), rcs: z.string().trim().max(80), vat: z.string().trim().max(40), kbisChecked: z.literal("on").optional(),
    licenceNumber: z.string().trim().max(80), licenceTown: z.string().trim().max(80), hostName: z.string().trim().max(160), hostAddress: z.string().trim().max(300),
    hostPhone: z.string().trim().max(40), mediatorName: z.string().trim().max(160), mediatorAddress: z.string().trim().max(300), mediatorWebsite: z.string().trim().max(200),
    giftCardValidity: z.string().trim().max(80), emailProvider: z.string().trim().max(160), dataLocation: z.string().trim().max(160),
  }),
  payment: z.object({ enabled: z.literal("on").optional() }),
};

export async function saveSettings(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const group = z.enum(["commerce", "contact", "legal", "payment"]).parse(form.get("group"));
  const p = SettingsForms[group].safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (group === "commerce") {
    const d = p.data as z.infer<typeof SettingsForms.commerce>;
    await Promise.all([
      saveSetting("deliveryRadiusKm", d.deliveryRadiusKm), saveSetting("discountPercent", d.discountPercent), saveSetting("discountMinQty", d.discountMinQty),
      saveSetting("cutoffHour", d.cutoffHour), saveSetting("paymentMethods", d.paymentMethods), saveSetting("bannerText", d.bannerText),
      saveSetting("giftCardAmounts", d.giftCardAmounts.length ? d.giftCardAmounts : DEFAULT_SETTINGS.giftCardAmounts),
    ]);
  } else if (group === "contact") {
    const d = p.data as z.infer<typeof SettingsForms.contact>;
    const digits = d.phone.replace(/\D/g, "");
    await saveSetting("contact", { ...d, phoneIntl: digits.startsWith("0") ? "+33" + digits.slice(1) : "+" + digits });
  } else if (group === "legal") {
    const d = p.data as z.infer<typeof SettingsForms.legal>;
    await saveSetting("legal", { ...d, kbisChecked: !!d.kbisChecked });
  } else {
    const enabled = !!(p.data as { enabled?: "on" }).enabled;
    if (enabled && !paymentConfigured()) return { error: "Le paiement en ligne ne peut pas être activé : les clés SumUp ne sont pas encore installées sur le serveur." };
    await saveSetting("onlinePayment", { enabled, provider: enabled ? "sumup" : "" });
  }
  revalidatePath("/", "layout");
  return { ok: "Réglages enregistrés." };
}
