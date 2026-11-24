/**
 * Cartes cadeaux : vendues sur les marchés, saisies par Guillaume dans l'administration,
 * utilisables en ligne avec leur code. Le montant utilisé est bloqué à la commande,
 * débité quand la commande est remise et rendu à la carte si elle est annulée.
 */

// Sans 0/O, 1/I/L pour éviter les erreurs de saisie
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Code du type LCB-7KQ2-M9XP. `rand` renvoie des octets aléatoires (crypto). */
export function generateGiftCode(rand: (n: number) => Uint8Array): string {
  const bytes = rand(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `LCB-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/** Accepte « lcb 7kq2 m9xp », « LCB7KQ2M9XP »... et renvoie LCB-7KQ2-M9XP, ou null si le format est faux. */
export function normalizeGiftCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = s.startsWith("LCB") ? s.slice(3) : s;
  if (body.length !== 8 || [...body].some((c) => !ALPHABET.includes(c))) return null;
  return `LCB-${body.slice(0, 4)}-${body.slice(4)}`;
}

export type GiftCardState = { balanceCents: number; disabled: boolean; expiresAt: Date | null };

export type GiftCardCheck = { ok: true } | { ok: false; reason: string };

export function checkGiftCard(card: GiftCardState | null, now: Date): GiftCardCheck {
  if (!card) return { ok: false, reason: "Ce code de carte cadeau n'existe pas." };
  if (card.disabled) return { ok: false, reason: "Cette carte cadeau n'est plus valable." };
  if (card.expiresAt && card.expiresAt < now) return { ok: false, reason: "Cette carte cadeau a expiré." };
  if (card.balanceCents <= 0) return { ok: false, reason: "Cette carte cadeau est entièrement utilisée." };
  return { ok: true };
}

/** Montant pris sur la carte : le solde, dans la limite du total de la commande. */
export function giftCardAmount(balanceCents: number, orderTotalCents: number): number {
  return Math.max(0, Math.min(balanceCents, orderTotalCents));
}
