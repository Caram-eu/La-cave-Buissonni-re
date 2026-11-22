import { NextResponse } from "next/server";
import { z } from "zod";
import { zoneForCommune } from "@/lib/server/zone";

const Q = z.string().trim().min(2).max(120);

export async function GET(req: Request) {
  const q = Q.safeParse(new URL(req.url).searchParams.get("commune"));
  if (!q.success) return NextResponse.json({ status: "inconnue" }, { status: 400 });
  return NextResponse.json(await zoneForCommune(q.data));
}
