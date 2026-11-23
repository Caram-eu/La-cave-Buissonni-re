import type { Metadata } from "next";
import Link from "next/link";
import { filled, versionDate } from "@/lib/legal-text";
import { paymentConfigured } from "@/lib/server/payment";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };
export const dynamic = "force-dynamic";

export default async function Confidentialite() {
  const s = await getSettings();
  const l = s.legal;
  const online = s.onlinePayment.enabled && paymentConfigured();
  const rows: [string, string, string, string][] = [
    ["Créer et gérer votre compte client", "Prénom, nom, e-mail, téléphone, mot de passe chiffré, marché habituel", "Exécution du contrat", "Jusqu'à la suppression du compte, ou 3 ans sans connexion ni commande"],
    ["Préparer, remettre ou livrer vos commandes", "Articles, montant, téléphone, marché et date de retrait, adresse de livraison, message", "Exécution du contrat", "Durée de la relation commerciale"],
    ["Vérifier que votre adresse est dans la zone de livraison", "Commune et adresse, transmises au service public de géocodage de l'IGN", "Exécution du contrat", "Non conservées par le site au-delà de la commande"],
    ["Vous envoyer les e-mails liés à vos commandes (confirmation, rappel)", "E-mail, contenu de la commande ; journal des envois (destinataire, objet, date)", "Exécution du contrat", "Journal : 12 mois"],
    ["Respecter les obligations comptables", "Pièces liées aux commandes et paiements, conservées même après suppression du compte", "Obligation légale", "10 ans"],
    ["Vérifier que vous êtes majeur", "Attestation de majorité donnée à l'inscription, avec sa date", "Obligation légale", "Durée du compte"],
    ["Vous envoyer les arrivages et le calendrier des marchés", "Prénom, e-mail", "Consentement (case à cocher)", "Jusqu'au désabonnement, ou 3 ans sans contact"],
    ["Répondre à vos messages et demandes de devis", "Coordonnées, contenu du message", "Intérêt légitime", "3 ans"],
    ["Protéger le site contre les abus (trop de tentatives de connexion)", "Adresse IP", "Intérêt légitime", "1 heure au plus"],
  ];
  return (
    <section><div className="band"><article className="lp">
      <h1>Politique de confidentialité</h1>
      <p className="upd">Dernière mise à jour : {versionDate()}</p>
      <p>Cette page explique quelles données personnelles La Cave Buissonnière collecte sur ce site, pourquoi, combien de temps elles sont gardées et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.</p>

      <h2>Responsable du traitement</h2>
      <p>Guillaume Plantard, EI, La Cave Buissonnière, Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre. Contact : {s.contact.email}.</p>

      <h2>Données collectées et utilisations</h2>
      <div className="scroll"><table className="tbl resp">
        <thead><tr><th>Utilisation</th><th>Données</th><th>Base légale</th><th>Durée de conservation</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table></div>
      <p>Les champs obligatoires sont signalés dans les formulaires ; sans eux, le compte ou la commande ne peut pas être créé. Aucune donnée n&apos;est vendue ni utilisée pour de la publicité ciblée.</p>

      <h2>Destinataires</h2>
      <p>
        Vos données sont accessibles uniquement à Guillaume Plantard.
        {filled(l.hostName) ? ` Elles sont hébergées par ${l.hostName}, qui agit comme sous-traitant.` : ""}
        {filled(l.emailProvider) ? ` Les e-mails sont envoyés par ${l.emailProvider}, sous-traitant.` : ""}
        {online ? " Les paiements en ligne sont traités par SumUp, prestataire de paiement : vos données de carte bancaire sont saisies chez lui et ne transitent jamais par ce site." : ""}
        {" "}La vérification de la zone de livraison interroge le service public de géocodage de l&apos;IGN (Géoplateforme).
      </p>

      <h2>Transferts hors de l&apos;Union européenne</h2>
      <p>{filled(l.dataLocation) ? `Les données sont stockées dans l'Union européenne (${l.dataLocation}).` : "Les données sont stockées dans l'Union européenne."}</p>

      <h2>Sécurité</h2>
      <p>Le site est servi en connexion chiffrée (HTTPS). Les mots de passe ne sont jamais stockés en clair (chiffrement argon2). Le nombre de tentatives de connexion est limité.</p>

      <h2>Vos droits</h2>
      <p>Vous pouvez accéder à vos données, les rectifier, les effacer, en demander la portabilité, en limiter l&apos;utilisation, vous opposer à certains traitements et retirer votre consentement à tout moment. Vous pouvez aussi définir des directives sur le sort de vos données après votre décès.</p>
      <p>Depuis l&apos;espace <Link href="/compte">« Mon compte »</Link>, vous pouvez modifier vos informations, vous désinscrire des e-mails d&apos;information, <b>télécharger vos données</b> et <b>supprimer votre compte</b>. Pour toute autre demande, écrivez à {s.contact.email} ; une réponse vous est apportée dans un délai d&apos;un mois.</p>
      <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).</p>

      <h2>Mineurs</h2>
      <p>Le site vend des boissons alcooliques et est réservé aux personnes majeures. Aucune donnée n&apos;est collectée sciemment auprès de mineurs.</p>

      <h2>Cookies</h2>
      <p>Voir la <Link href="/cookies">politique cookies</Link> : uniquement des traceurs nécessaires au fonctionnement du site.</p>
    </article></div></section>
  );
}
