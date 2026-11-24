import type { Metadata } from "next";
import { ClearLocalData } from "@/components/legal/LegalTools";
import { versionDate } from "@/lib/legal-text";

export const metadata: Metadata = { title: "Cookies et traceurs", alternates: { canonical: "/cookies" } };

const TRACEURS: [string, string, string, string][] = [
  ["lcb_me", "Cookie", "Vous garder connecté à votre compte", "30 jours, ou jusqu'à la déconnexion"],
  ["lcb_cart", "Stockage local", "Garder le contenu de votre panier", "Jusqu'à la commande ou à l'effacement par votre navigateur"],
  ["lcb_prefTown", "Stockage local", "Retenir le marché choisi sur la carte (« Commander pour ce marché »)", "Jusqu'à la commande"],
  ["lcb_trail", "Stockage de session", "Afficher la flèche « Retour » vers la page précédente", "Jusqu'à la fermeture de l'onglet"],
  ["lcb_cookies", "Stockage local", "Retenir que vous avez fermé le bandeau d'information", "13 mois"],
];

export default function Cookies() {
  return (
    <section><div className="band"><article className="lp">
      <h1>Cookies et traceurs</h1>
      <p className="upd">Dernière mise à jour : {versionDate()}</p>
      <p>Un traceur est une petite information enregistrée dans votre navigateur (cookie ou stockage local) lorsque vous visitez un site.</p>

      <h2>Ce que ce site utilise</h2>
      <p>Ce site n&apos;utilise <b>que des traceurs strictement nécessaires</b> à son fonctionnement. Ils sont exemptés de consentement selon les règles de la CNIL, c&apos;est pourquoi aucun choix ne vous est demandé.</p>
      <div className="scroll"><table className="tbl resp">
        <thead><tr><th>Nom</th><th>Type</th><th>Rôle</th><th>Durée</th></tr></thead>
        <tbody>{TRACEURS.map((t) => <tr key={t[0]}>{t.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table></div>

      <h2>Ce que ce site n&apos;utilise pas</h2>
      <p>Aucun outil de mesure d&apos;audience, aucun traceur publicitaire et aucun bouton de réseau social intégré. La vidéo et les polices de caractères sont hébergées sur le site lui-même. Les liens vers Facebook et Google Maps ouvrent ces services dans une nouvelle page : ils appliquent alors leur propre politique.</p>

      <h2>Supprimer ces traceurs</h2>
      <p>Vous pouvez les effacer à tout moment dans les réglages de votre navigateur (rubrique confidentialité, données de sites). Votre panier et votre connexion seront alors perdus.</p>
      <ClearLocalData />

      <h2>Évolutions</h2>
      <p>Si un outil de statistiques ou de publicité était ajouté, votre accord vous serait demandé au préalable par un bandeau permettant d&apos;accepter ou de refuser aussi facilement, et cette page serait mise à jour.</p>
    </article></div></section>
  );
}
