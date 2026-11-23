import Link from "next/link";
import { notFound } from "next/navigation";
import { changeOrderStatus } from "@/app/admin/actions";
import { OrderNotes } from "@/components/admin/OrderNotes";
import { deliveryText } from "@/lib/order-text";
import { allowedNext, STATUS_LABEL } from "@/lib/rules/orders";
import { formatEuros } from "@/lib/rules/pricing";
import { db } from "@/lib/server/db";

export const metadata = { title: "Commande" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const o = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true, giftCardUses: { include: { giftCard: true } } } });
  if (!o) notFound();
  const tel = o.phone.replace(/[^+\d]/g, "");
  return (
    <>
      <p className="noprint"><Link href="/admin/commandes">‹ Toutes les commandes</Link></p>
      <h1>Commande {o.number}</h1>
      <div className="grid2">
        <div className="card">
          <p><span className={`st ${o.status}`}>{STATUS_LABEL[o.status]}</span></p>
          <p style={{ marginTop: 8 }}><b>{o.customerName}</b><br /><a href={`tel:${tel}`}>{o.phone}</a> · <a href={`mailto:${o.customerEmail}`}>{o.customerEmail}</a>{!o.userId && <><br /><span className="small muted">Compte client supprimé depuis.</span></>}</p>
          <p style={{ marginTop: 8 }}>{deliveryText(o)}</p>
          {o.note && <p style={{ marginTop: 8 }} className="okbox">Message du client : {o.note}</p>}
          <p className="small muted" style={{ marginTop: 8 }}>
            Commandée le {o.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}. CGV version {o.cgvVersion} acceptées le {o.cgvAcceptedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.
            Paiement : {o.paymentMethod === "EN_LIGNE" ? "en ligne" : "à la remise"} ({o.paymentStatus === "paye" ? "payé" : o.paymentStatus === "rembourse" ? "remboursé" : "à payer"}).
          </p>
          <div className="row noprint" style={{ marginTop: 12, gap: 8 }}>
            {allowedNext(o.status).map((s) => (
              <form key={s} action={changeOrderStatus} className="inline">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="status" value={s} />
                <button className={`btn sm ${s === "ANNULEE" ? "danger" : s === "REMISE" ? "green" : "ghost"}`} type="submit">{s === "ANNULEE" ? "Annuler la commande" : `Passer en « ${STATUS_LABEL[s]} »`}</button>
              </form>
            ))}
          </div>
          {o.status === "ANNULEE" && <p className="small muted" style={{ marginTop: 8 }}>Commande annulée : elle ne peut plus changer de statut.</p>}
        </div>
        <div className="card">
          <h2>Articles</h2>
          <table className="tbl"><tbody>
            {o.items.map((i) => (
              <tr key={i.id}><td><b>{i.qty} ×</b> {i.name}<br /><span className="small muted">{i.domain}{i.vintage && i.vintage !== "NM" ? " " + i.vintage : ""} · {formatEuros(i.unitCents)}{i.lineTotalCents < i.unitCents * i.qty ? " · −5 %" : ""}</span></td><td className="n">{formatEuros(i.lineTotalCents)}</td></tr>
            ))}
            {o.discountCents > 0 && <tr><td>Remise</td><td className="n">−{formatEuros(o.discountCents)}</td></tr>}
            {o.giftCardUses.map((u) => <tr key={u.id}><td>Carte cadeau {u.giftCard.code} ({u.status === "RESERVE" ? "réservé" : u.status === "DEBITE" ? "débité" : "rendu"})</td><td className="n">−{formatEuros(u.amountCents)}</td></tr>)}
            <tr><td><b>Reste à payer</b>{o.mode !== "MARCHE" ? <span className="small muted"> (hors frais)</span> : null}</td><td className="n">{formatEuros(o.totalCents)}</td></tr>
          </tbody></table>
          <div style={{ marginTop: 14 }} className="noprint">
            <OrderNotes id={o.id} shippingNote={o.shippingNote ?? ""} adminNote={o.adminNote ?? ""} showShipping={o.mode !== "MARCHE"} />
          </div>
        </div>
      </div>
    </>
  );
}
