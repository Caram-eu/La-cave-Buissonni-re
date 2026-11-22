import { NextResponse } from "next/server";
import communes from "../../../../donnees/communes-100km.json";

/** Liste des communes pour les suggestions de saisie (mise en cache par le navigateur). */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(communes, { headers: { "cache-control": "public, max-age=86400" } });
}
