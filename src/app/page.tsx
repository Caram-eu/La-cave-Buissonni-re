import Link from "next/link";
import { preload } from "react-dom";
import { MarketsSection } from "@/components/markets/MarketsSection";
import type { TownPin } from "@/components/markets/types";
import { formatHours, upcomingMarkets, upcomingSpecials } from "@/lib/rules/markets";
import { DAYS } from "@/lib/rules/paris-time";
import { loadMarkets } from "@/lib/server/markets";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  // l'aperçu de la vidéo est le plus grand élément visible au chargement : on le demande en priorité
  preload("/video/poster.webp", { as: "image", fetchPriority: "high" });
  const [s, { weekly, exceptions }] = await Promise.all([getSettings(), loadMarkets()]);
  const now = new Date();
  const upcoming = upcomingMarkets(now, weekly, exceptions, { days: 70, hideFinished: true });
  const specials = upcomingSpecials(now, exceptions).map((e) => ({ key: e.id!, date: e.date, town: e.town, place: e.place, hours: e.hours, note: e.note, special: true }));

  const pins: TownPin[] = [];
  const addPin = (p: TownPin) => !pins.some((x) => x.town === p.town) && pins.push(p);
  weekly.forEach((m) => addPin({ town: m.town, department: m.department, lon: m.lon, lat: m.lat }));
  exceptions.forEach((e) => e.lon != null && e.lat != null && addPin({ town: e.town, department: "", lon: e.lon, lat: e.lat }));
  addPin({ town: s.base.town, department: "03", lon: s.base.lon, lat: s.base.lat });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LiquorStore",
    name: "La Cave Buissonnière",
    description: "Caviste ambulant en vins naturels et bières artisanales sur les marchés de l'Allier, de la Nièvre et de la Saône-et-Loire.",
    url: process.env.SITE_URL || undefined,
    telephone: s.contact.phoneIntl,
    email: s.contact.email,
    image: "/img/marche-stand.jpg",
    founder: { "@type": "Person", name: s.contact.name },
    foundingDate: "2017-11-16",
    address: { "@type": "PostalAddress", streetAddress: "Lieu-dit Le Cros", postalCode: "03290", addressLocality: "Dompierre-sur-Besbre", addressCountry: "FR" },
    areaServed: { "@type": "GeoCircle", geoMidpoint: { "@type": "GeoCoordinates", latitude: s.base.lat, longitude: s.base.lon }, geoRadius: s.deliveryRadiusKm * 1000 },
    sameAs: [s.contact.facebook],
    event: upcoming.slice(0, 10).map((o) => ({
      "@type": "Event",
      name: `La Cave Buissonnière au marché de ${o.town}`,
      startDate: o.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: o.place, address: { "@type": "PostalAddress", addressLocality: o.town, addressCountry: "FR" } },
    })),
    openingHoursSpecification: weekly.map((m) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][m.weekday]}`,
      description: `${DAYS[m.weekday]} : marché de ${m.town}, ${m.place}, ${formatHours(m.hours)}`,
    })),
  };

  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="band">
        <div className="wrap hero">
          <div>
            <h1 className="kick">
              Le caviste
              <br />
              qui vient <span>à vous</span>
            </h1>
            <p className="lead">
              La Cave Buissonnière, c&apos;est un camion-cave qui sillonne les marchés de l&apos;Allier, de la Saône-et-Loire et de la Nièvre avec des vins naturels et des bières artisanales venus de producteurs de toute la France.
            </p>
            <div className="row">
              <Link className="btn green" href="/vins">Voir nos vins</Link>
              <a className="btn ghost" href="#marches">Où nous trouver</a>
            </div>
          </div>
          <div>
            <div className="player">
              <video src="/video/presentation.mp4" poster="/video/poster.webp" controls playsInline preload="none" aria-label="Vidéo de présentation de La Cave Buissonnière, 30 secondes" />
            </div>
          </div>
        </div>
        <div className="wrap road" />
      </div>

      <div className="band svcband">
        <div className="wrap">
          <h2>Ce que propose la cave</h2>
          <p className="muted" style={{ marginTop: 8, maxWidth: "40em" }}>
            Rouge, blanc, blonde ou brune : chaque bouteille est choisie chez des vignerons et brasseurs qui travaillent proprement, et racontée par celui qui l&apos;a goûtée.
          </p>
          <div className="svc">
            <article>
              <svg viewBox="0 0 60 60" aria-hidden="true"><use href="#wb" transform="translate(16,2) scale(.25)" fill="#89ba13" /><use href="#bb" transform="translate(30,6) scale(.24)" fill="#fff" stroke="#2d3e46" strokeWidth="8" /></svg>
              <h3>Vins naturels &amp; bières artisanales</h3>
              <p className="muted">Des producteurs de diverses régions françaises, sélectionnés et dégustés un par un.</p>
            </article>
            <article>
              <svg viewBox="0 0 60 60" aria-hidden="true"><rect x="8" y="24" width="44" height="30" rx="4" fill="#89ba13" /><rect x="5" y="16" width="50" height="10" rx="3" fill="#2d3e46" /><path d="M30,16v38" stroke="#fff" strokeWidth="5" /></svg>
              <h3>Coffrets cadeaux</h3>
              <p className="muted">Composés sur mesure selon vos goûts et votre budget. Ou offrez la carte cadeau : le bénéficiaire choisit ses vins ou une prestation.</p>
            </article>
            <article>
              <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M10,6h16c0,18-3,25-8,25s-8-7-8-25z M34,6h16c0,18-3,25-8,25s-8-7-8-25z" fill="#89ba13" /><path d="M18,31v18M42,31v18M11,51h14M35,51h14" stroke="#2d3e46" strokeWidth="4" strokeLinecap="round" /></svg>
              <h3>Dégustations à domicile</h3>
              <p className="muted">Réunions-ventes et ateliers découverte : dégustation ou accords mets et vins, selon vos envies.</p>
            </article>
            <article>
              <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30,52C8,37 5,22 15,13C22,7 28,11 30,17C32,11 38,7 45,13C55,22 52,37 30,52z" fill="#89ba13" /></svg>
              <h3>Mariages &amp; événements</h3>
              <p className="muted">Accords mets et vins adaptés à votre budget, avec reprise des bouteilles non ouvertes.</p>
            </article>
          </div>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn green" href="/evenements">Découvrir les prestations événements et dégustations</Link>
          </div>
        </div>
      </div>

      <div className="band">
        <div className="wrap who">
          <figure className="portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/guillaume-portrait.jpg" alt="Guillaume Plantard, sommelier-conseil et caviste de La Cave Buissonnière, une bouteille de vin à la main" width={800} height={800} loading="lazy" />
          </figure>
          <div>
            <h2>Une cave sur roues</h2>
            <p style={{ marginTop: 12 }}>
              Je suis Guillaume Plantard, sommelier-conseil et caviste. J&apos;ai lancé La Cave Buissonnière le 16 novembre 2017, jour du Beaujolais nouveau. Je n&apos;ai pas de boutique fixe : ma boutique, c&apos;est mon camion, qui vient jusqu&apos;à vous de marché en marché. Je garde mon stock dans ma cave, et le camion embarque un caisson réfrigéré pour que les vins voyagent au frais.
            </p>
            <p style={{ marginTop: 12 }}>
              Vous pouvez aussi commander ici : je vous remets votre commande sur le marché de votre choix, ou je vous la livre à domicile jusqu&apos;à {s.deliveryRadiusKm} km autour de Dompierre. Pour les plus lointains, j&apos;expédie aussi par UPS.
            </p>
            <div className="facts" style={{ marginTop: 20 }}>
              <div><b>2017</b>Création de la cave</div>
              <div><b>11-13 °C</b>Température du caisson réfrigéré</div>
              <div><b>{s.deliveryRadiusKm} km</b>Rayon de livraison autour de Dompierre</div>
            </div>
          </div>
        </div>
      </div>

      <div className="band" style={{ paddingTop: 0 }}>
        <div className="wrap photos">
          <figure className="ph-wide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/guillaume-marche.jpg" alt="Guillaume tend un verre de dégustation à un client, derrière les bouteilles de son stand" width={1200} height={800} loading="lazy" />
            <figcaption>Un verre à goûter avant de choisir : au stand, on déguste et on discute.</figcaption>
          </figure>
          <figure className="ph-sq">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/marche-stand.jpg" alt="Le stand de La Cave Buissonnière sous sa tente, une longue table de bouteilles de vins naturels" width={800} height={800} loading="lazy" />
            <figcaption>Le stand, sur un marché de la région.</figcaption>
          </figure>
        </div>
      </div>

      <div className="band" id="marches" style={{ background: "var(--soft)" }}>
        <div className="wrap">
          <h2>Les marchés de la semaine</h2>
          <p className="muted" style={{ marginTop: 8 }}>Touchez un marché, dans la liste ou sur la carte, pour voir ses jours et ses prochaines dates.</p>
          <MarketsSection
            weekly={weekly.map(({ id, town, weekday, place, hours }) => ({ id, town, weekday, place, hours }))}
            pins={pins}
            baseTown={s.base.town}
            upcoming={upcoming}
            specials={specials}
            servedDeps={[...new Set([...weekly.map((m) => m.department), "03"])]}
            radiusKm={s.deliveryRadiusKm}
            phone={s.contact.phone}
          />
        </div>
      </div>
    </section>
  );
}
