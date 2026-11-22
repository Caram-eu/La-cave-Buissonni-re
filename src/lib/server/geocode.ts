import "server-only";

/** Géocodage par la Géoplateforme de l'IGN (remplace api-adresse.data.gouv.fr). */
const ENDPOINT = process.env.GEOCODE_URL || "https://data.geopf.fr/geocodage/search";

export type GeoHit = { lon: number; lat: number; label: string; city: string; postcode: string; score: number; type: string };

export async function geocode(q: string, opts: { type?: "municipality" | "housenumber" | "street"; timeoutMs?: number } = {}): Promise<GeoHit | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", q.slice(0, 200));
  url.searchParams.set("limit", "1");
  url.searchParams.set("index", "address");
  if (opts.type) url.searchParams.set("type", opts.type);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 4000), headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) return null;
    const d = (await r.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] };
    const f = d.features?.[0];
    if (!f) return null;
    const p = f.properties;
    return {
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      label: String(p.label ?? ""),
      city: String(p.city ?? p.name ?? ""),
      postcode: String(p.postcode ?? ""),
      score: Number(p.score ?? 0),
      type: String(p.type ?? ""),
    };
  } catch {
    return null; // service injoignable : l'appelant utilise la liste de secours
  }
}
