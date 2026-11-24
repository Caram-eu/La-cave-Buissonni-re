import { createHash } from "node:crypto";
import type { Settings } from "./settings-defaults";

/** Date du texte des CGV (à changer à chaque modification du texte dans src/app/cgv/page.tsx). */
export const CGV_VERSION = "2026-11-21";

/**
 * Version complète des CGV acceptées : date du texte + empreinte des réglages qui y figurent
 * (remise, rayon, heure limite, paiement, carte cadeau, médiateur, encadré de garantie).
 * Ainsi chaque commande garde la trace exacte des conditions acceptées, même si un réglage change.
 */
export function cgvVersion(s: Settings, onlinePayment: boolean): string {
  const parts = [
    s.discountPercent, s.discountMinQty, s.deliveryRadiusKm, s.cutoffHour, s.paymentMethods, onlinePayment,
    s.legal.giftCardValidity, s.legal.mediatorName, s.legal.mediatorAddress, s.legal.mediatorWebsite, s.legal.warrantyText,
  ].join("|");
  return `${CGV_VERSION}-${createHash("sha256").update(parts).digest("hex").slice(0, 8)}`;
}
