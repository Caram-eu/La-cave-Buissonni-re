"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAccount, requestPasswordReset, resetPassword } from "@/lib/server/account";
import { createSession, currentUser, destroyAllSessions, destroySession, hashPassword, verifyPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export type FormState = { error?: string };

const safeNext = (n: FormDataEntryValue | null) => (typeof n === "string" && /^\/[a-z0-9/?=&-]*$/i.test(n) && !n.startsWith("//") ? n : "/compte");

const Signup = z
  .object({
    firstName: z.string().trim().min(1, "Indiquez votre prénom et votre nom.").max(80),
    lastName: z.string().trim().min(1, "Indiquez votre prénom et votre nom.").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Cette adresse e-mail ne semble pas valide.")),
    phone: z.string().trim().max(20).optional().transform((v) => v || null),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(200),
    password2: z.string(),
    habitualTown: z.string().trim().max(80).optional().transform((v) => v || null),
    adult: z.literal("on", "La vente d'alcool est réservée aux personnes majeures : cochez la case « 18 ans ou plus »."),
    newsletter: z.literal("on").optional(),
  })
  .refine((d) => d.password === d.password2, { message: "Les deux mots de passe ne correspondent pas." });

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!(await rateLimit(`inscription:${ip}`, 20, 3600))) return { error: "Trop de tentatives. Réessayez dans une heure." };
  const p = Signup.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return { error: "Un compte existe déjà avec cette adresse. Connectez-vous." };
  const user = await db.user.create({
    data: {
      email: d.email, passwordHash: await hashPassword(d.password), firstName: d.firstName, lastName: d.lastName, phone: d.phone,
      habitualTown: d.habitualTown, newsletter: !!d.newsletter, adultCertifiedAt: new Date(), lastLoginAt: new Date(),
    },
  });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

const Login = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const d = Login.parse(Object.fromEntries(form));
  const ip = await clientIp();
  // limite par adresse IP et par compte visé
  if (!(await rateLimit(`connexion:ip:${ip}`, 20, 900)) || !(await rateLimit(`connexion:mail:${d.email}`, 8, 900)))
    return { error: "Trop de tentatives de connexion. Patientez 15 minutes ou utilisez « mot de passe oublié »." };
  const user = await db.user.findUnique({ where: { email: d.email } });
  const ok = user ? await verifyPassword(user.passwordHash, d.password) : (await hashPassword("leurre"), false); // même durée si le compte n'existe pas
  if (!user || !ok) return { error: "E-mail ou mot de passe incorrect." };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/compte");
}

/* ---------------- Étape 3 : gestion du compte ---------------- */

async function mustUser() {
  const u = await currentUser();
  if (!u) redirect("/compte");
  return u;
}

const Profile = z.object({
  firstName: z.string().trim().min(1, "Indiquez votre prénom et votre nom.").max(80),
  lastName: z.string().trim().min(1, "Indiquez votre prénom et votre nom.").max(80),
  phone: z.string().trim().max(20).optional().transform((v) => v || null),
  habitualTown: z.string().trim().max(80).optional().transform((v) => v || null),
  newsletter: z.literal("on").optional(),
});

export type SaveState = { error?: string; ok?: string };

export async function updateProfile(_: SaveState, form: FormData): Promise<SaveState> {
  const u = await mustUser();
  const p = Profile.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (p.data.phone && !/^[+0-9 .()-]{10,20}$/.test(p.data.phone)) return { error: "Ce numéro de téléphone ne semble pas valide." };
  if (p.data.habitualTown && !(await db.market.findFirst({ where: { town: p.data.habitualTown, active: true } }))) return { error: "Ce marché n'existe pas." };
  await db.user.update({ where: { id: u.id }, data: { ...p.data, newsletter: !!p.data.newsletter } });
  revalidatePath("/", "layout");
  return { ok: "Vos informations sont enregistrées." };
}

const PwChange = z
  .object({ current: z.string().max(200), password: z.string().min(8, "Le nouveau mot de passe doit faire au moins 8 caractères.").max(200), password2: z.string() })
  .refine((d) => d.password === d.password2, { message: "Les deux mots de passe ne correspondent pas." });

export async function changePassword(_: SaveState, form: FormData): Promise<SaveState> {
  const u = await mustUser();
  if (!(await rateLimit(`motdepasse:${u.id}`, 8, 900))) return { error: "Trop de tentatives. Patientez 15 minutes." };
  const p = PwChange.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (!(await verifyPassword(u.passwordHash, p.data.current))) return { error: "Le mot de passe actuel est incorrect." };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(p.data.password) } });
  // déconnecte les autres appareils, garde celui-ci connecté
  await destroyAllSessions(u.id);
  await createSession(u.id);
  return { ok: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
}

export async function deleteMyAccount(_: SaveState, form: FormData): Promise<SaveState> {
  const u = await mustUser();
  if (!(await rateLimit(`suppression:${u.id}`, 8, 900))) return { error: "Trop de tentatives. Patientez 15 minutes." };
  const pw = String(form.get("password") ?? "");
  if (!(await verifyPassword(u.passwordHash, pw))) return { error: "Mot de passe incorrect : le compte n'a pas été supprimé." };
  await destroySession();
  await deleteAccount(u.id);
  redirect("/compte?supprime=1");
}

export async function forgotPassword(_: SaveState, form: FormData): Promise<SaveState> {
  const email = z.string().trim().toLowerCase().max(200).safeParse(form.get("email"));
  if (!email.success || !email.data) return { error: "Indiquez votre adresse e-mail." };
  const ip = await clientIp();
  if (!(await rateLimit(`oubli:ip:${ip}`, 10, 3600)) || !(await rateLimit(`oubli:mail:${email.data}`, 3, 3600)))
    return { error: "Trop de demandes. Réessayez dans une heure." };
  await requestPasswordReset(email.data, process.env.SITE_URL || "http://localhost:3000");
  return { ok: "Si un compte existe avec cette adresse, un e-mail vient de vous être envoyé avec un lien valable 1 heure. Pensez à regarder dans les indésirables." };
}

export async function setNewPassword(_: SaveState, form: FormData): Promise<SaveState> {
  const ip = await clientIp();
  if (!(await rateLimit(`nouveau-mdp:${ip}`, 10, 900))) return { error: "Trop de tentatives. Patientez 15 minutes." };
  const p = z
    .object({ token: z.string().max(100), password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(200), password2: z.string() })
    .refine((d) => d.password === d.password2, { message: "Les deux mots de passe ne correspondent pas." })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const r = await resetPassword(p.data.token, p.data.password);
  if (!r.ok) return { error: r.error };
  await createSession(r.userId);
  redirect("/compte?nouveau-mdp=1");
}
