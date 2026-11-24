import { toCsv } from "@/lib/csv";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";

export async function GET() {
  await requireAdmin();
  const subs = await db.user.findMany({ where: { newsletter: true }, orderBy: { createdAt: "asc" } });
  const rows = [["EMAIL", "PRENOM", "NOM", "MARCHE_HABITUEL"], ...subs.map((s) => [s.email, s.firstName, s.lastName, s.habitualTown ?? ""])];
  return new Response(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="lettre-information-inscrits.csv"`, "cache-control": "no-store" } });
}
