import { setQuoteStatus } from "@/app/admin/actions";
import { db } from "@/lib/server/db";

export const metadata = { title: "Devis" };

export default async function QuotesAdmin() {
  const quotes = await db.quote.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 });
  const rank: Record<string, number> = { nouvelle: 0, "en cours": 1, "traitée": 2 };
  quotes.sort((a, b) => rank[a.status] - rank[b.status]);
  return (
    <>
      <h1>Demandes de devis</h1>
      <div className="cards">
        {quotes.map((q) => (
          <div key={q.id} className={`card${q.status === "traitée" ? " muted-row" : ""}`}>
            <div className="top"><b>{q.type}</b><span className={`st ${q.status === "nouvelle" ? "NOUVELLE" : q.status === "en cours" ? "PREPAREE" : "REMISE"}`}>{q.status}</span></div>
            <p className="small">
              {q.name}{q.phone ? <> · <a href={`tel:${q.phone.replace(/[^+\d]/g, "")}`}>{q.phone}</a></> : null}{q.email ? <> · <a href={`mailto:${q.email}`}>{q.email}</a></> : null}
              <br />{q.date ? `Le ${new Date(q.date + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", dateStyle: "long" })}` : "Date à définir"} · {q.guests ? `${q.guests} personnes` : "nombre à définir"} · {q.place || "lieu à définir"}{q.budget ? ` · budget ${q.budget}` : ""}
            </p>
            {q.message && <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{q.message}</p>}
            <p className="small muted" style={{ marginTop: 6 }}>Reçue le {q.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</p>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              {["nouvelle", "en cours", "traitée"].filter((s) => s !== q.status).map((s) => (
                <form key={s} action={setQuoteStatus} className="inline"><input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value={s} /><button className="btn sm ghost" type="submit">Marquer « {s} »</button></form>
              ))}
            </div>
          </div>
        ))}
        {!quotes.length && <p className="muted">Aucune demande de devis pour le moment.</p>}
      </div>
    </>
  );
}
