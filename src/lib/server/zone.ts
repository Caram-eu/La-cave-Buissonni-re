import "server-only";
import communes from "../../../donnees/communes-100km.json";
import { normalize } from "../rules/text";
import { zoneFromCommunes, zoneFromCoords, type Commune, type ZoneResult } from "../rules/zone";
import type { Settings } from "../settings-defaults";
import { ignSearch, type GeoHit, type GeoSearch } from "./geocode";
import { getSettings } from "./settings";

export type Zone = ZoneResult & { source: "ign" | "liste" | "aucune" };

const key = (s: string) => normalize(s).replace(/[-’']/g, " ").replace(/\s+/g, " ").trim();

/** « Moulins (03) » -> { name: "Moulins", dep: "03" } */
export function splitCommune(input: string) {
  const m = /^(.*?)\s*\((\d[\dAB])\)\s*$/i.exec(input.trim());
  return m ? { name: m[1].trim(), dep: m[2].toUpperCase() } : { name: input.trim(), dep: undefined };
}

type Resolved = { status: "ok"; hit: GeoHit } | { status: "ambigu"; candidates: string[] } | { status: "inconnue" } | { status: "service-indisponible" };

/** Trouve la commune avec l'IGN, en tenant compte du département et des homonymes. */
export async function resolveCommune(input: string, geo: GeoSearch = ignSearch): Promise<Resolved> {
  const { name, dep } = splitCommune(input);
  const hits = await geo(name, { type: "municipality", limit: 10 });
  if (hits === null) return { status: "service-indisponible" };
  const inDep = (h: GeoHit) => !dep || h.citycode.startsWith(dep);
  const exact = hits.filter((h) => key(h.city) === key(name) && inDep(h));
  if (exact.length === 1) return { status: "ok", hit: exact[0] };
  if (exact.length > 1) return { status: "ambigu", candidates: exact.map((h) => `${h.city} (${h.citycode.slice(0, 2)})`) };
  const best = hits.find(inDep);
  if (best && best.score >= 0.8) return { status: "ok", hit: best };
  return { status: "inconnue" };
}

/**
 * Zone de livraison d'une adresse : commune trouvée par l'IGN, puis adresse cherchée dans cette commune
 * (centre de la commune à défaut). Liste de secours des communes si l'IGN ne répond pas.
 */
export async function deliveryZone(city: string, address: string | null, s: Settings, geo: GeoSearch = ignSearch): Promise<Zone> {
  const base: [number, number] = [s.base.lon, s.base.lat];
  const c = await resolveCommune(city, geo);
  if (c.status === "ambigu") return { ...c, source: "ign" };
  if (c.status === "ok") {
    let point: GeoHit = c.hit;
    if (address) {
      const a = await geo(address, { citycode: c.hit.citycode, limit: 1 });
      if (a && a[0] && a[0].score >= 0.4) point = a[0];
    }
    const z = zoneFromCoords([point.lon, point.lat], base, s.deliveryRadiusKm, c.hit.city);
    return { ...z, department: c.hit.citycode.slice(0, 2), source: "ign" };
  }
  const local = zoneFromCommunes(city, communes as Commune[], s.deliveryRadiusKm);
  if (c.status === "inconnue" && local.status === "inconnue") return { status: "inconnue", source: "aucune" };
  return { ...local, source: local.status === "inconnue" ? "aucune" : "liste" };
}

/** Test « Suis-je livrable ? » sur une commune. */
export async function zoneForCommune(input: string) {
  const s = await getSettings();
  const local = zoneFromCommunes(input, communes as Commune[], s.deliveryRadiusKm);
  // la liste couvre 100 km : suffisante tant que le rayon réglé ne dépasse pas 100 km
  if (local.status !== "inconnue" && s.deliveryRadiusKm <= 100) return { ...local, source: "liste" as const };
  return deliveryZone(input, null, s);
}
