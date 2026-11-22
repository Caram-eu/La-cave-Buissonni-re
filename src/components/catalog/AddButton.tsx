"use client";

import { glassColor, type ProductView } from "@/lib/catalog";
import { useCart } from "../cart/CartProvider";

export function AddButton({ p, qty = 1, picSelector, label = "Ajouter" }: { p: ProductView; qty?: number; picSelector?: () => HTMLElement | null; label?: string }) {
  const { add } = useCart();
  if (p.kind === "CARTE_CADEAU") return <span className="giftnote">En vente sur nos marchés</span>;
  if (!p.available) return <span className="unavail">Indisponible</span>;
  return (
    <button
      className="btn green"
      type="button"
      aria-label={label === "Ajouter" ? `Ajouter « ${p.name} » au panier` : undefined}
      onClick={(e) => add({ slug: p.slug, name: p.name, color: glassColor(p), qty, from: picSelector ? picSelector() : (e.currentTarget.closest(".prod")?.querySelector(".pic") as HTMLElement | null) })}
    >
      {label}
    </button>
  );
}
