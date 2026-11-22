import { describe, expect, it } from "vitest";
import { cartTotals, lineTotalCents } from "@/lib/rules/pricing";

const rule = { percent: 5, minQty: 6 };

describe("remise 6 bouteilles", () => {
  it("ne s'applique pas sous 6 bouteilles", () => {
    expect(lineTotalCents(1400, 5, true, rule)).toBe(7000);
  });
  it("s'applique dès 6 bouteilles de la même référence", () => {
    expect(lineTotalCents(1400, 6, true, rule)).toBe(7980); // 84 € - 5 %
  });
  it("arrondit au centime", () => {
    expect(lineTotalCents(1356, 6, true, rule)).toBe(7729); // 81,36 € x 0,95 = 77,292
  });
  it("ne s'applique pas aux produits exclus (bières, jus, eaux, éthylotests)", () => {
    expect(lineTotalCents(700, 12, false, rule)).toBe(8400);
  });
  it("ne cumule pas des références différentes", () => {
    const t = cartTotals(
      [
        { unitCents: 1000, qty: 3, eligible: true },
        { unitCents: 1200, qty: 3, eligible: true },
      ],
      rule,
    );
    expect(t.discountCents).toBe(0);
    expect(t.count).toBe(6);
  });
  it("suit les réglages de l'administration", () => {
    expect(lineTotalCents(1000, 12, true, { percent: 10, minQty: 12 })).toBe(10800);
    expect(lineTotalCents(1000, 11, true, { percent: 10, minQty: 12 })).toBe(11000);
  });
  it("calcule les totaux du panier", () => {
    expect(cartTotals([{ unitCents: 1500, qty: 6, eligible: true }, { unitCents: 150, qty: 1, eligible: false }], rule)).toEqual({
      grossCents: 9150,
      discountCents: 450,
      totalCents: 8700,
      count: 7,
    });
  });
});
