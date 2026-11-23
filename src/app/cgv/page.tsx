import type { Metadata } from "next";
import Link from "next/link";
import { CopyForm } from "@/components/legal/LegalTools";
import { cgvVersion } from "@/lib/legal";
import { filled, versionDate } from "@/lib/legal-text";
import { paymentConfigured } from "@/lib/server/payment";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };
export const dynamic = "force-dynamic";

export default async function Cgv() {
  const s = await getSettings();
  const l = s.legal;
  const online = s.onlinePayment.enabled && paymentConfigured();
  return (
    <section><div className="band"><article className="lp">
      <h1>Conditions générales de vente</h1>
      <p className="upd">En vigueur au {versionDate()} · version {cgvVersion(s, online)}</p>

      <h2>1. Objet</h2>
      <p>Les présentes conditions régissent les ventes conclues sur ce site entre <b>Guillaume Plantard, EI, nom commercial La Cave Buissonnière</b> (« le vendeur », coordonnées complètes dans les <Link href="/mentions-legales">mentions légales</Link>) et toute personne physique majeure agissant en qualité de consommateur (« le client »). Passer commande vaut acceptation des présentes conditions, que le client accepte en cochant la case prévue avant de valider sa commande.</p>

      <h2>2. Réservé aux personnes majeures</h2>
      <p>La vente de boissons alcooliques est interdite aux mineurs. Pour commander, le client crée un compte et certifie avoir 18 ans ou plus. Le vendeur peut demander une pièce d&apos;identité au retrait ou à la livraison ; si la majorité n&apos;est pas justifiée, la commande n&apos;est pas remise et elle est annulée.</p>

      <h2>3. Produits</h2>
      <p>Les produits sont décrits le plus fidèlement possible (domaine, région, cépage, millésime, contenance). Les illustrations sont non contractuelles. Les vins naturels sont des produits vivants : de légères variations de goût, de couleur ou un dépôt naturel peuvent apparaître et ne constituent pas un défaut. Les offres sont valables dans la limite des stocks disponibles ; un millésime peut être remplacé par le suivant après accord du client.</p>
      <p>Conformément à l&apos;article L. 3341-4 du Code de la santé publique, des éthylotests sont proposés à la vente.</p>

      <h2>4. Prix</h2>
      <p>Les prix sont indiqués en euros, toutes taxes comprises (TVA incluse). Le prix applicable est celui affiché au moment de la validation de la commande. Le retrait sur un marché est gratuit. Les frais de livraison à domicile ou d&apos;expédition dépendent de la distance et du nombre de bouteilles : ils sont communiqués au client par téléphone avant l&apos;envoi, et le client peut alors annuler sa commande sans frais.</p>
      <p>À partir de {s.discountMinQty} bouteilles d&apos;une même référence de vin, une remise de {s.discountPercent} % est appliquée sur ces bouteilles. Elle ne s&apos;applique pas aux bières, jus, sirops et eaux, ni aux éthylotests et aux cartes cadeaux.</p>
      <p>La carte cadeau La Cave Buissonnière est vendue sur les marchés. Elle permet à son bénéficiaire de choisir parmi les vins, les articles de cave et les prestations, sur les marchés ou sur ce site en saisissant son code au moment de la commande.{filled(l.giftCardValidity) ? ` Elle est valable ${l.giftCardValidity} à compter de son achat.` : ""} Le montant utilisé sur une commande annulée est rendu à la carte.</p>

      <h2>5. Commande</h2>
      <p>Le client ajoute ses produits au panier, valide son panier, se connecte à son compte, choisit le retrait sur un marché (date et lieu), la livraison à domicile ou l&apos;expédition, indique un numéro de téléphone, vérifie le récapitulatif, accepte les présentes conditions, puis confirme en cliquant sur le bouton « Commander avec obligation de paiement ». Un récapitulatif de la commande lui est transmis par e-mail.</p>
      <p>Pour un retrait sur un marché, la commande doit être passée au plus tard à {s.cutoffHour} h la veille du marché (heure de Paris). Il est aussi possible de commander par e-mail ou par SMS, dans le même délai.</p>
      <p>Le vendeur peut refuser ou annuler une commande en cas de litige antérieur avec le client, de doute sur la majorité du client ou de produit devenu indisponible ; le client en est informé et rien ne lui est facturé.</p>

      <h2>6. Paiement</h2>
      <p>
        Le paiement s&apos;effectue au moment du retrait ou de la livraison, par {s.paymentMethods}
        {online ? ", ou à la commande, en ligne par carte bancaire sur la page de paiement sécurisée de notre prestataire SumUp (les frais de livraison ou d'expédition restent réglés à part)" : ""}.
        La propriété des produits est transférée au client au paiement complet ; les risques lui sont transférés au moment où il prend possession des produits.
      </p>

      <h2>7. Retrait, livraison et expédition</h2>
      <p><b>Retrait sur un marché</b> : la commande est préparée et remise au stand de La Cave Buissonnière à la date et au marché choisis. Si le marché est annulé, le client est prévenu et une autre date lui est proposée. Une commande non retirée est conservée jusqu&apos;au marché suivant du même lieu, puis annulée sans frais.</p>
      <p><b>Livraison à domicile</b> : proposée aux clients dont l&apos;adresse se trouve à moins de {s.deliveryRadiusKm} km (à vol d&apos;oiseau) de Dompierre-sur-Besbre. La date et les conditions sont convenues par téléphone avec le client et la livraison intervient au plus tard 30 jours après la commande. Les bouteilles sont transportées dans un caisson réfrigéré entre 11 et 13 °C.</p>
      <p><b>Expédition</b> : pour les clients plus éloignés, les commandes sont expédiées par UPS, à domicile ou en point relais, sous 72 heures environ. Les expéditions partent le mardi et le mercredi. La procédure et les frais sont précisés par téléphone avant l&apos;envoi.</p>
      <p>Le client est invité à vérifier ses produits à la remise et à signaler sans délai toute bouteille cassée ou manquante.</p>

      <h2>8. Droit de rétractation</h2>
      <p>Le client dispose d&apos;un délai de <b>14 jours</b> à compter de la remise des produits pour se rétracter, sans avoir à se justifier ni à payer de pénalité (articles L. 221-18 et suivants du Code de la consommation). Il notifie sa décision par e-mail, par courrier ou au stand, au moyen d&apos;une déclaration dénuée d&apos;ambiguïté ou du formulaire ci-dessous.</p>
      <p>Les produits doivent être rendus complets, bouchés et dans leur état d&apos;origine dans les 14 jours suivant la rétractation, au stand sur un marché (sans frais) ou par envoi à l&apos;adresse du vendeur (frais à la charge du client). Le remboursement intervient dans les 14 jours suivant la rétractation, par le même moyen de paiement ; il peut être différé jusqu&apos;à la récupération des produits. La responsabilité du client peut être engagée en cas de dépréciation des produits résultant de manipulations autres que celles nécessaires pour en établir la nature.</p>
      <p>Le droit de rétractation ne s&apos;applique pas aux coffrets composés sur mesure selon les choix du client (article L. 221-28, 3° du Code de la consommation).</p>

      <h2>9. Garanties légales</h2>
      <p>Le client bénéficie de la garantie légale de conformité (articles L. 217-3 et suivants du Code de la consommation) pendant deux ans à compter de la remise du produit, et de la garantie des vices cachés (articles 1641 et suivants du Code civil). En cas de défaut de conformité, le client peut obtenir le remplacement du produit ou, à défaut, son remboursement.</p>
      {filled(l.warrantyText) && <div className="form-model" style={{ whiteSpace: "pre-wrap" }}>{l.warrantyText}</div>}

      <h2>10. Réclamations et médiation</h2>
      <p>Toute réclamation peut être adressée à {s.contact.email}, par téléphone au {s.contact.phone} ou au stand.{filled(l.mediatorName) ? " En cas de désaccord persistant, le client peut recourir gratuitement au médiateur de la consommation dont relève le vendeur :" : ""}</p>
      {filled(l.mediatorName) && <p>{l.mediatorName}{filled(l.mediatorAddress) && <><br />{l.mediatorAddress}</>}{filled(l.mediatorWebsite) && <><br />{l.mediatorWebsite}</>}</p>}

      <h2>11. Données personnelles</h2>
      <p>Les données transmises lors de la commande sont traitées conformément à la <Link href="/confidentialite">politique de confidentialité</Link>.</p>

      <h2>12. Droit applicable et litiges</h2>
      <p>Les présentes conditions sont soumises au droit français. À défaut d&apos;accord amiable ou de médiation, le litige est porté devant la juridiction compétente selon les règles de droit commun.</p>

      <h2 id="retractation">Annexe : formulaire de rétractation</h2>
      <div className="form-model" id="formulaire-retractation">
        <p>À l&apos;attention de Guillaume Plantard, La Cave Buissonnière, Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre, {s.contact.email} :</p>
        <p>Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :</p>
        <p>Commandé le : ………………… / reçu le : …………………<br />Numéro de commande : …………………<br />Nom du consommateur : …………………<br />Adresse du consommateur : …………………<br />Signature du consommateur (uniquement en cas de notification sur papier) :<br />Date : …………………</p>
      </div>
      <CopyForm targetId="formulaire-retractation" />
    </article></div></section>
  );
}
