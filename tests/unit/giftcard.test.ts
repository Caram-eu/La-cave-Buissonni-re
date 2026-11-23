import { describe, expect, it } from "vitest";
import { checkGiftCard, generateGiftCode, giftCardAmount, normalizeGiftCode } from "@/lib/rules/giftcard";
import { randomBytes } from "node:crypto";

describe("cartes cadeaux", () => {
  it("génère des codes uniques au bon format", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateGiftCode((n) => randomBytes(n))));
    expect(codes.size).toBe(2000);
    for (const c of codes) expect(c).toMatch(/^LCB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
  it("accepte un code tapé sans tirets ni majuscules", () => {
    expect(normalizeGiftCode(" lcb 7kq2 m9xp ")).toBe("LCB-7KQ2-M9XP");
    expect(normalizeGiftCode("7KQ2M9XP")).toBe("LCB-7KQ2-M9XP");
  });
  it("refuse un code mal formé", () => {
    expect(normalizeGiftCode("LCB-7KQ2")).toBeNull();
    expect(normalizeGiftCode("LCB-0OI1-AAAA")).toBeNull();
  });
  it("prend le solde dans la limite du total", () => {
    expect(giftCardAmount(5000, 3200)).toBe(3200);
    expect(giftCardAmount(2000, 3200)).toBe(2000);
    expect(giftCardAmount(0, 3200)).toBe(0);
  });
  it("refuse une carte inconnue, désactivée, expirée ou vide", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    expect(checkGiftCard(null, now).ok).toBe(false);
    expect(checkGiftCard({ balanceCents: 1000, disabled: true, expiresAt: null }, now).ok).toBe(false);
    expect(checkGiftCard({ balanceCents: 1000, disabled: false, expiresAt: new Date("2026-11-01") }, now).ok).toBe(false);
    expect(checkGiftCard({ balanceCents: 0, disabled: false, expiresAt: null }, now).ok).toBe(false);
    expect(checkGiftCard({ balanceCents: 1000, disabled: false, expiresAt: new Date("2027-11-01") }, now).ok).toBe(true);
  });
});
