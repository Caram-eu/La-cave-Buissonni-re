import Link from "next/link";
import { deliveryText } from "@/lib/order-text";
import { STATUS_LABEL, type OrderStatus } from "@/lib/rules/orders";
import { formatEuros } from "@/lib/rules/pricing";
import { orderWhere, type OrderFilters } from "@/lib/server/admin-orders";
import { db } from "@/lib/server/db";

export const metadata = { title: "Commandes" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const f = await searchParams;
  const [orders, towns] = await Promise.all([
    db.order.findMany({ where: orderWhere(f), orderBy: [{ createdAt: "desc" }], take: 300, include: { items: true } }),
    db.market.findMany({ distinct: ["town"], select: { town: true }, orderBy: { town: "asc" } }),
  ]);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <h1>Commandes</h1>
      <form className="filters" method="get">
        <div className="f"><label htmlFor="ff">Du</label><input className="field" id="ff" type="date" name="from" defaultValue={f.from} /></div>
        <div className="f"><label htmlFor="ft">Au</label><input className="field" id="ft" type="date" name="to" defaultValue={f.to} /></div>
        <div className="f"><label htmlFor="fm">Marché ou mode</label>
          <select className="field" id="fm" name="town" defaultValue={f.town ?? ""}>
            <option value="">Tous</option>
            {towns.map((t) => <option key={t.town} value={t.town}>{t.town}</option>)}
            <option value="__livraison">Livraisons à domicile</option>
            <option value="__expedition">Expéditions UPS</option>
          </select></div>
        <div className="f"><label htmlFor="fs">Statut</label>
          <select className="field" id="fs" name="status" defaultValue={f.status ?? ""}>
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select></div>
        <div className="f"><label htmlFor="fq">Nom, téléphone ou n°</label><input className="field" id="fq" name="q" defaultValue={f.q} /></div>
        <button className="btn sm" type="submit">Filtrer</button>
        <Link className="btn sm ghost" href="/admin/commandes">Effacer</Link>
        <a className="btn sm ghost" href={`/admin/commandes/export?${qs}`}>Exporter en CSV</a>
      </form>
      <p className="small muted" style={{ marginBottom: 8 }}>{orders.length} commande{orders.length > 1 ? "s" : ""}{orders.length === 300 ? " (300 plus récentes)" : ""}. Les dates filtrent le jour du marché, ou le jour de la commande pour les livraisons et expéditions.</p>
      <div className="cards">
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/commandes/${o.id}`} className="card" style={{ textDecoration: "none", display: "block" }}>
            <div className="top">
              <b>{o.customerName}</b>
              <span><span className={`st ${o.status}`}>{STATUS_LABEL[o.status]}</span> <b>{formatEuros(o.totalCents)}</b></span>
            </div>
            <div className="small">{deliveryText(o)}</div>
            <div className="small muted">{o.number} · {o.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })} · {o.phone} · {o.items.reduce((a, i) => a + i.qty, 0)} article(s)</div>
          </Link>
        ))}
        {!orders.length && <p className="muted">Aucune commande pour ces critères.</p>}
      </div>
    </>
  );
}
