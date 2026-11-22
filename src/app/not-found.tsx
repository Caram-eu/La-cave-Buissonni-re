import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <div className="band">
        <div className="wrap empty">
          <h1>Page introuvable</h1>
          <p className="muted" style={{ margin: "10px 0 18px" }}>Cette page n&apos;existe pas ou plus. Le produit a peut-être quitté la carte.</p>
          <Link className="btn green" href="/vins">Voir nos vins</Link>
        </div>
      </div>
    </section>
  );
}
