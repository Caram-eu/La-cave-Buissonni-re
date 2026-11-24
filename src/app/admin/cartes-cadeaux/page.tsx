import { setGiftCardDisabled } from "@/app/admin/actions";
import { GiftCardCreate, GiftUse } from "@/components/admin/Forms";
import { formatEuros } from "@/lib/rules/pricing";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";

export const metadata = { title: "Cartes cadeaux" };

export default async function GiftCardsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const q = (sp.q ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const cards = await db.giftCard.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { uses: { include: { order: { select: { number: true, id: true } } } } } });
  const list = q ? cards.filter((c) => c.code.replace(/-/g, "").includes(q) || (c.buyerName ?? "").toUpperCase().includes(q)) : cards;
  const now = new Date();
  return (
    <>
      <h1>Cartes cadeaux</h1>
      <div className="grid2">
        <div className="card">
          <h2>Nouvelle carte (vendue au marché)</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>Une fois la carte payée au stand, créez-la ici : un code unique est généré{s.legal.giftCardValidity ? `. Validité indiquée dans les CGV : ${s.legal.giftCardValidity}` : ""}. Si vous indiquez l&apos;e-mail du bénéficiaire, le code lui est envoyé.</p>
          <GiftCardCreate amounts={s.giftCardAmounts} />
        </div>
        <div>
          <form className="filters" method="get"><div className="f"><label htmlFor="gq">Rechercher un code ou un nom</label><input className="field" id="gq" name="q" defaultValue={sp.q} /></div><button className="btn sm" type="submit">Chercher</button></form>
          <div className="cards">
            {list.map((c) => {
              const expired = c.expiresAt && c.expiresAt < now;
              const reserved = c.uses.filter((u) => u.status === "RESERVE").reduce((a, u) => a + u.amountCents, 0);
              return (
                <div key={c.id} className={`card${c.disabled || expired ? " muted-row" : ""}`}>
                  <div className="top"><b style={{ letterSpacing: ".04em" }}>{c.code}</b><b>{formatEuros(c.balanceCents)} <span className="small muted">/ {formatEuros(c.initialCents)}</span></b></div>
                  <p className="small muted">
                    Créée le {c.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}{c.buyerName ? ` · offerte par ${c.buyerName}` : ""}{c.recipientEmail ? ` · pour ${c.recipientEmail}` : ""}
                    {c.expiresAt ? ` · ${expired ? "expirée le" : "valable jusqu'au"} ${c.expiresAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}{c.disabled ? " · désactivée" : ""}
                    {reserved ? ` · ${formatEuros(reserved)} réservés par une commande en cours` : ""}
                  </p>
                  {c.uses.length > 0 && <p className="small">Commandes : {c.uses.map((u) => `${u.order.number} (${formatEuros(u.amountCents)}, ${u.status === "RESERVE" ? "réservé" : u.status === "DEBITE" ? "débité" : "rendu"})`).join(" ; ")}</p>}
                  {c.note && <p className="small" style={{ whiteSpace: "pre-wrap" }}>{c.note}</p>}
                  <div className="row" style={{ gap: 6, marginTop: 6, alignItems: "flex-end" }}>
                    {!c.disabled && c.balanceCents > 0 && <GiftUse id={c.id} />}
                    <form action={setGiftCardDisabled} className="inline"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="disabled" value={c.disabled ? "0" : "1"} /><button className="btn sm ghost" type="submit">{c.disabled ? "Réactiver" : "Désactiver"}</button></form>
                  </div>
                </div>
              );
            })}
            {!list.length && <p className="muted">Aucune carte.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
