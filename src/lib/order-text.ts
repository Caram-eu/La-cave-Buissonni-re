import { formatHours } from "./rules/markets";
import { formatDateFr } from "./rules/paris-time";

type O = { mode: string; marketDate: string | null; marketTown: string | null; marketPlace: string | null; marketHours: string | null; city: string | null; address: string | null; distanceKm: number | null };

export function deliveryText(o: O): string {
  if (o.mode === "MARCHE") return `Retrait au marché de ${o.marketTown}, ${o.marketPlace}, ${o.marketDate ? formatDateFr(o.marketDate) : ""} (${formatHours(o.marketHours || "")})`;
  if (o.mode === "LIVRAISON") return `Livraison à domicile : ${o.address}, ${o.city}${o.distanceKm != null ? ` (${o.distanceKm} km)` : ""}`;
  return `Expédition UPS : ${o.address}`;
}
