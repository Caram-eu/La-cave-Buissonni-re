import type { ProductView } from "@/lib/catalog";

type P = Pick<ProductView, "kind" | "boxKind" | "isBeer" | "bottleLabel" | "volumeCl" | "vintage" | "color" | "photoUrl" | "name">;

/** Photo de la bouteille si elle existe, sinon le dessin hachuré de la maquette. */
export function ProductPicture({ p, photo = true }: { p: P; photo?: boolean }) {
  if (photo && p.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.photoUrl} alt="" loading="lazy" decoding="async" />;
  }
  return <BottleArt p={p} />;
}

export function BottleArt({ p }: { p: P }) {
  if (p.kind === "CARTE_CADEAU")
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <rect x="10" y="28" width="100" height="64" rx="10" fill="#2d3e46" />
        <rect x="10" y="28" width="100" height="64" rx="10" fill="none" stroke="#89ba13" strokeWidth="3" />
        <use href="#wb" transform="translate(20,38) scale(.2)" fill="url(#h-bulles)" stroke="#fff" strokeWidth="6" />
        <use href="#wb" transform="translate(33,38) scale(.2)" fill="#fff" />
        <text x="76" y="58" textAnchor="middle" fontFamily="Kalam" fontWeight="700" fontSize="16" fill="#fff">carte</text>
        <text x="76" y="76" textAnchor="middle" fontFamily="Kalam" fontWeight="700" fontSize="16" fill="#89ba13">cadeau</text>
      </svg>
    );
  if (p.boxKind === "biere")
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {[22, 40, 58, 76].map((x, i) => (
          <use key={x} href="#bb" transform={`translate(${x},${4 + (i % 2) * 6}) scale(.27)`} fill={`url(#h-${["ipa", "ambree", "blanche", "kriek"][i]})`} stroke="#2d3e46" strokeWidth="6" />
        ))}
        <rect x="10" y="62" width="100" height="52" rx="6" fill="#89ba13" stroke="#2d3e46" strokeWidth="3" />
        <text x="60" y="94" textAnchor="middle" fontFamily="Kalam" fontWeight="700" fontSize="17" fill="#2d3e46">12 bières</text>
      </svg>
    );
  if (p.kind === "ACCESSOIRE")
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <rect x="46" y="10" width="28" height="100" rx="14" fill="#fff" stroke="#2d3e46" strokeWidth="4" />
        <rect x="50" y="58" width="20" height="30" rx="4" fill="#e8d36a" />
        <path d="M46,40h28" stroke="#2d3e46" strokeWidth="3" />
        <circle cx="60" cy="26" r="5" fill="#89ba13" />
      </svg>
    );
  if (p.boxKind)
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <use href="#wb" transform="translate(22,6) scale(.3)" fill="url(#h-rouge)" stroke="#2d3e46" strokeWidth="5" />
        <use href="#wb" transform="translate(48,0) scale(.3)" fill="#fff" stroke="#2d3e46" strokeWidth="5" />
        <use href="#wb" transform="translate(74,6) scale(.3)" fill="url(#h-bulles)" stroke="#2d3e46" strokeWidth="5" />
        <rect x="10" y="62" width="100" height="52" rx="6" fill="#89ba13" stroke="#2d3e46" strokeWidth="3" />
        <path d="M60,62v52" stroke="#fff" strokeWidth="6" />
        <text x="60" y="96" textAnchor="middle" fontFamily="Kalam" fontWeight="700" fontSize="15" fill="#2d3e46">coffret</text>
      </svg>
    );
  const beer = p.isBeer;
  const lb = p.bottleLabel || (p.volumeCl === 150 ? "Magnum" : p.vintage) || `${p.volumeCl} cl`;
  return (
    <svg viewBox="0 0 60 222" aria-hidden="true">
      <use href={beer ? "#bb" : "#wb"} fill={`url(#h-${p.color})`} stroke="#2d3e46" strokeWidth="4" />
      <rect x={beer ? 10 : 6} y={beer ? 140 : 138} width={beer ? 40 : 48} height="44" rx="3" fill="#fff" stroke="#2d3e46" strokeWidth="2.5" />
      <text x="30" y={beer ? 167 : 165} textAnchor="middle" fontFamily="Kalam" fontWeight="700" fontSize={lb.length > 4 ? 12 : beer ? 13 : 15} fill="#2d3e46">
        {lb}
      </text>
    </svg>
  );
}
