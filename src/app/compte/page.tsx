import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccount, PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { AuthForms } from "@/components/account/AuthForms";
import { formatHours } from "@/lib/rules/markets";
import { formatDateFr } from "@/lib/rules/paris-time";
import { formatEuros } from "@/lib/rules/pricing";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { NOUVELLE: "Reçue", CONFIRMEE: "Confirmée", PREPAREE: "Préparée", REMISE: "Remise", ANNULEE: "Annulée" };

export default async function ComptePage({ searchParams }: { searchParams: Promise<{ suite?: string; supprime?: string; "nouveau-mdp"?: string }> }) {
  const [user, sp] = await Promise.all([currentUser(), searchParams]);
  const towns = [...new Set((await db.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })).map((m) => m.town))];
  if (!user) {
    const fromCart = sp.suite === "panier";
    return (
      <section><div className="band"><div className="formwrap">
        {sp.supprime && <div className="okbox" role="status">Votre compte a été supprimé. Les pièces comptables des commandes passées restent conservées 10 ans, comme la loi l&apos;impose.</div>}
        <AuthForms towns={towns} next={fromCart ? "/panier?etape=2" : "/compte"} fromCart={fromCart} />
      </div></div></section>
    );
  }
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true } });
  return (
    <section><div className="band"><div className="formwrap">
      <h1>Bonjour {user.firstName} !</h1>
      <p className="muted" style={{ marginTop: 8 }}>Votre espace client La Cave Buissonnière.</p>
      {sp["nouveau-mdp"] && <div className="okbox" role="status" style={{ marginTop: 16 }}>Votre nouveau mot de passe est enregistré.</div>}
      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 24 }}>Mes informations</h2>
        <ProfileForm u={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, habitualTown: user.habitualTown, newsletter: user.newsletter }} towns={towns} />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 24 }}>Mes commandes</h2>
        {orders.length ? orders.map((o) => (
          <div key={o.id} style={{ padding: "10px 0", borderTop: "1px dashed var(--line)", marginTop: 8 }}>
            <b>{o.number}</b> · {o.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} · {formatEuros(o.totalCents)} · {STATUS[o.status]}
            <br />
            <span className="small muted">
              {o.mode === "MARCHE" && o.marketDate ? `Retrait au marché de ${o.marketTown}, ${formatDateFr(o.marketDate)} (${formatHours(o.marketHours || "")})` : o.mode === "LIVRAISON" ? `Livraison à domicile, ${o.city}` : "Expédition UPS"}
              {" · "}{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}
            </span>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Aucune commande pour le moment.</p>}
      </div>
      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn green" href="/vins">Voir nos vins</Link>
        <form action={logout}><button className="btn ghost" type="submit">Se déconnecter</button></form>
      </div>
      <div className="panel" style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 24 }}>Changer mon mot de passe</h2>
        <PasswordForm />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 24 }}>Mes données</h2>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>Téléchargez toutes les informations que la cave conserve sur vous : compte et commandes (fichier JSON, lisible par un tableur ou un autre service).</p>
        <a className="btn ghost" href="/compte/export" download>Télécharger mes données</a>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 24 }}>Supprimer mon compte</h2>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>Vos informations, vos préférences et votre accès seront effacés. Les pièces comptables des commandes passées restent conservées 10 ans, comme la loi l&apos;impose, sans être reliées à un compte. Un compte sans connexion ni commande pendant 3 ans est supprimé automatiquement.</p>
        <DeleteAccount />
      </div>
    </div></div></section>
  );
}
