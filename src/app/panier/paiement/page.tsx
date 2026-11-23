import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatEuros } from "@/lib/rules/pricing";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { confirmPayment } from "@/lib/server/payment";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Paiement", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Retour du client après la page de paiement SumUp. */
export default async function PaiementPage({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  const [user, sp, s] = await Promise.all([currentUser(), searchParams, getSettings()]);
  if (!user) redirect("/compte");
  const o = sp.commande ? await db.order.findUnique({ where: { id: sp.commande } }) : null;
  if (!o || o.userId !== user.id) notFound();
  const state = await confirmPayment(o.id);
  return (
    <section><div className="band"><div className="formwrap">
      <h1>{state === "paye" ? "Paiement reçu, merci !" : state === "echec" ? "Le paiement n'a pas abouti" : "Paiement en cours de vérification"}</h1>
      <div className="panel" style={{ marginTop: 18 }} role="status">
        <p>Commande <b>{o.number}</b> · {formatEuros(o.totalCents)}</p>
        <p style={{ marginTop: 8 }}>
          {state === "paye"
            ? "Votre paiement est confirmé. Vous recevez un e-mail de confirmation de commande."
            : state === "echec"
              ? `Aucun montant n'a été prélevé. Votre commande est conservée : vous pourrez la régler au retrait ou à la livraison (${s.paymentMethods}), ou appeler Guillaume au ${s.contact.phone}.`
              : "SumUp n'a pas encore confirmé le paiement. Rechargez cette page dans quelques instants ; en cas de doute, Guillaume vérifie chaque paiement avant la remise."}
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <Link className="btn green" href="/compte">Voir mes commandes</Link>
          <Link className="btn ghost" href="/vins">Poursuivre mes achats</Link>
        </div>
      </div>
    </div></div></section>
  );
}
