import { CGV_VERSION } from "./legal";

/** Date lisible d'une version (« 21 novembre 2026 »). */
export const versionDate = (v = CGV_VERSION) => new Date(v + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", dateStyle: "long" });
export const filled = (v: string | undefined | null) => !!v && v.trim().length > 0;
