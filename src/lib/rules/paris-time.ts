/**
 * Dates calendaires à l'heure de Paris.
 * Les jours sont manipulés sous forme de chaîne "AAAA-MM-JJ" pour éviter
 * les pièges des fuseaux horaires et du changement d'heure.
 */
const TZ = "Europe/Paris";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Jour et minute de la journée à Paris pour un instant donné. */
export function parisNow(now: Date): { date: string; minutes: number } {
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = toUTC(s);
  return d.toISOString().slice(0, 10) === s;
}

export function addDays(date: string, n: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = dimanche ... 6 = samedi */
export function weekdayOf(date: string): number {
  return toUTC(date).getUTCDay();
}

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** "lundi 23 novembre" (ou avec l'année si demandé) */
export function formatDateFr(date: string, withYear = false): string {
  return toUTC(date).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}
