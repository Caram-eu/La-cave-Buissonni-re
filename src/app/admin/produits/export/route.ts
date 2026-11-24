import { toCsv } from "@/lib/csv";
import { EXPORT_HEADER, exportRow } from "@/lib/rules/catalog-import";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";

/** Carte actuelle en CSV : à modifier dans Excel puis à réimporter. */
export async function GET() {
  await requireAdmin();
  const ps = await db.product.findMany({ where: { kind: "PRODUIT", hidden: false }, orderBy: { sortOrder: "asc" } });
  return new Response(toCsv([EXPORT_HEADER, ...ps.map(exportRow)]), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="carte-la-cave-buissonniere-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
