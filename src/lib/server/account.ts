import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { hashPassword } from "./auth";
import { passwordResetEmail } from "../emails";
import { sendMail } from "./mail";
import { getSettings } from "./settings";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const RESET_MINUTES = 60;
export const INACTIVITY_YEARS = 3;

/**
 * Mot de passe oublié : crée un lien à usage unique valable 1 heure et l'envoie par e-mail.
 * Ne révèle jamais si l'adresse a un compte (même réponse dans tous les cas).
 */
export async function requestPasswordReset(email: string, siteUrl: string, now = new Date()) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return;
  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }); // un seul lien valable à la fois
  await db.passwordReset.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(now.getTime() + RESET_MINUTES * 60000) } });
  const link = `${siteUrl.replace(/\/$/, "")}/compte/nouveau-mot-de-passe?jeton=${token}`;
  const s = await getSettings();
  await sendMail({ to: user.email, toName: user.firstName, ...passwordResetEmail({ firstName: user.firstName, link }, { site: siteUrl.replace(/\/$/, ""), contact: s.contact }), kind: "mot-de-passe" });
}

export type ResetCheck = { ok: true; userId: string } | { ok: false; error: string };

export async function checkResetToken(token: string, now = new Date()): Promise<ResetCheck> {
  if (!token || token.length > 100) return { ok: false, error: "Ce lien n'est pas valable." };
  const r = await db.passwordReset.findUnique({ where: { id: sha256(token) } });
  if (!r) return { ok: false, error: "Ce lien n'est pas valable. Demandez-en un nouveau." };
  if (r.usedAt) return { ok: false, error: "Ce lien a déjà servi. Demandez-en un nouveau si besoin." };
  if (r.expiresAt < now) return { ok: false, error: "Ce lien a expiré (validité 1 heure). Demandez-en un nouveau." };
  return { ok: true, userId: r.userId };
}

/** Change le mot de passe avec un lien valable, puis déconnecte tous les appareils. */
export async function resetPassword(token: string, newPassword: string, now = new Date()): Promise<ResetCheck> {
  const c = await checkResetToken(token, now);
  if (!c.ok) return c;
  const hash = await hashPassword(newPassword);
  await db.$transaction([
    db.passwordReset.update({ where: { id: sha256(token) }, data: { usedAt: now } }),
    db.user.update({ where: { id: c.userId }, data: { passwordHash: hash } }),
    db.session.deleteMany({ where: { userId: c.userId } }),
  ]);
  return c;
}

/** Données personnelles d'un client (droit d'accès et de portabilité, RGPD). */
export async function exportUserData(userId: string) {
  const u = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { orders: { include: { items: true }, orderBy: { createdAt: "asc" } } },
  });
  return {
    exporteLe: new Date().toISOString(),
    responsable: "Guillaume Plantard, EI, La Cave Buissonnière, Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre",
    compte: {
      prenom: u.firstName, nom: u.lastName, email: u.email, telephone: u.phone, marcheHabituel: u.habitualTown,
      lettreInformation: u.newsletter, attestationMajorite: u.adultCertifiedAt, creeLe: u.createdAt, derniereConnexion: u.lastLoginAt,
    },
    commandes: u.orders.map((o) => ({
      numero: o.number, date: o.createdAt, statut: o.status, mode: o.mode, telephone: o.phone,
      marche: o.marketDate ? { date: o.marketDate, ville: o.marketTown, lieu: o.marketPlace, horaires: o.marketHours } : null,
      adresse: o.address, commune: o.city, message: o.note,
      articles: o.items.map((i) => ({ produit: i.name, domaine: i.domain, millesime: i.vintage, quantite: i.qty, prixUnitaireEuros: i.unitCents / 100, totalEuros: i.lineTotalCents / 100 })),
      remiseEuros: o.discountCents / 100, carteCadeauEuros: o.giftCardCents / 100, totalEuros: o.totalCents / 100,
      cgvAcceptees: { version: o.cgvVersion, le: o.cgvAcceptedAt },
    })),
  };
}

/**
 * Supprime le compte : identité, mot de passe, sessions, préférences.
 * Les commandes restent (pièces comptables, 10 ans) mais ne sont plus reliées au compte.
 */
export async function deleteAccount(userId: string) {
  await db.$transaction([db.order.updateMany({ where: { userId }, data: { userId: null } }), db.user.delete({ where: { id: userId } })]);
}

/**
 * Durées de conservation de la politique de confidentialité :
 * compte supprimé après 3 ans sans connexion ni commande ; sessions et liens expirés effacés.
 * À lancer chaque jour (tâche planifiée, étape « Déploiement »).
 */
export async function purgeExpiredData(now = new Date()) {
  const limit = new Date(now);
  limit.setFullYear(limit.getFullYear() - INACTIVITY_YEARS);
  const inactive = await db.user.findMany({
    where: {
      isAdmin: false,
      createdAt: { lt: limit },
      OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: limit } }],
      orders: { none: { createdAt: { gte: limit } } },
    },
    select: { id: true },
  });
  for (const u of inactive) await deleteAccount(u.id);
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const resets = await db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } });
  const limits = await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  return { accounts: inactive.length, sessions: sessions.count, resets: resets.count, rateLimits: limits.count };
}
