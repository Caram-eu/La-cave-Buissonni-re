/**
 * Modèles des e-mails automatiques (fonctions pures, testées).
 * Chaque e-mail a une version texte et une version HTML simple (styles en ligne, compatibles messageries).
 */
import { formatHours } from "./rules/markets";
import { formatDateFr } from "./rules/paris-time";
import { formatEuros } from "./rules/pricing";

export type EmailContent = { subject: string; text: string; html: string };

type Contact = { name: string; phone: string; email: string };

export type OrderForEmail = {
  number: string;
  mode: "MARCHE" | "LIVRAISON" | "EXPEDITION";
  customerName: string;
  customerEmail: string;
  phone: string;
  marketDate: string | null;
  marketTown: string | null;
  marketPlace: string | null;
  marketHours: string | null;
  address: string | null;
  city: string | null;
  distanceKm: number | null;
  note: string;
  grossCents: number;
  discountCents: number;
  giftCardCents: number;
  totalCents: number;
  paymentMethod: "A_LA_REMISE" | "EN_LIGNE";
  items: { name: string; domain: string; vintage: string; qty: number; unitCents: number; lineTotalCents: number }[];
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const vint = (v: string) => (v && v !== "NM" ? ` ${v}` : "");

function layout(site: string, title: string, body: string, contact: Contact): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f6ee;font-family:Helvetica,Arial,sans-serif;color:#2d3e46">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6ee"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="padding:18px 24px;border-bottom:4px solid #89ba13"><img src="${site}/logo.png" alt="La Cave Buissonnière" width="110" style="display:block;height:auto"></td></tr>
<tr><td style="padding:22px 24px;font-size:15px;line-height:1.55">
<h1 style="font-size:22px;margin:0 0 14px;color:#2d3e46">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 24px;background:#2d3e46;color:#f4f7f2;font-size:13px;line-height:1.5">
${esc(contact.name)}, La Cave Buissonnière · Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre<br>
${esc(contact.phone)} · <a href="mailto:${esc(contact.email)}" style="color:#d6ec9e">${esc(contact.email)}</a> · <a href="${site}" style="color:#d6ec9e">${esc(site.replace(/^https?:\/\//, ""))}</a><br>
<span style="color:#c3d0d4">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</span>
</td></tr></table></td></tr></table></body></html>`;
}

export function deliveryLine(o: OrderForEmail): string {
  if (o.mode === "MARCHE") return `Retrait au marché de ${o.marketTown}, ${o.marketPlace}, le ${o.marketDate ? formatDateFr(o.marketDate) : ""} (${formatHours(o.marketHours ?? "")})`;
  if (o.mode === "LIVRAISON") return `Livraison à domicile : ${o.address}, ${o.city}`;
  return `Expédition UPS : ${o.address}`;
}

function itemsText(o: OrderForEmail) {
  const lines = o.items.map((i) => `- ${i.qty} × ${i.name}${vint(i.vintage)} (${i.domain}) : ${formatEuros(i.lineTotalCents)}`);
  if (o.discountCents) lines.push(`Remise : −${formatEuros(o.discountCents)}`);
  if (o.giftCardCents) lines.push(`Carte cadeau : −${formatEuros(o.giftCardCents)}`);
  lines.push(`Total à régler : ${formatEuros(o.totalCents)}${o.mode !== "MARCHE" ? " (hors frais de livraison ou d'expédition)" : ""}`);
  return lines.join("\n");
}

function itemsHtml(o: OrderForEmail) {
  const row = (l: string, r: string, bold = false) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e1${bold ? ";font-weight:bold" : ""}">${l}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #dfe5e1;white-space:nowrap${bold ? ";font-weight:bold" : ""}">${r}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin:10px 0 16px">${o.items
    .map((i) => row(`<b>${i.qty} ×</b> ${esc(i.name)}${esc(vint(i.vintage))}<br><span style="color:#5b6d75;font-size:13px">${esc(i.domain)} · ${formatEuros(i.unitCents)}</span>`, formatEuros(i.lineTotalCents)))
    .join("")}${o.discountCents ? row("Remise 6 bouteilles", `−${formatEuros(o.discountCents)}`) : ""}${o.giftCardCents ? row("Carte cadeau", `−${formatEuros(o.giftCardCents)}`) : ""}${row(
    `Total à régler${o.mode !== "MARCHE" ? ' <span style="font-weight:normal;color:#5b6d75">(hors frais)</span>' : ""}`,
    formatEuros(o.totalCents),
    true,
  )}</table>`;
}

/** Confirmation envoyée au client après sa commande. */
export function orderConfirmation(o: OrderForEmail, ctx: { site: string; contact: Contact; paymentMethods: string; cutoffHour: number }): EmailContent {
  const first = o.customerName.split(" ")[0];
  const pay =
    o.paymentMethod === "EN_LIGNE"
      ? "Paiement en ligne par carte bancaire (SumUp)."
      : `Paiement lors du ${o.mode === "MARCHE" ? "retrait" : "la livraison"} (${ctx.paymentMethods}).`;
  const next =
    o.mode === "MARCHE"
      ? "Je prépare votre commande et je vous l'apporte au marché. Pensez à une pièce d'identité : elle peut vous être demandée."
      : o.mode === "LIVRAISON"
        ? "Je vous appelle pour convenir du jour de livraison et des frais. Si ces frais ne vous conviennent pas, vous pourrez annuler sans frais."
        : "Je vous appelle pour la procédure d'expédition (UPS, départs le mardi et le mercredi) et les frais. S'ils ne vous conviennent pas, vous pourrez annuler sans frais.";
  const text = `Bonjour ${first},

Merci pour votre commande ${o.number}, bien enregistrée.

${deliveryLine(o)}
${itemsText(o)}

${pay}
${next}

Droit de rétractation : 14 jours à compter de la remise des produits (conditions : ${ctx.site}/cgv).
Une question ou un changement ? Répondez à cet e-mail ou appelez-moi au ${ctx.contact.phone}.

À très bientôt,
Guillaume, La Cave Buissonnière

L'abus d'alcool est dangereux pour la santé, à consommer avec modération.`;
  const html = layout(
    ctx.site,
    `Merci ${first}, votre commande est enregistrée`,
    `<p style="margin:0 0 10px">Commande <b>${esc(o.number)}</b></p>
<p style="margin:0 0 6px;padding:10px 12px;background:#f3f6ee;border-left:5px solid #89ba13;border-radius:8px">${esc(deliveryLine(o))}</p>
${itemsHtml(o)}
<p style="margin:0 0 10px">${esc(pay)}</p>
<p style="margin:0 0 10px">${esc(next)}</p>
<p style="margin:0 0 10px;font-size:13px;color:#5b6d75">Droit de rétractation de 14 jours à compter de la remise des produits : voir les <a href="${ctx.site}/cgv" style="color:#4f6d08">conditions générales de vente</a>.</p>
<p style="margin:0">Une question ou un changement ? Répondez à cet e-mail ou appelez-moi au ${esc(ctx.contact.phone)}.<br>À très bientôt,<br>Guillaume</p>`,
    ctx.contact,
  );
  return { subject: `Votre commande ${o.number} est enregistrée`, text, html };
}

/** Alerte envoyée à Guillaume pour chaque nouvelle commande, avec le téléphone du client. */
export function orderAlert(o: OrderForEmail & { id: string }, ctx: { site: string; contact: Contact }): EmailContent {
  const where = o.mode === "MARCHE" ? `${o.marketTown}, ${o.marketDate ? formatDateFr(o.marketDate) : ""}` : o.mode === "LIVRAISON" ? `livraison ${o.city}${o.distanceKm != null ? ` (${o.distanceKm} km)` : ""}` : "expédition UPS";
  const text = `Nouvelle commande ${o.number} : ${o.customerName}, ${where}.

Client : ${o.customerName}
Téléphone : ${o.phone}
E-mail : ${o.customerEmail}
${deliveryLine(o)}
${o.note ? `Message : ${o.note}\n` : ""}
${itemsText(o)}
Paiement : ${o.paymentMethod === "EN_LIGNE" ? "en ligne" : "à la remise"}

Voir la commande : ${ctx.site}/admin/commandes/${o.id}`;
  const html = layout(
    ctx.site,
    `Nouvelle commande : ${o.customerName}`,
    `<p style="margin:0 0 10px"><b>${esc(o.number)}</b> · ${esc(where)}</p>
<p style="margin:0 0 10px">Téléphone : <a href="tel:${esc(o.phone.replace(/[^+\d]/g, ""))}" style="color:#4f6d08;font-weight:bold">${esc(o.phone)}</a><br>E-mail : ${esc(o.customerEmail)}</p>
<p style="margin:0 0 6px">${esc(deliveryLine(o))}</p>
${o.note ? `<p style="margin:0 0 6px;padding:8px 10px;background:#fff7e0;border-radius:8px">Message : ${esc(o.note)}</p>` : ""}
${itemsHtml(o)}
<p style="margin:0"><a href="${ctx.site}/admin/commandes/${o.id}" style="display:inline-block;background:#89ba13;color:#1b2a10;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Voir la commande</a></p>`,
    ctx.contact,
  );
  return { subject: `Nouvelle commande ${o.number} : ${o.customerName} (${where})`, text, html };
}

/** Rappel envoyé au client la veille du retrait au marché. */
export function marketReminder(o: OrderForEmail, ctx: { site: string; contact: Contact; paymentMethods: string }): EmailContent {
  const first = o.customerName.split(" ")[0];
  const when = `demain, ${o.marketDate ? formatDateFr(o.marketDate) : ""}, ${formatHours(o.marketHours ?? "")}`;
  const text = `Bonjour ${first},

Petit rappel : votre commande ${o.number} vous attend ${when}, au marché de ${o.marketTown} (${o.marketPlace}).

${itemsText(o)}

${o.paymentMethod === "EN_LIGNE" ? "Commande réglée en ligne." : `Règlement sur place : ${ctx.paymentMethods}.`} Une pièce d'identité peut vous être demandée.
Empêchement ? Prévenez-moi au ${ctx.contact.phone} ou en répondant à cet e-mail.

À demain,
Guillaume`;
  const html = layout(
    ctx.site,
    `À demain au marché de ${o.marketTown} !`,
    `<p style="margin:0 0 10px">Bonjour ${esc(first)}, votre commande <b>${esc(o.number)}</b> vous attend <b>${esc(when)}</b>, ${esc(o.marketPlace ?? "")}.</p>
${itemsHtml(o)}
<p style="margin:0 0 10px">${o.paymentMethod === "EN_LIGNE" ? "Commande réglée en ligne." : `Règlement sur place : ${esc(ctx.paymentMethods)}.`} Une pièce d'identité peut vous être demandée.</p>
<p style="margin:0">Empêchement ? Prévenez-moi au ${esc(ctx.contact.phone)} ou répondez à cet e-mail.<br>À demain,<br>Guillaume</p>`,
    ctx.contact,
  );
  return { subject: `Rappel : votre commande vous attend demain au marché de ${o.marketTown}`, text, html };
}

export function giftCardEmail(d: { code: string; amountCents: number; buyerName?: string | null; expiresAt?: Date | null }, ctx: { site: string; contact: Contact }): EmailContent {
  const from = d.buyerName ? `${d.buyerName} vous offre` : "Vous avez reçu";
  const until = d.expiresAt ? `Valable jusqu'au ${d.expiresAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.` : "";
  const text = `Bonjour,

${from} une carte cadeau La Cave Buissonnière de ${formatEuros(d.amountCents)}.

Votre code : ${d.code}
${until}

Choisissez parmi les vins, les articles de cave et les prestations (dégustation à domicile, atelier…) : sur ${ctx.site}, saisissez le code au moment de commander, ou présentez-le sur un marché.

À bientôt,
Guillaume, La Cave Buissonnière`;
  const html = layout(
    ctx.site,
    `${from} une carte cadeau de ${formatEuros(d.amountCents)}`,
    `<p style="margin:0 0 14px">Votre code :</p>
<p style="margin:0 0 14px;font-size:26px;font-weight:bold;letter-spacing:2px;padding:14px;background:#2d3e46;color:#ffffff;text-align:center;border-radius:12px">${esc(d.code)}</p>
${until ? `<p style="margin:0 0 10px">${esc(until)}</p>` : ""}
<p style="margin:0 0 10px">Choisissez parmi les vins, les articles de cave et les prestations : dégustation à domicile, atelier… Saisissez le code au moment de commander sur <a href="${ctx.site}/vins" style="color:#4f6d08">le site</a>, ou présentez-le sur un marché.</p>
<p style="margin:0">À bientôt,<br>Guillaume</p>`,
    ctx.contact,
  );
  return { subject: "Votre carte cadeau La Cave Buissonnière", text, html };
}

export function passwordResetEmail(d: { firstName: string; link: string }, ctx: { site: string; contact: Contact }): EmailContent {
  const text = `Bonjour ${d.firstName},

Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure, utilisable une seule fois) :
${d.link}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.

Guillaume, La Cave Buissonnière`;
  const html = layout(
    ctx.site,
    "Choisir un nouveau mot de passe",
    `<p style="margin:0 0 14px">Bonjour ${esc(d.firstName)}, cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien est valable 1 heure et ne sert qu'une fois.</p>
<p style="margin:0 0 14px"><a href="${esc(d.link)}" style="display:inline-block;background:#89ba13;color:#1b2a10;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Choisir mon mot de passe</a></p>
<p style="margin:0;font-size:13px;color:#5b6d75">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>`,
    ctx.contact,
  );
  return { subject: "Réinitialisation de votre mot de passe, La Cave Buissonnière", text, html };
}

export type QuoteForEmail = { type: string; date?: string | null; guests?: number | null; place?: string | null; budget?: string | null; message: string; name: string; phone?: string | null; email?: string | null };

export function quoteAlert(q: QuoteForEmail, ctx: { site: string; contact: Contact }): EmailContent {
  const date = q.date ? new Date(q.date + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", dateStyle: "long" }) : "à définir";
  const lines = [
    `Type : ${q.type}`, `Date : ${date}`, `Personnes : ${q.guests ?? "à définir"}`, `Lieu : ${q.place || "à définir"}`, `Budget : ${q.budget || "non précisé"}`,
    "", q.message, "", `${q.name}`, `Téléphone : ${q.phone || "-"}`, `E-mail : ${q.email || "-"}`,
  ];
  const text = `Nouvelle demande de devis.\n\n${lines.join("\n")}\n\nVoir les demandes : ${ctx.site}/admin/devis`;
  const html = layout(
    ctx.site,
    `Demande de devis : ${q.type}`,
    `<p style="margin:0 0 10px"><b>${esc(q.name)}</b>${q.phone ? ` · <a href="tel:${esc(q.phone.replace(/[^+\d]/g, ""))}" style="color:#4f6d08">${esc(q.phone)}</a>` : ""}${q.email ? ` · ${esc(q.email)}` : ""}</p>
<p style="margin:0 0 10px">Date : ${esc(date)} · ${esc(String(q.guests ?? "nombre à définir"))} personnes · ${esc(q.place || "lieu à définir")}${q.budget ? ` · budget ${esc(q.budget)}` : ""}</p>
${q.message ? `<p style="margin:0 0 12px;white-space:pre-wrap;padding:10px 12px;background:#f3f6ee;border-radius:8px">${esc(q.message)}</p>` : ""}
<p style="margin:0"><a href="${ctx.site}/admin/devis" style="display:inline-block;background:#89ba13;color:#1b2a10;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Voir les demandes</a></p>`,
    ctx.contact,
  );
  return { subject: `Demande de devis : ${q.type} (${q.name})`, text, html };
}
