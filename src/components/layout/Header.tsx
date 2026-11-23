"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../cart/CartProvider";

const NAV = [
  { href: "/", v: "la-cave", label: "La cave" },
  { href: "/vins", v: "nos-vins", label: "Nos vins" },
  { href: "/evenements", v: "evenements", label: "Événements" },
];

function section(path: string) {
  if (path.startsWith("/vins")) return "nos-vins";
  if (path.startsWith("/evenements")) return "evenements";
  if (path.startsWith("/compte")) return "compte";
  if (path.startsWith("/panier")) return "panier";
  return path === "/" ? "la-cave" : "";
}

export function Header({ firstName }: { firstName?: string | null }) {
  const path = usePathname();
  const cur = section(path);
  const { count, glassColor } = useCart();
  const h = (Math.min(count, 6) / 6) * 19;
  return (
    <header>
      <div className="hd">
        <Link className="brand" href="/" aria-label="La Cave Buissonnière, accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-252.webp" alt="La Cave Buissonnière, vins naturels" width={84} height={58} fetchPriority="low" />
        </Link>
        <nav aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link key={n.v} href={n.href} data-v={n.v} className={cur === n.v ? "on" : ""} aria-current={cur === n.v ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
          <Link href="/compte" data-v="compte" className={cur === "compte" ? "on" : ""} aria-current={cur === "compte" ? "page" : undefined} aria-label={firstName ? `${firstName}, mon compte` : "Mon compte"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4,21c1-5 4-7 8-7s7,2 8,7" />
            </svg>
            <span className="lbl">{firstName || "Mon compte"}</span>
          </Link>
          <Link href="/panier" data-v="panier" id="cartLink" className={cur === "panier" ? "on" : ""} aria-label={`Panier ${count} article${count > 1 ? "s" : ""}`}>
            <svg id="glass" viewBox="0 0 36 44" aria-hidden="true">
              <g clipPath="url(#glassClip)">
                <rect x="0" y={22 - h} width="36" height={h} fill={glassColor} style={{ transition: "y .4s, height .4s" }} />
              </g>
              <path d="M5,3 h26 c0,13 -4,19 -13,19 c-9,0 -13,-6 -13,-19z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M18,22 v14 M10,38 h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <span className="lbl">Panier</span>{" "}
            <span className="badge">{count || ""}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
