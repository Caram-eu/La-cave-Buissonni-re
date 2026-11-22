import { describe, expect, it } from "vitest";
import communes from "../../donnees/communes-100km.json";
import { distanceKm, zoneFromCommunes, zoneFromCoords, type Commune } from "@/lib/rules/zone";

const BASE: [number, number] = [3.68, 46.517];
const C = communes as Commune[];

describe("zone de livraison (100 km à vol d'oiseau)", () => {
  it("calcule une distance cohérente Dompierre - Moulins (environ 27 km)", () => {
    const d = distanceKm(BASE, [3.333, 46.566]);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(30);
  });
  it("accepte une adresse dans le rayon", () => {
    expect(zoneFromCoords([3.333, 46.566], BASE, 100, "Moulins")).toMatchObject({ status: "ok", km: 27 });
  });
  it("refuse une adresse hors zone (Paris)", () => {
    expect(zoneFromCoords([2.35, 48.85], BASE, 100, "Paris").status).toBe("hors-zone");
  });
  it("suit le rayon réglé dans l'administration", () => {
    expect(zoneFromCoords([3.333, 46.566], BASE, 20, "Moulins").status).toBe("hors-zone");
  });
  it("utilise la liste de secours, sans tenir compte des accents ni des tirets", () => {
    expect(zoneFromCommunes("ainay le chateau", C, 100)).toMatchObject({ status: "ok", km: 77 });
    expect(zoneFromCommunes("Aigueperse (69)", C, 100)).toMatchObject({ status: "ok", km: 63, department: "69" });
  });
  it("applique le rayon réglé à la liste de secours", () => {
    expect(zoneFromCommunes("Ainay-le-Château", C, 50).status).toBe("hors-zone");
  });
  it("signale une commune absente de la liste", () => {
    expect(zoneFromCommunes("Marseille", C, 100).status).toBe("inconnue");
  });
});
