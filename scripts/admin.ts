/**
 * Donne ou retire l'accès à l'administration à un compte client existant.
 *   npm run admin -- ajouter adresse@exemple.fr
 *   npm run admin -- retirer adresse@exemple.fr
 *   npm run admin -- liste
 * La personne crée d'abord son compte sur le site (« Mon compte »), puis on lui donne l'accès.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [cmd, emailRaw] = process.argv.slice(2);
const email = emailRaw?.trim().toLowerCase();

async function main() {
  if (cmd === "liste") {
    const admins = await db.user.findMany({ where: { isAdmin: true }, select: { email: true, firstName: true, lastName: true } });
    console.log(admins.length ? admins.map((a) => `- ${a.firstName} ${a.lastName} <${a.email}>`).join("\n") : "Aucun administrateur.");
    return;
  }
  if ((cmd !== "ajouter" && cmd !== "retirer") || !email) {
    console.log("Utilisation : npm run admin -- ajouter|retirer adresse@exemple.fr   ou   npm run admin -- liste");
    process.exitCode = 1;
    return;
  }
  const u = await db.user.findUnique({ where: { email } });
  if (!u) {
    console.log(`Aucun compte avec l'adresse ${email}. La personne doit d'abord créer son compte sur le site.`);
    process.exitCode = 1;
    return;
  }
  await db.user.update({ where: { id: u.id }, data: { isAdmin: cmd === "ajouter" } });
  await db.session.deleteMany({ where: { userId: u.id } }); // reconnexion nécessaire
  console.log(cmd === "ajouter" ? `${u.firstName} ${u.lastName} a maintenant accès à l'administration (/admin).` : `Accès à l'administration retiré pour ${email}.`);
}

main().finally(() => db.$disconnect());
