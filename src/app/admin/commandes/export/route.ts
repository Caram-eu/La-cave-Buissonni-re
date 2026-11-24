import { toCsv } from "@/lib/csv";
import { STATUS_LABEL } from "@/lib/rules/orders";
import { requireAdmin } from "@/lib/server/admin";
import { orderWhere } from "@/lib/server/admin-orders";
import { db } from "@/lib/server/db";

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/** Export CSV des commandes filtrées : une ligne par article (exploitable dans un tableur). */
export async function GET(req: Request) {
  await requireAdmin();
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const orders = await db.order.findMany({ where: orderWhere(p), orderBy: { createdAt: "asc" }, include: { items: true } });
  const rows: (string | number)[][] = [["N° commande", "Date commande", "Statut", "Client", "Téléphone", "E-mail", "Mode", "Marché / commune", "Date du marché", "Adresse", "Article", "Domaine", "Millésime", "Quantité", "Prix unitaire", "Total ligne", "Remise commande", "Carte cadeau", "Reste à payer", "Frais convenus", "Message client"]];
  for (const o of orders)
    for (const i of o.items)
      rows.push([
        o.number, o.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }), STATUS_LABEL[o.status], o.customerName, o.phone, o.customerEmail,
        o.mode === "MARCHE" ? "Retrait marché" : o.mode === "LIVRAISON" ? "Livraison" : "Expédition", o.marketTown ?? o.city ?? "", o.marketDate ?? "", o.address ?? "",
        i.name, i.domain, i.vintage, i.qty, eur(i.unitCents), eur(i.lineTotalCents), eur(o.discountCents), eur(o.giftCardCents), eur(o.totalCents), o.shippingNote ?? "", o.note,
      ]);
  return new Response(toCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
