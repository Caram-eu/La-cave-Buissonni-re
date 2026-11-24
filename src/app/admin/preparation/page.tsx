import Link from "next/link";
import { markPrepared } from "@/app/admin/actions";
import { PrintButton } from "@/components/admin/PrintButton";
import { volumeText } from "@/lib/catalog";
import { STATUS_LABEL } from "@/lib/rules/orders";
import { formatHours, upcomingMarkets } from "@/lib/rules/markets";
import { formatDateFr, parisNow } from "@/lib/rules/paris-time";
import { formatEuros } from "@/lib/rules/pricing";
import { preparation } from "@/lib/server/admin-orders";
import { db } from "@/lib/server/db";
import { loadMarkets } from "@/lib/server/markets";

export const metadata = { title: "Préparation" };

export default async function PrepPage({ searchParams }: { searchParams: Promise<{ date?: string; town?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const today = parisNow(now).date;
  const { weekly, exceptions } = await loadMarkets();
  const next = upcomingMarkets(now, weekly, exceptions, { days: 21 });
  const counts = await db.order.groupBy({ by: ["marketDate", "marketTown"], where: { marketDate: { gte: today }, status: { not: "ANNULEE" } }, _count: true });
  const count = (d: string, t: string) => counts.find((c) => c.marketDate === d && c.marketTown === t)?._count ?? 0;
  const first = next.find((m) => count(m.date, m.town)) ?? next[0];
  const date = sp.date ?? first?.date, town = sp.town ?? first?.town;
  const occ = next.find((m) => m.date === date && m.town === town);
  const prep = date && town ? await preparation(date, town) : null;
  return (
    <>
      <h1>Fiche de préparation</h1>
      <form className="filters noprint" method="get">
        <div className="f"><label htmlFor="pmd">Date du marché</label>
          <select className="field" id="pmd" name="date" defaultValue={date}>
            {[...new Set(next.map((m) => m.date))].map((d) => <option key={d} value={d}>{formatDateFr(d)}</option>)}
          </select></div>
        <div className="f"><label htmlFor="pmt">Ville</label>
          <select className="field" id="pmt" name="town" defaultValue={town}>
            {[...new Set(next.map((m) => m.town))].map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <button className="btn sm" type="submit">Afficher</button>
      </form>
      <div className="row noprint" style={{ gap: 6, marginBottom: 14 }}>
        {next.filter((m) => count(m.date, m.town)).map((m) => (
          <Link key={m.key} className={`chip${m.date === date && m.town === town ? " on" : ""}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href={`?date=${m.date}&town=${encodeURIComponent(m.town)}`}>
            {formatDateFr(m.date).replace(/ \d{4}$/, "")} · {m.town} ({count(m.date, m.town)})
          </Link>
        ))}
      </div>
      {prep && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="top">
              <h2 style={{ margin: 0 }}>Marché de {town}, {formatDateFr(date!)}</h2>
              <PrintButton />
            </div>
            <p className="small muted">{occ ? `${occ.place}, ${formatHours(occ.hours)} · ` : ""}{prep.orders.length} commande{prep.orders.length > 1 ? "s" : ""} · {prep.count} article{prep.count > 1 ? "s" : ""} à charger</p>
          </div>
          {prep.orders.length === 0 ? <p className="muted">Aucune commande pour ce marché.</p> : (
            <div className="grid2">
              <div className="card">
                <h2>À charger dans le camion</h2>
                <table className="tbl"><thead><tr><th>Qté</th><th>Produit</th></tr></thead><tbody>
                  {prep.bottles.map((b) => (
                    <tr key={b.domain + b.name + b.vintage}><td className="n" style={{ fontSize: 18 }}>{b.qty}</td><td><b>{b.name}</b>{b.vintage && b.vintage !== "NM" ? ` ${b.vintage}` : ""}<br /><span className="small muted">{b.domain}{volumeText({ kind: "PRODUIT", boxKind: null, volumeCl: b.volumeCl }) ? " · " + volumeText({ kind: "PRODUIT", boxKind: null, volumeCl: b.volumeCl }) : ""}</span></td></tr>
                  ))}
                </tbody></table>
              </div>
              <div className="card">
                <h2>Par client</h2>
                {prep.orders.map((o) => (
                  <div key={o.id} style={{ borderTop: "1px dashed var(--line)", padding: "8px 0" }}>
                    <div className="top"><b>{o.customerName}</b><span>{formatEuros(o.totalCents)} <span className={`st ${o.status}`}>{STATUS_LABEL[o.status]}</span></span></div>
                    <div className="small">{o.items.map((i) => `${i.qty} × ${i.name}${i.vintage && i.vintage !== "NM" ? " " + i.vintage : ""}`).join(", ")}</div>
                    <div className="small muted">{o.number} · {o.phone}{o.giftCardCents ? ` · carte cadeau −${formatEuros(o.giftCardCents)}` : ""}{o.note ? ` · « ${o.note} »` : ""}</div>
                  </div>
                ))}
                <form action={markPrepared} className="noprint" style={{ marginTop: 10 }}>
                  <input type="hidden" name="date" value={date} /><input type="hidden" name="town" value={town} />
                  <button className="btn sm ghost" type="submit">Marquer ces commandes comme préparées</button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
