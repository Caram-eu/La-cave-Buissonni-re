import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

export type Mail = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  /** type d'e-mail, pour le journal (confirmation, rappel, carte-cadeau…) */
  kind?: string;
  orderId?: string;
};

/** Adresse d'expédition : une adresse du domaine (meilleure arrivée en boîte de réception qu'une adresse Gmail). */
export const MAIL_FROM = process.env.MAIL_FROM || "contact@lacavebuissonniere.fr";
export const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "La Cave Buissonnière";
const brevoUrl = () => process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";

async function log(m: Mail, status: string, extra: { error?: string; providerId?: string } = {}) {
  try {
    await db.emailLog.create({
      data: { kind: m.kind ?? "autre", to: m.to, subject: m.subject.slice(0, 200), status, error: extra.error?.slice(0, 500), providerId: extra.providerId, orderId: m.orderId },
    });
  } catch (e) {
    console.error("Journal des e-mails indisponible", e);
  }
}

async function brevo(m: Mail, apiKey: string): Promise<{ ok: true; id?: string } | { ok: false; error: string; retry: boolean }> {
  try {
    const r = await fetch(brevoUrl(), {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: MAIL_FROM_NAME, email: MAIL_FROM },
        replyTo: { name: MAIL_FROM_NAME, email: process.env.MAIL_REPLY_TO || MAIL_FROM },
        to: [{ email: m.to, ...(m.toName ? { name: m.toName } : {}) }],
        subject: m.subject,
        textContent: m.text,
        ...(m.html ? { htmlContent: m.html } : {}),
        tags: m.kind ? [m.kind] : undefined,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const d = (await r.json().catch(() => ({}))) as { messageId?: string };
      return { ok: true, id: d.messageId };
    }
    return { ok: false, error: `Brevo ${r.status} : ${(await r.text().catch(() => "")).slice(0, 200)}`, retry: r.status >= 500 || r.status === 429 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), retry: true };
  }
}

/**
 * Envoie un e-mail. Ne lève jamais d'erreur : un e-mail en échec ne doit pas bloquer une commande.
 * Renvoie true si l'e-mail est parti (ou a été écrit dans le dossier local de développement).
 * - MAIL_OUTBOX_DIR : écrit l'e-mail dans ce dossier (ordinateur de développement, tests).
 * - BREVO_API_KEY : envoi par Brevo (une nouvelle tentative en cas d'erreur passagère).
 */
export async function sendMail(m: Mail): Promise<boolean> {
  const dir = process.env.MAIL_OUTBOX_DIR;
  if (dir) {
    try {
      await mkdir(dir, { recursive: true });
      const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
      await writeFile(path.join(dir, name + ".txt"), `À : ${m.to}\nObjet : ${m.subject}\n\n${m.text}\n`, "utf8");
      if (m.html) await writeFile(path.join(dir, name + ".html"), m.html, "utf8");
      await log(m, "dossier-local");
      return true;
    } catch (e) {
      await log(m, "echec", { error: String(e) });
      return false;
    }
  }
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn(`[e-mail non envoyé : BREVO_API_KEY absente] « ${m.subject} »`);
    await log(m, "echec", { error: "Service d'e-mails non configuré (BREVO_API_KEY absente)" });
    return false;
  }
  let r = await brevo(m, key);
  if (!r.ok && r.retry) {
    await new Promise((res) => setTimeout(res, 1500));
    r = await brevo(m, key);
  }
  if (r.ok) {
    await log(m, "envoye", { providerId: r.id });
    return true;
  }
  console.error("Échec d'envoi d'e-mail", r.error);
  await log(m, "echec", { error: r.error });
  return false;
}
