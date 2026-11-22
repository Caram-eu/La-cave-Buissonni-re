import "server-only";
import communes from "../../../donnees/communes-100km.json";
import { zoneFromCommunes, zoneFromCoords, type Commune, type ZoneResult } from "../rules/zone";
import { geocode } from "./geocode";
import { getSettings } from "./settings";

/** Zone de livraison d'une commune : liste de secours d'abord (instantané), puis géocodage IGN. */
export async function zoneForCommune(input: string): Promise<ZoneResult & { source: "liste" | "ign" | "aucune" }> {
  const s = await getSettings();
  const base: [number, number] = [s.base.lon, s.base.lat];
  const local = zoneFromCommunes(input, communes as Commune[], s.deliveryRadiusKm);
  // La liste couvre 100 km : au-delà d'un rayon de 100 km réglé, il faut l'IGN.
  if (local.status === "ok" || (local.status === "hors-zone" && s.deliveryRadiusKm <= 100)) return { ...local, source: "liste" };
  const hit = await geocode(input.replace(/\((\d\d)\)/, "$1"), { type: "municipality" });
  if (hit && hit.score > 0.5) return { ...zoneFromCoords([hit.lon, hit.lat], base, s.deliveryRadiusKm, hit.city || hit.label), source: "ign" };
  return { ...local, source: local.status === "inconnue" ? "aucune" : "liste" };
}
