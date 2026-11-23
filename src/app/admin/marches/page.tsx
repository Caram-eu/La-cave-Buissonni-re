import { deleteException, deleteMarket, deletePastExceptions } from "@/app/admin/actions";
import { ExceptionForm, MarketForm } from "@/components/admin/Forms";
import { formatHours } from "@/lib/rules/markets";
import { DAYS, formatDateFr, parisNow } from "@/lib/rules/paris-time";
import { db } from "@/lib/server/db";

export const metadata = { title: "Marchés" };

export default async function MarketsAdmin() {
  const today = parisNow(new Date()).date;
  const [markets, exceptions] = await Promise.all([
    db.market.findMany({ orderBy: [{ active: "desc" }, { weekday: "asc" }, { sortOrder: "asc" }] }),
    db.marketException.findMany({ orderBy: { date: "asc" } }),
  ]);
  const past = exceptions.filter((e) => e.date < today);
  const order = (d: number) => (d + 6) % 7; // lundi d'abord
  return (
    <>
      <h1>Marchés</h1>
      <div className="grid2">
        <div>
          <div className="card">
            <h2>Marchés habituels</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Chaque semaine, le même jour. Les modifications s&apos;affichent tout de suite sur le site (liste, carte, bandeau, commande).</p>
            {[...markets].sort((a, b) => order(a.weekday) - order(b.weekday)).map((m) => (
              <div key={m.id} className={m.active ? "" : "muted-row"} style={{ borderTop: "1px dashed var(--line)", padding: "10px 0" }}>
                <div className="top"><b>{DAYS[m.weekday]} · {m.town}</b><span className="small">{formatHours(m.hours)}{m.active ? "" : " · inactif"}</span></div>
                <div className="small muted">{m.place} ({m.department})</div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <MarketForm compact m={m} />
                  <form action={deleteMarket} className="inline"><input type="hidden" name="id" value={m.id} /><button className="btn sm ghost" type="submit">Supprimer</button></form>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h2>Ajouter un marché habituel</h2>
            <MarketForm />
          </div>
        </div>
        <div>
          <div className="card">
            <h2>Marché exceptionnel ou annulé</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Noël, fêtes, foires… ou un marché habituel qui n&apos;a pas lieu (congés, météo).</p>
            <ExceptionForm markets={markets.filter((m) => m.active).map((m) => ({ id: m.id, label: `${DAYS[m.weekday]} · ${m.town}, ${m.place}` }))} />
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h2>Dates prévues</h2>
            {exceptions.filter((e) => e.date >= today).map((e) => (
              <div key={e.id} style={{ borderTop: "1px dashed var(--line)", padding: "8px 0" }} className="top">
                <span><b>{formatDateFr(e.date, true)}</b> · {e.kind === "ANNULE" ? <b style={{ color: "#b3261e" }}>annulé</b> : "exceptionnel"} · {e.town}<br /><span className="small muted">{e.place}{e.hours ? `, ${formatHours(e.hours)}` : ""}{e.note ? ` · ${e.note}` : ""}</span></span>
                <form action={deleteException}><input type="hidden" name="id" value={e.id} /><button className="btn sm ghost" type="submit" aria-label={`Retirer la date du ${formatDateFr(e.date)}`}>Retirer</button></form>
              </div>
            ))}
            {!exceptions.some((e) => e.date >= today) && <p className="muted">Aucune date à venir.</p>}
            {past.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="small muted">{past.length} date{past.length > 1 ? "s" : ""} passée{past.length > 1 ? "s" : ""} (dont les marchés de Noël 2025), plus affichée{past.length > 1 ? "s" : ""} sur le site.</p>
                <form action={deletePastExceptions} style={{ marginTop: 6 }}><button className="btn sm ghost" type="submit">Effacer les dates passées</button></form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
