import Link from "next/link";
import type { Settings } from "@/lib/settings-defaults";

export function Footer({ contact }: { contact: Settings["contact"] }) {
  return (
    <footer>
      <div className="band">
        <div className="wrap">
          <div className="cols">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="La Cave Buissonnière" width={180} height={124} style={{ width: 180, height: "auto", background: "#fff", borderRadius: 10, padding: 6 }} loading="lazy" />
            </div>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Contact</h2>
              <p>
                {contact.name}
                <br />
                Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre
                <br />
                <a href={`tel:${contact.phoneIntl}`}>{contact.phone}</a>
                <br />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </p>
            </div>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Suivre la cave</h2>
              <p>
                <a href={contact.facebook} rel="noopener">Facebook : lacavebuissonniere</a>
              </p>
              <p style={{ marginTop: 6 }}>Lieux et horaires des marchés mis à jour chaque semaine.</p>
            </div>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Le site</h2>
              <p>
                <Link href="/">La cave</Link> · <Link href="/vins">Nos vins</Link> · <Link href="/evenements">Événements et dégustations</Link> · <Link href="/compte">Mon compte</Link> · <Link href="/panier">Panier</Link>
              </p>
              <h2 style={{ fontSize: 24, margin: "14px 0 8px" }}>Informations légales</h2>
              <p>
                <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgv">Conditions générales de vente</Link> · <Link href="/confidentialite">Confidentialité</Link> · <Link href="/cookies">Cookies</Link>
              </p>
            </div>
          </div>
          <div className="legal">
            L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération. La vente d&apos;alcool est interdite aux mineurs de moins de 18 ans.
          </div>
        </div>
      </div>
    </footer>
  );
}
