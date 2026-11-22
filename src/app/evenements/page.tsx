import type { Metadata } from "next";
import Link from "next/link";
import { EventTools } from "@/components/events/EventTools";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Événements",
  description: "Mariages, fêtes, entreprises, dégustations à domicile, ateliers et coffrets cadeaux : La Cave Buissonnière choisit avec vous les vins naturels selon votre menu et votre budget.",
  alternates: { canonical: "/evenements" },
};
export const dynamic = "force-dynamic";

const chip = (href: string, label: string) => (
  <a className="chip" href={href} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{label}</a>
);

export default async function EvenementsPage() {
  const s = await getSettings();
  return (
    <section>
      <div className="band">
        <div className="wrap ev-hero">
          <div>
            <h1>Vos événements, côté cave</h1>
            <p className="lead" style={{ fontSize: 18, margin: "14px 0 20px", maxWidth: "34em" }}>
              Mariage, anniversaire, fête de village, soirée d&apos;entreprise ou simple dégustation entre amis à la maison : Guillaume, sommelier-conseil, choisit avec vous les vins naturels et les bières artisanales qui iront avec votre menu et votre budget.
            </p>
            <div className="row"><a className="btn green" href="#ev-devis">Demander un devis</a><a className="btn ghost" href="#ev-domicile">Dégustation à domicile</a></div>
            <ul className="ev-pts">
              <li>Accords mets et vins selon votre budget</li>
              <li>Reprise des bouteilles non ouvertes</li>
              <li>Vins transportés au frais, entre 11 et 13 °C</li>
            </ul>
          </div>
          <div className="ev-pic" aria-hidden="true">
            <svg viewBox="0 0 420 340">
              <ellipse cx="210" cy="318" rx="190" ry="14" fill="#e3efc6" />
              <g transform="translate(70,70) scale(1.05)"><use href="#wb" fill="url(#h-rouge)" stroke="#2d3e46" strokeWidth="4" /></g>
              <g transform="translate(140,40) scale(1.2)"><use href="#wb" fill="#fff" stroke="#2d3e46" strokeWidth="4" /></g>
              <g transform="translate(222,70) scale(1.05)"><use href="#wb" fill="url(#h-bulles)" stroke="#2d3e46" strokeWidth="4" /></g>
              <g className="ev-g1"><path d="M300,170h56c0,40 -10,60 -28,60s-28,-20 -28,-60z" fill="#fff" stroke="#2d3e46" strokeWidth="5" strokeLinejoin="round" /><path d="M304,196h48c-2,22 -10,32 -24,32s-22,-10 -24,-32z" fill="#7a1f3d" /><path d="M328,230v58M310,292h36" stroke="#2d3e46" strokeWidth="5" strokeLinecap="round" /></g>
              <g className="ev-g2"><path d="M362,170h40c0,40 -6,60 -20,60s-20,-20 -20,-60z" fill="#fff" stroke="#2d3e46" strokeWidth="5" strokeLinejoin="round" /><path d="M365,186h34c-1,30 -6,42 -17,42s-16,-12 -17,-42z" fill="#e8d36a" /><path d="M382,230v58M368,292h28" stroke="#2d3e46" strokeWidth="5" strokeLinecap="round" /></g>
              <g fill="#89ba13"><circle cx="356" cy="150" r="4" /><circle cx="372" cy="138" r="3" /><circle cx="342" cy="136" r="3" /></g>
            </svg>
          </div>
        </div>
      </div>

      <div className="band" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <nav className="legalnav" aria-label="Sections de la page">
            {chip("#ev-mariages", "Mariages")}{chip("#ev-evenements-divers", "Fêtes et entreprises")}{chip("#ev-domicile", "Dégustations à domicile")}{chip("#ev-coffrets", "Coffrets cadeaux")}{chip("#ev-estimation", "Combien de bouteilles ?")}{chip("#ev-devis", "Devis")}
          </nav>
        </div>
      </div>

      <div className="band ev-sec" id="ev-mariages" style={{ background: "#f3f6ee" }}>
        <div className="wrap ev-two">
          <div>
            <h2>Mariages</h2>
            <p>Du vin d&apos;honneur au dessert, Guillaume compose une sélection qui suit votre menu et votre traiteur : des bulles pour trinquer, un blanc et un rouge pour le repas, une surprise pour le gâteau.</p>
            <p>Comme il reprend les bouteilles non ouvertes, vous pouvez prévoir large sans craindre de payer ce qui n&apos;aura pas été bu.</p>
          </div>
          <ul className="ev-list">
            <li><b>Rendez-vous conseil</b> pour choisir les vins selon le menu et le budget</li>
            <li><b>Dégustation préalable</b> des vins pressentis avec les mariés</li>
            <li><b>Livraison au frais</b> sur le lieu de réception</li>
            <li><b>Reprise des bouteilles non ouvertes</b> après la fête</li>
          </ul>
        </div>
      </div>

      <div className="band ev-sec" id="ev-evenements-divers">
        <div className="wrap">
          <h2>Fêtes de famille, associations et entreprises</h2>
          <p style={{ maxWidth: "44em", marginTop: 8 }}>Même principe pour tous les moments qui se fêtent : la sélection s&apos;adapte au nombre d&apos;invités, à l&apos;ambiance et au budget.</p>
          <div className="ev-cards">
            <article><h3>Fêtes de famille</h3><p className="muted">Anniversaires, baptêmes, communions, retrouvailles : des vins faciles à partager et des bières artisanales pour tous les goûts.</p></article>
            <article><h3>Associations et villages</h3><p className="muted">Fêtes de village, repas associatifs, buvettes : un approvisionnement au juste prix, avec reprise de ce qui n&apos;a pas été ouvert.</p></article>
            <article><h3>Entreprises</h3><p className="muted">Pots de départ, inaugurations, séminaires, cadeaux de fin d&apos;année pour vos clients ou vos équipes.</p></article>
          </div>
        </div>
      </div>

      <div className="band ev-sec slate-soft" id="ev-domicile">
        <div className="wrap">
          <h2>Dégustations à domicile</h2>
          <p style={{ maxWidth: "44em", marginTop: 8 }}>La cave se déplace chez vous. Vous invitez vos proches, Guillaume apporte les bouteilles et anime la soirée.</p>
          <div className="ev-two" style={{ marginTop: 22 }}>
            <div className="panel">
              <h3>Réunion-vente</h3>
              <p className="muted" style={{ marginTop: 6 }}>Une soirée conviviale autour d&apos;une sélection de vins naturels, commentés un par un. Chacun goûte, pose ses questions et commande s&apos;il le souhaite, sans obligation d&apos;achat.</p>
              <ol className="ev-steps">
                <li>Vous choisissez une date et invitez vos amis</li>
                <li>Guillaume arrive avec les vins, les verres et le matériel</li>
                <li>Dégustation commentée, à votre rythme</li>
                <li>Les commandes sont remises au marché ou livrées</li>
              </ol>
            </div>
            <div className="panel">
              <h3>Ateliers découverte</h3>
              <p className="muted" style={{ marginTop: 6 }}>Selon vos envies, deux formules pour apprendre en s&apos;amusant :</p>
              <ul className="ev-list" style={{ marginTop: 12 }}>
                <li><b>Initiation à la dégustation</b> : regarder, sentir, goûter et mettre des mots sur ce qu&apos;on boit</li>
                <li><b>Accords mets et vins</b> : vos plats ou vos fromages face à plusieurs vins, pour trouver les mariages qui fonctionnent</li>
              </ul>
              <p className="small muted" style={{ marginTop: 12 }}>Pour un groupe d&apos;amis, un comité d&apos;entreprise ou une association.</p>
            </div>
          </div>
          <div className="row" style={{ marginTop: 20 }}><a className="btn green" href="#ev-devis" data-type="Dégustation à domicile (réunion-vente)">Organiser une dégustation chez moi</a></div>
        </div>
      </div>

      <div className="band ev-sec" id="ev-coffrets">
        <div className="wrap ev-two">
          <div>
            <h2>Coffrets cadeaux personnalisés</h2>
            <p>Pour un anniversaire, un départ en retraite ou vos cadeaux d&apos;entreprise : dites qui vous voulez gâter et votre budget, Guillaume compose le coffret de vins naturels et de bières artisanales.</p>
          </div>
          <div>
            <p>Vous hésitez ? Offrez la <b>carte cadeau La Cave Buissonnière</b> ({s.giftCardAmounts.map((a) => `${a} €`).join(", ")}), en vente sur nos marchés : le bénéficiaire choisit librement parmi les vins, les articles de cave et les prestations, comme une dégustation à domicile.</p>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn ghost" href="/vins?type=coffret">Voir les coffrets et cartes cadeaux</Link>
              <a className="btn green" href="#ev-devis" data-type="Coffrets cadeaux sur mesure">Demander un coffret sur mesure</a>
            </div>
          </div>
        </div>
      </div>

      <EventTools phone={s.contact.phone} email={s.contact.email} />
    </section>
  );
}
