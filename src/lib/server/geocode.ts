import "server-only";

/** Géocodage par la Géoplateforme de l'IGN (remplace api-adresse.data.gouv.fr). */
const ENDPOINT = process.env.GEOCODE_URL || "https://data.geopf.fr/geocodage/search";

export type GeoHit = { lon: number; lat: number; label: string; city: string; citycode: string; postcode: string; score: number; type: string };
export type GeoSearch = (q: string, opts?: { type?: "municipality" | "housenumber" | "street"; citycode?: string; limit?: number }) => Promise<GeoHit[] | null>;

/** Renvoie les résultats, ou null si le service ne répond pas (l'appelant utilise alors la liste de secours). */
export const ignSearch: GeoSearch = async (q, opts = {}) => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", q.slice(0, 200));
  url.searchParams.set("limit", String(opts.limit ?? 5));
  url.searchParams.set("index", "address");
  if (opts.type) url.searchParams.set("type", opts.type);
  if (opts.citycode) url.searchParams.set("citycode", opts.citycode);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) return null;
    const d = (await r.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] };
    return (d.features ?? []).map((f) => {
      const p = f.properties;
      return {
        lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], label: String(p.label ?? ""), city: String(p.city ?? p.name ?? ""),
        citycode: String(p.citycode ?? ""), postcode: String(p.postcode ?? ""), score: Number(p.score ?? 0), type: String(p.type ?? ""),
      };
    });
  } catch {
    return null;
  }
};
