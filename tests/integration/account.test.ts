import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkResetToken, deleteAccount, exportUserData, purgeExpiredData, requestPasswordReset, resetPassword } from "@/lib/server/account";
import { verifyPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const OUTBOX = process.env.MAIL_OUTBOX_DIR!;
const NOW = new Date("2026-11-23T10:00:00Z");

async function lastMail() {
  const files = (await readdir(OUTBOX)).sort();
  return readFile(path.join(OUTBOX, files[files.length - 1]), "utf8");
}
const tokenFrom = (mail: string) => /jeton=([A-Za-z0-9_-]+)/.exec(mail)![1];

const newUser = (email: string, extra: object = {}) =>
  db.user.create({ data: { email, passwordHash: "x", firstName: "Dominique", lastName: "Essai", adultCertifiedAt: NOW, ...extra } });

beforeEach(() => rm(OUTBOX, { recursive: true, force: true }));
afterAll(() => db.$disconnect());

describe("mot de passe oublié", () => {
  it("envoie un lien, qui change le mot de passe une seule fois et déconnecte les appareils", async () => {
    const u = await newUser("oubli@exemple.fr");
    await db.session.create({ data: { id: "s1", userId: u.id, expiresAt: new Date("2027-01-01") } });
    await requestPasswordReset("  OUBLI@exemple.fr ", "https://site.test", NOW);
    const mail = await lastMail();
    expect(mail).toContain("À : oubli@exemple.fr");
    expect(mail).toContain("https://site.test/compte/nouveau-mot-de-passe?jeton=");
    const token = tokenFrom(mail);
    expect((await resetPassword(token, "nouveau-secret", NOW)).ok).toBe(true);
    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verifyPassword(after.passwordHash, "nouveau-secret")).toBe(true);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await resetPassword(token, "autre-secret", NOW)).ok).toBe(false); // usage unique
  });
  it("refuse un lien expiré (plus d'une heure)", async () => {
    await newUser("expire@exemple.fr");
    await requestPasswordReset("expire@exemple.fr", "https://site.test", NOW);
    const token = tokenFrom(await lastMail());
    expect((await checkResetToken(token, new Date(NOW.getTime() + 59 * 60000))).ok).toBe(true);
    const late = await checkResetToken(token, new Date(NOW.getTime() + 61 * 60000));
    expect(late).toMatchObject({ ok: false });
  });
  it("ne révèle pas qu'une adresse n'a pas de compte (aucun e-mail, aucune erreur)", async () => {
    await expect(requestPasswordReset("inconnu@exemple.fr", "https://site.test", NOW)).resolves.toBeUndefined();
    await expect(readdir(OUTBOX)).rejects.toThrow();
  });
  it("refuse un jeton inventé", async () => {
    expect((await checkResetToken("n-importe-quoi", NOW)).ok).toBe(false);
  });
});

describe("droits RGPD", () => {
  it("exporte les données du compte et des commandes", async () => {
    const u = await newUser("export@exemple.fr", { phone: "0612345678", habitualTown: "Moulins" });
    await db.order.create({
      data: {
        number: "LCB-TEST-EXP1", userId: u.id, mode: "MARCHE", customerName: "Dominique Essai", customerEmail: u.email, phone: "0612345678",
        marketDate: "2026-11-29", marketTown: "Moulins", grossCents: 1500, discountCents: 0, totalCents: 1500, cgvVersion: "2026-11-21", cgvAcceptedAt: NOW,
        items: { create: { slug: "x", name: "Les Escures", domain: "Fabien Jouves", vintage: "2024", volumeCl: 75, unitCents: 1500, qty: 1, discountEligible: true, lineTotalCents: 1500 } },
      },
    });
    const d = await exportUserData(u.id);
    expect(d.compte).toMatchObject({ email: "export@exemple.fr", telephone: "0612345678", marcheHabituel: "Moulins" });
    expect(d.commandes[0]).toMatchObject({ numero: "LCB-TEST-EXP1", totalEuros: 15 });
    expect(JSON.stringify(d)).not.toContain("passwordHash");
  });
  it("supprime le compte mais garde les commandes (pièces comptables), sans lien au compte", async () => {
    const u = await newUser("suppr@exemple.fr");
    const o = await db.order.create({
      data: { number: "LCB-TEST-DEL1", userId: u.id, mode: "EXPEDITION", customerName: "Dominique Essai", customerEmail: u.email, phone: "0612345678", grossCents: 100, discountCents: 0, totalCents: 100, cgvVersion: "v", cgvAcceptedAt: NOW },
    });
    await db.session.create({ data: { id: "s-del", userId: u.id, expiresAt: new Date("2027-01-01") } });
    await deleteAccount(u.id);
    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: "s-del" } })).toBeNull();
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).userId).toBeNull();
  });
  it("efface les comptes inactifs depuis 3 ans, et seulement eux", async () => {
    const old = new Date("2023-06-01T00:00:00Z");
    const inactive = await newUser("inactif@exemple.fr", { createdAt: old, lastLoginAt: old });
    const recentLogin = await newUser("connecte@exemple.fr", { createdAt: old, lastLoginAt: new Date("2026-01-10") });
    const recentOrder = await newUser("client@exemple.fr", { createdAt: old, lastLoginAt: old });
    await db.order.create({
      data: { number: "LCB-TEST-REC1", userId: recentOrder.id, mode: "MARCHE", customerName: "x", customerEmail: "client@exemple.fr", phone: "0612345678", grossCents: 1, discountCents: 0, totalCents: 1, cgvVersion: "v", cgvAcceptedAt: NOW, createdAt: new Date("2025-05-01") },
    });
    const admin = await newUser("admin-vieux@exemple.fr", { createdAt: old, lastLoginAt: old, isAdmin: true });
    await purgeExpiredData(NOW);
    expect(await db.user.findUnique({ where: { id: inactive.id } })).toBeNull();
    for (const keep of [recentLogin, recentOrder, admin]) expect(await db.user.findUnique({ where: { id: keep.id } })).not.toBeNull();
  });
});
