"use server";

import { z } from "zod";
import { db } from "@/lib/server/db";
import { notifyQuote } from "@/lib/server/notify";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { QUOTE_TYPES } from "@/lib/quote-types";



const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

const QuoteSchema = z
  .object({
    type: z.enum(QUOTE_TYPES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || undefined),
    guests: z.coerce.number().int().min(1).max(5000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
    place: opt(120),
    budget: opt(60),
    message: z.string().trim().max(3000).default(""),
    name: z.string().trim().min(1, "Indiquez votre nom.").max(120),
    phone: opt(30),
    email: z.string().trim().max(200).optional().transform((v) => v || undefined),
    website: z.string().max(0).optional(), // champ piège invisible pour les robots
  })
  .refine((d) => d.phone || (d.email && z.email().safeParse(d.email).success), { message: "Laissez un téléphone ou un e-mail valide pour être recontacté." });


export async function sendQuote(_: { ok: boolean; error?: string }, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const parsed = QuoteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Vérifiez le formulaire." };
  const d = parsed.data;
  if (!(await rateLimit(`devis:${await clientIp()}`, 5, 3600))) return { ok: false, error: "Trop de demandes envoyées. Réessayez dans une heure ou appelez-nous." };
  const q = await db.quote.create({
    data: { type: d.type, date: d.date, guests: d.guests, place: d.place, budget: d.budget, message: d.message, name: d.name, phone: d.phone, email: d.email },
  });
  await notifyQuote(q);
  return { ok: true };
}
