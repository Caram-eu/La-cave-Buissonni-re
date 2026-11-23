"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/server/auth";
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
  if (!(await rateLimit(`inscription:${ip}`, 10, 3600))) return { error: "Trop de tentatives. Réessayez dans une heure." };
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
