import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

/**
 * Envoi d'un e-mail.
 * - MAIL_OUTBOX_DIR défini (ordinateur de développement, tests) : l'e-mail est écrit dans ce dossier.
 * - Sinon : envoi par le service d'e-mails (Brevo), branché à l'étape « E-mails ».
 */
export async function sendMail(m: Mail): Promise<void> {
  const dir = process.env.MAIL_OUTBOX_DIR;
  if (dir) {
    await mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}.txt`;
    await writeFile(path.join(dir, name), `À : ${m.to}\nObjet : ${m.subject}\n\n${m.text}\n`, "utf8");
    return;
  }
  // Étape 5 : envoi par Brevo. En attendant, on signale l'e-mail non envoyé sans en écrire le contenu.
  console.warn(`[e-mail non envoyé : service d'e-mails pas encore configuré] « ${m.subject} »`);
}
