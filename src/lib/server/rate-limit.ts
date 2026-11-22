import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

/** Adresse IP du visiteur (derrière l'hébergeur), utilisée seulement pour limiter les abus. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

/**
 * Autorise au plus `max` actions par fenêtre de `windowSec` secondes pour une clé donnée.
 * Renvoie false si la limite est atteinte.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt < now) {
    await db.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
    return true;
  }
  if (row.count >= max) return false;
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}
