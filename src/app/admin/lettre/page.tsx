import { db } from "@/lib/server/db";

export const metadata = { title: "Lettre d'information" };

export default async function NewsletterAdmin() {
  const subs = await db.user.findMany({ where: { newsletter: true }, orderBy: { createdAt: "desc" }, select: { id: true, firstName: true, lastName: true, email: true, habitualTown: true, createdAt: true } });
  return (
    <>
      <h1>Lettre d&apos;information</h1>
      <p className="muted" style={{ marginBottom: 12 }}>Clients qui ont coché « recevoir les arrivages et le calendrier des marchés » (à la création du compte ou dans « Mon compte »). Chaque client peut se désinscrire depuis son compte.</p>
      <p style={{ marginBottom: 12 }}><a className="btn sm ghost" href="/admin/lettre/export">Exporter la liste (CSV)</a> <span className="small muted">à importer dans le service d&apos;envoi (Brevo).</span></p>
      <p className="small muted" style={{ marginBottom: 8 }}>{subs.length} inscrit{subs.length > 1 ? "s" : ""}</p>
      <table className="tbl resp">
        <thead><tr><th>Nom</th><th>E-mail</th><th>Marché habituel</th><th>Inscrit le</th></tr></thead>
        <tbody>{subs.map((s) => <tr key={s.id}><td>{s.firstName} {s.lastName}</td><td>{s.email}</td><td>{s.habitualTown || "Aucun"}</td><td>{s.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</td></tr>)}</tbody>
      </table>
    </>
  );
}
