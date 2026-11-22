import { describe, expect, it } from "vitest";
import { highlight, normalize } from "@/lib/rules/text";

describe("recherche sans accents", () => {
  it("normalise", () => expect(normalize("Côtes du Rhône")).toBe("cotes du rhone"));
  it("surligne en conservant les accents d'origine", () => {
    expect(highlight("Saint-Pourçain", "pourcain")).toEqual([
      { t: "Saint-", m: false },
      { t: "Pourçain", m: true },
    ]);
  });
  it("ignore les mots d'une lettre", () => expect(highlight("Gamay", "g")).toEqual([{ t: "Gamay", m: false }]));
});
