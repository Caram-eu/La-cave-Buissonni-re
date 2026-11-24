import "server-only";
import { db } from "./db";
import { DEFAULT_SETTINGS, type Settings } from "../settings-defaults";

/** Lit les réglages en base et complète avec les valeurs par défaut. */
export async function getSettings(): Promise<Settings> {
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await db.setting.findMany();
  } catch (e) {
    console.error("Réglages illisibles, valeurs par défaut utilisées", e);
  }
  const s: Record<string, unknown> = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[r.key];
    if (def === undefined) continue;
    s[r.key] = def && typeof def === "object" && !Array.isArray(def) ? { ...(def as object), ...(r.value as object) } : r.value;
  }
  return s as Settings;
}

/** Enregistre un groupe de réglages (déjà validé par l'appelant). */
export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
}
