export type OrderStatus = "NOUVELLE" | "CONFIRMEE" | "PREPAREE" | "REMISE" | "ANNULEE";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NOUVELLE: "Nouvelle", CONFIRMEE: "Confirmée", PREPAREE: "Préparée", REMISE: "Remise", ANNULEE: "Annulée",
};

/**
 * Changements de statut autorisés. Une commande annulée ne revient pas en arrière
 * (le client repasse commande) ; une commande remise peut encore être annulée (rétractation).
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  NOUVELLE: ["CONFIRMEE", "PREPAREE", "REMISE", "ANNULEE"],
  CONFIRMEE: ["NOUVELLE", "PREPAREE", "REMISE", "ANNULEE"],
  PREPAREE: ["CONFIRMEE", "REMISE", "ANNULEE"],
  REMISE: ["PREPAREE", "ANNULEE"],
  ANNULEE: [],
};

export const allowedNext = (s: OrderStatus) => NEXT[s];
export const canMove = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to);

/**
 * Effet sur la carte cadeau utilisée :
 * remise -> montant débité ; annulation -> montant rendu à la carte ; retour avant remise -> de nouveau réservé.
 */
export function giftCardEffect(from: OrderStatus, to: OrderStatus): "debiter" | "liberer" | "reserver" | null {
  if (to === "ANNULEE") return "liberer";
  if (to === "REMISE") return "debiter";
  if (from === "REMISE") return "reserver";
  return null;
}
