import { describe, expect, it } from "vitest";
import { canOrderFor, formatHours, orderableMarkets, upcomingMarkets, upcomingSpecials, type WeeklyMarket } from "@/lib/rules/markets";
import { addDays, parisNow, weekdayOf } from "@/lib/rules/paris-time";

const MK: WeeklyMarket[] = [
  { id: "marcigny", town: "Marcigny", department: "71", weekday: 1, place: "Place du Cours", hours: "8h-12h30", lon: 4.04, lat: 46.276 },
  { id: "decize", town: "Decize", department: "58", weekday: 5, place: "Champ de Foire", hours: "8h-12h30", lon: 3.46, lat: 46.83 },
  { id: "nevers-ven", town: "Nevers", department: "58", weekday: 5, place: "Square de la Résistance", hours: "15h-19h", lon: 3.16, lat: 46.99 },
  { id: "moulins", town: "Moulins", department: "03", weekday: 0, place: "Place de la Liberté", hours: "8h-13h", lon: 3.33, lat: 46.57 },
];

describe("heure de Paris", () => {
  it("passe au jour suivant à minuit heure de Paris, pas à minuit UTC", () => {
    // 22 nov. 2026 23h30 UTC = 23 nov. 0h30 à Paris (UTC+1 en hiver)
    expect(parisNow(new Date("2026-11-22T23:30:00Z"))).toEqual({ date: "2026-11-23", minutes: 30 });
  });
  it("gère l'heure d'été (UTC+2)", () => {
    expect(parisNow(new Date("2026-07-01T17:00:00Z")).minutes).toBe(19 * 60);
  });
  it("calcule le jour de la semaine et les additions de jours", () => {
    expect(weekdayOf("2026-11-23")).toBe(1); // lundi
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("prochains marchés", () => {
  const now = new Date("2026-11-22T09:00:00Z"); // dimanche 22 novembre 2026, 10 h à Paris
  it("inclut le marché du jour et trie par date puis par heure", () => {
    const up = upcomingMarkets(now, MK, [], { limit: 5 });
    expect(up.map((o) => `${o.date} ${o.town}`)).toEqual([
      "2026-11-22 Moulins",
      "2026-11-23 Marcigny",
      "2026-11-27 Decize",
      "2026-11-27 Nevers",
      "2026-11-29 Moulins",
    ]);
  });
  it("filtre par ville", () => {
    const up = upcomingMarkets(now, MK, [], { town: "Nevers", limit: 2 });
    expect(up.map((o) => o.date)).toEqual(["2026-11-27", "2026-12-04"]);
  });
  it("retire un marché habituel annulé et ajoute un marché exceptionnel", () => {
    const up = upcomingMarkets(
      now,
      MK,
      [
        { kind: "ANNULE", date: "2026-11-23", town: "Marcigny", place: "", hours: "", marketId: "marcigny" },
        { id: "noel", kind: "EXCEPTIONNEL", date: "2026-11-24", town: "Dompierre-sur-Besbre", place: "Salle Laurent Grillet", hours: "18h-21h" },
      ],
      { limit: 3 },
    );
    expect(up.map((o) => `${o.date} ${o.town} ${o.special}`)).toEqual([
      "2026-11-22 Moulins false",
      "2026-11-24 Dompierre-sur-Besbre true",
      "2026-11-27 Decize false",
    ]);
  });
  it("n'affiche que les marchés exceptionnels encore à venir", () => {
    const sp = upcomingSpecials(now, [
      { kind: "EXCEPTIONNEL", date: "2025-12-12", town: "Dompierre-sur-Besbre", place: "", hours: "" },
      { kind: "EXCEPTIONNEL", date: "2026-12-11", town: "Dompierre-sur-Besbre", place: "", hours: "" },
    ]);
    expect(sp.map((e) => e.date)).toEqual(["2026-12-11"]);
  });
});

describe("heure limite de commande (19 h la veille, heure de Paris)", () => {
  it("accepte avant 19 h la veille et refuse à 19 h pile", () => {
    // hiver : Paris = UTC+1
    expect(canOrderFor("2026-11-23", new Date("2026-11-22T17:59:00Z"), 19)).toBe(true); // 18 h 59
    expect(canOrderFor("2026-11-23", new Date("2026-11-22T18:00:00Z"), 19)).toBe(false); // 19 h 00
  });
  it("accepte plusieurs jours avant, refuse le jour même", () => {
    expect(canOrderFor("2026-11-27", new Date("2026-11-22T20:00:00Z"), 19)).toBe(true);
    expect(canOrderFor("2026-11-22", new Date("2026-11-22T06:00:00Z"), 19)).toBe(false);
  });
  it("respecte l'heure d'été", () => {
    // été : Paris = UTC+2 ; 16 h 59 UTC = 18 h 59 à Paris
    expect(canOrderFor("2026-07-02", new Date("2026-07-01T16:59:00Z"), 19)).toBe(true);
    expect(canOrderFor("2026-07-02", new Date("2026-07-01T17:00:00Z"), 19)).toBe(false);
  });
  it("suit une heure limite réglée dans l'administration", () => {
    expect(canOrderFor("2026-11-23", new Date("2026-11-22T18:30:00Z"), 20)).toBe(true);
  });
  it("ne propose plus les marchés dont la limite est passée", () => {
    const now = new Date("2026-11-22T18:30:00Z"); // dimanche 19 h 30 : lundi n'est plus possible
    const ok = orderableMarkets(now, MK, [], 19, { limit: 2 });
    expect(ok.map((o) => `${o.date} ${o.town}`)).toEqual(["2026-11-27 Decize", "2026-11-27 Nevers"]);
  });
});

describe("affichage des horaires", () => {
  it("met en forme comme la maquette", () => {
    expect(formatHours("8h-12h30")).toBe("8 h – 12 h 30");
    expect(formatHours("15h-19h")).toBe("15 h – 19 h");
  });
});
