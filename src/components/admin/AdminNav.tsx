"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/admin", "Tableau de bord"],
  ["/admin/commandes", "Commandes"],
  ["/admin/preparation", "Préparation"],
  ["/admin/produits", "Produits"],
  ["/admin/marches", "Marchés"],
  ["/admin/devis", "Devis"],
  ["/admin/cartes-cadeaux", "Cartes cadeaux"],
  ["/admin/lettre", "Lettre d'information"],
  ["/admin/reglages", "Réglages"],
] as const;

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="admnav noprint" aria-label="Administration">
      {ITEMS.map(([href, label]) => {
        const on = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            {label}
            {counts[href] ? <span className="cnt" aria-label={`${counts[href]} à traiter`}>{counts[href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
