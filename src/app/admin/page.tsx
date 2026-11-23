import Link from "next/link";
import { formatHours, orderableMarkets, upcomingMarkets } from "@/lib/rules/markets";
import { formatDateFr, parisNow } from "@/lib/rules/paris-time";
import { db } from "@/lib/server/db";
import { loadMarkets } from "@/lib/server/markets";
import { getSettings } from "@/lib/server/settings";
import { legalTodo } from "@/lib/settings-defaults";

export default async function AdminHome() {
  const now = new Date();
  const today = parisNow(now).date;
  const [s, { weekly, exceptions }, newOrders, newQuotes, unavailable] = await Promise.all([
    getSettings(), loadMarkets(), db.order.count({ where: { status: "NOUVELLE" } }), db.quote.count({ where: { status: "nouvelle" } }),
    db.product.count({ where: { hidden: false, available: false } }),
  ]);
  const next = upcomingMarkets(now, weekly, exceptions, { days: 14, hideFinished: true, limit: 8 });
  const counts = await db.order.groupBy({ by: ["marketDate", "marketTown"], where: { marketDate: { gte: today }, status: { not: "ANNULEE" } }, _count: true });
  const countOf = (d: string, t: string) => counts.find((c) => c.marketDate === d && c.marketTown === t)?._count ?? 0;
  const deliveries = await db.order.count({ where: { mode: { in: ["LIVRAISON", "EXPEDITION"] }, status: { in: ["NOUVELLE", "CONFIRMEE", "PREPAREE"] } } });
  const todo = legalTodo(s);
  const pastSpecials = exceptions.filter((e) => e.date < today).length;
  const open = orderableMarkets(now, weekly, exceptions, s.cutoffHour, { limit: 1 })[0];
  return (
    <>
      <h1>Tableau de bord</h1>
      <div className="kpis">
        <Link href="/admin/commandes?status=NOUVELLE"><b>{newOrders}</b>commande{newOrders > 1 ? "s" : ""} nouvelle{newOrders > 1 ? "s" : ""} à confirmer</Link>
        <Link href="/admin/commandes?town=__livraison"><b>{deliveries}</b>livraison{deliveries > 1 ? "s" : ""} ou expédition{deliveries > 1 ? "s" : ""} en cours</Link>
        <Link href="/admin/devis"><b>{newQuotes}</b>demande{newQuotes > 1 ? "s" : ""} de devis à traiter</Link>
        <Link href="/admin/produits?dispo=non"><b>{unavailable}</b>produit{unavailable > 1 ? "s" : ""} indisponible{unavailable > 1 ? "s" : ""}</Link>
      </div>
      <div className="grid2">
        <div className="card">
          <h2>Prochains marchés</h2>
          {open && <p className="small muted" style={{ marginBottom: 8 }}>Commandes en ligne ouvertes à partir du marché du {formatDateFr(open.date)}.</p>}
          <table className="tbl"><tbody>
            {next.map((m) => (
              <tr key={m.key}>
                <td>{formatDateFr(m.date)}<br /><span className="small muted">{m.town}, {formatHours(m.hours)}</span></td>
                <td className="n">
                  {countOf(m.date, m.town) ? <Link href={`/admin/preparation?date=${m.date}&town=${encodeURIComponent(m.town)}`}>{countOf(m.date, m.town)} commande{countOf(m.date, m.town) > 1 ? "s" : ""}</Link> : <span className="muted">aucune</span>}
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <div className="card">
          <h2>À compléter avant mise en ligne</h2>
          {todo.length ? (
            <>
              <ul className="todo-list">{todo.map((t) => <li key={t}>{t}</li>)}</ul>
              <p style={{ marginTop: 10 }}><Link className="btn sm ghost" href="/admin/reglages#legal">Compléter dans les réglages</Link></p>
            </>
          ) : <p className="okmsg">Toutes les mentions légales sont renseignées.</p>}
          {pastSpecials > 0 && <p className="small" style={{ marginTop: 12 }}>{pastSpecials} marché{pastSpecials > 1 ? "s" : ""} exceptionnel{pastSpecials > 1 ? "s" : ""} passé{pastSpecials > 1 ? "s" : ""} (dates 2025) : <Link href="/admin/marches">mettre à jour les marchés</Link>.</p>}
        </div>
      </div>
    </>
  );
}
