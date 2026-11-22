"use client";

import { useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { discountApplies, formatEuros, lineTotalCents, type DiscountRule } from "@/lib/rules/pricing";
import { AddButton } from "./AddButton";

export function BuyBox({ p, rule }: { p: ProductView; rule: DiscountRule }) {
  const [qty, setQty] = useState(1);
  const total = lineTotalCents(p.priceCents, qty, p.discountEligible, rule);
  const disc = discountApplies(qty, p.discountEligible, rule);
  const missing = rule.minQty - qty;
  return (
    <>
      <div className="bigprice" aria-live="polite">
        {formatEuros(qty > 1 ? total : p.priceCents)}
        {qty > 1 && <span className="small muted" style={{ fontFamily: "'Nunito Sans'", fontSize: 16 }}> pour {qty}</span>}
      </div>
      <p className="small muted">Prix TTC.{p.discountEligible ? ` −${rule.percent} % dès ${rule.minQty} bouteilles de cette référence.` : ""}</p>
      {p.available ? (
        <div className="buyrow">
          <div className="qty big">
            <button type="button" aria-label="Une de moins" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span aria-live="polite" aria-label={`Quantité : ${qty}`}>{qty}</span>
            <button type="button" aria-label="Une de plus" onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
          </div>
          <AddButton p={p} qty={qty} label="Ajouter au panier" picSelector={() => document.getElementById("fichePic")} />
        </div>
      ) : (
        <p className="buyrow"><span className="unavail">Indisponible pour le moment</span></p>
      )}
      <p className="small" style={{ marginTop: 8, color: "#7a1f3d" }} aria-live="polite">
        {p.discountEligible && disc
          ? `Remise de ${rule.percent} % appliquée : vous économisez ${formatEuros(p.priceCents * qty - total)}.`
          : p.discountEligible && qty >= Math.max(1, rule.minQty - 3) && missing > 0
            ? `Plus que ${missing} bouteille${missing > 1 ? "s" : ""} pour profiter de −${rule.percent} %.`
            : ""}
      </p>
    </>
  );
}
