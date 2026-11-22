/** Règle de remise : -percent % sur une ligne dès minQty bouteilles de la même référence. */
export type DiscountRule = { percent: number; minQty: number };

export function discountApplies(qty: number, eligible: boolean, rule: DiscountRule): boolean {
  return eligible && rule.percent > 0 && qty >= rule.minQty;
}

/** Total d'une ligne en centimes, remise comprise (arrondi au centime). */
export function lineTotalCents(unitCents: number, qty: number, eligible: boolean, rule: DiscountRule): number {
  const gross = unitCents * qty;
  if (!discountApplies(qty, eligible, rule)) return gross;
  return Math.round((gross * (100 - rule.percent)) / 100);
}

export type PricedLine = { unitCents: number; qty: number; eligible: boolean };

export function cartTotals(lines: PricedLine[], rule: DiscountRule) {
  let gross = 0;
  let net = 0;
  let count = 0;
  for (const l of lines) {
    gross += l.unitCents * l.qty;
    net += lineTotalCents(l.unitCents, l.qty, l.eligible, rule);
    count += l.qty;
  }
  return { grossCents: gross, discountCents: gross - net, totalCents: net, count };
}

export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
