import { normalize } from "./text";

export type LonLat = [number, number];
/** [nom, département, distance en km] */
export type Commune = [string, string, number];

/** Distance à vol d'oiseau en km (formule de haversine). */
export function distanceKm(a: LonLat, b: LonLat): number {
  const r = Math.PI / 180;
  const dl = (b[0] - a[0]) * r;
  const dp = (b[1] - a[1]) * r;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dl / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export type ZoneResult =
  | { status: "ok" | "hors-zone"; km: number; name: string; department?: string }
  | { status: "inconnue" }
  | { status: "ambigu"; candidates: string[] }; // plusieurs communes du même nom

export function zoneFromCoords(point: LonLat, base: LonLat, radiusKm: number, name: string): { status: "ok" | "hors-zone"; km: number; name: string } {
  const km = Math.round(distanceKm(point, base));
  return { status: km <= radiusKm ? "ok" : "hors-zone", km, name };
}

/**
 * Recherche dans la liste de secours des communes à moins de 100 km.
 * Accepte "Moulins" ou "Moulins (03)". Une commune absente de la liste
 * est considérée comme hors zone (la liste couvre tout le rayon de 100 km).
 */
export function zoneFromCommunes(input: string, communes: Commune[], radiusKm: number): ZoneResult {
  const raw = input.trim();
  const dep = /\((\d[\dAB])\)\s*$/i.exec(raw)?.[1];
  const n = normalize(raw.replace(/\s*\(\d[\dAB]\)\s*$/i, "")).replace(/[-’']/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return { status: "inconnue" };
  const key = (s: string) => normalize(s).replace(/[-’']/g, " ").replace(/\s+/g, " ").trim();
  const c = communes.find((x) => key(x[0]) === n && (!dep || x[1] === dep));
  if (!c) return { status: "inconnue" };
  return { status: c[2] <= radiusKm ? "ok" : "hors-zone", km: c[2], name: c[0], department: c[1] };
}
