import type { Metadata } from "next";
import Link from "next/link";
import { filled, versionDate } from "@/lib/legal-text";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };
export const dynamic = "force-dynamic";

export default async function MentionsLegales() {
  const s = await getSettings();
  const l = s.legal;
  return (
    <section><div className="band"><article className="lp">
      <h1>Mentions légales</h1>
      <p className="upd">Dernière mise à jour : {versionDate()}</p>

      <h2>Éditeur du site</h2>
      <p>Le site est édité par <b>Guillaume Plantard, entrepreneur individuel (EI)</b>, exerçant sous le nom commercial <b>La Cave Buissonnière</b>.</p>
      <dl className="id">
        <dt>Adresse</dt><dd>Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre, France</dd>
        <dt>Téléphone</dt><dd>{s.contact.phone}</dd>
        <dt>E-mail</dt><dd>{s.contact.email}</dd>
        {filled(l.siret) && <><dt>SIREN / SIRET</dt><dd>{l.siret.replace(/\s?\d{5}$/, "").trim()} / {l.siret}</dd></>}
        {filled(l.rcs) && <><dt>Immatriculation</dt><dd>{l.rcs}</dd></>}
        {filled(l.vat) && <><dt>TVA intracommunautaire</dt><dd>{l.vat}</dd></>}
        <dt>Activité</dt><dd>Commerce de détail de vins, bières, articles de cave et produits alimentaires (code NAF 47.99A)</dd>
      </dl>

      <h2>Licence de vente de boissons alcooliques</h2>
      <p>
        La vente en ligne de boissons alcooliques est assimilée à la vente à emporter. La Cave Buissonnière exerce cette activité sous couvert de la <b>petite licence à emporter</b>
        {filled(l.licenceNumber) ? <> n° {l.licenceNumber}</> : null}
        {filled(l.licenceTown) ? <>, déclarée auprès de la mairie de {l.licenceTown}</> : null}.
      </p>

      <h2>Directeur de la publication</h2>
      <p>Guillaume Plantard, joignable à l&apos;adresse {s.contact.email}.</p>

      {filled(l.hostName) && (
        <>
          <h2>Hébergeur</h2>
          <p>{l.hostName}{filled(l.hostAddress) && <><br />{l.hostAddress}</>}{filled(l.hostPhone) && <><br />{l.hostPhone}</>}</p>
        </>
      )}

      <h2>Protection de la santé</h2>
      <p>L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.</p>
      <p>La vente de boissons alcooliques aux mineurs de moins de 18 ans est interdite (article L. 3342-1 du Code de la santé publique). Une pièce d&apos;identité peut être demandée lors du retrait ou de la livraison d&apos;une commande ; à défaut, la commande ne sera pas remise.</p>
      <p>Des éthylotests sont proposés à la vente sur le site et sur les marchés.</p>

      <h2>Propriété intellectuelle</h2>
      <p>Le nom La Cave Buissonnière, le logo, les textes, la vidéo de présentation, les illustrations et la mise en page du site sont la propriété de l&apos;éditeur ou utilisés avec l&apos;autorisation de leurs auteurs. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite préalable est interdite.</p>
      <p>Les illustrations des produits sont non contractuelles.</p>

      <h2>Responsabilité et liens</h2>
      <p>L&apos;éditeur s&apos;efforce de tenir à jour les informations publiées, notamment les jours et lieux de marché, qui peuvent toutefois changer (météo, annulation d&apos;un marché, congés). Les informations à jour sont publiées sur la page Facebook de la cave.</p>
      <p>Le site contient des liens vers des sites extérieurs (Facebook, Google Maps). L&apos;éditeur n&apos;est pas responsable de leur contenu ni de leurs pratiques en matière de données personnelles.</p>

      <h2>Signaler un contenu</h2>
      <p>Pour signaler un contenu illicite ou une erreur, écrivez à {s.contact.email} en précisant la page concernée.</p>

      <h2>Données personnelles et cookies</h2>
      <p>Voir la <Link href="/confidentialite">politique de confidentialité</Link> et la <Link href="/cookies">politique cookies</Link>.</p>

      <h2>Droit applicable</h2>
      <p>Le présent site et ses mentions légales sont soumis au droit français.</p>
    </article></div></section>
  );
}
