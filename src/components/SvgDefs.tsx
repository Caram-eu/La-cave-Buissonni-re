import { COLORS } from "@/lib/catalog";

/** Formes de bouteilles et hachures partagées par tous les dessins (comme sur le logo). */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <path id="wb" d="M23,4 h14 v66 c0,20 21,28 21,52 v92 q0,6 -6,6 h-44 q-6,0 -6,-6 v-92 c0,-24 21,-32 21,-52 z" />
        <path id="bb" d="M24,30 h12 v40 c0,14 18,20 18,40 v100 q0,6 -6,6 h-36 q-6,0 -6,-6 v-100 c0,-20 18,-26 18,-40 z" />
        <clipPath id="glassClip">
          <path d="M5,3 h26 c0,13 -4,19 -13,19 c-9,0 -13,-6 -13,-19z" />
        </clipPath>
        {Object.entries(COLORS).map(([k, c]) => (
          <pattern key={k} id={`h-${k}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <rect width="8" height="8" fill="#fff" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={c} strokeWidth="4.4" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
