import { exportUserData } from "@/lib/server/account";
import { currentUser } from "@/lib/server/auth";

/** Téléchargement des données du client connecté (fichier JSON). */
export async function GET() {
  const u = await currentUser();
  if (!u) return new Response("Connectez-vous pour télécharger vos données.", { status: 401 });
  const data = await exportUserData(u.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mes-donnees-la-cave-buissonniere.json"`,
      "cache-control": "no-store",
    },
  });
}
