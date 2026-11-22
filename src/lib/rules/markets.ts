import { addDays, parisNow, weekdayOf } from "./paris-time";

export type WeeklyMarket = {
  id: string;
  town: string;
  department: string;
  weekday: number;
  place: string;
  hours: string;
  lon: number;
  lat: number;
};

export type MarketExceptionInput = {
  id?: string;
  kind: "EXCEPTIONNEL" | "ANNULE";
  date: string;
  town: string;
  place: string;
  hours: string;
  note?: string | null;
  marketId?: string | null;
};

export type Occurrence = {
  /** identifiant stable : "m:<id marché>:<date>" ou "x:<id exception>" */
  key: string;
  date: string;
  town: string;
  place: string;
  hours: string;
  note?: string | null;
  special: boolean;
};

/** Heure de début en minutes ("8h-12h30" -> 480, "15h-19h" -> 900). */
export function startMinutes(hours: string): number {
  const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(hours);
  return m ? Number(m[1]) * 60 + Number(m[2] || 0) : 0;
}

/** "8h-12h30" -> "8 h – 12 h 30" */
export function formatHours(hours: string): string {
  return hours
    .split("-")
    .map((part) => part.trim().replace(/(\d{1,2})\s*h\s*(\d{2})?/, (_, h, mn) => (mn ? `${h} h ${mn}` : `${h} h`)))
    .join(" – ");
}

/**
 * Prochains marchés à partir d'aujourd'hui (inclus), heure de Paris.
 * Les marchés habituels annulés un jour donné sont retirés,
 * les marchés exceptionnels sont ajoutés.
 */
export function upcomingMarkets(
  now: Date,
  markets: WeeklyMarket[],
  exceptions: MarketExceptionInput[],
  opts: { days?: number; town?: string; limit?: number } = {},
): Occurrence[] {
  const { days = 70, town, limit } = opts;
  const today = parisNow(now).date;
  const last = addDays(today, days - 1);
  const cancelled = new Set(
    exceptions.filter((e) => e.kind === "ANNULE" && e.marketId).map((e) => `${e.marketId}:${e.date}`),
  );
  const out: Occurrence[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const wd = weekdayOf(date);
    for (const m of markets) {
      if (m.weekday !== wd || (town && m.town !== town)) continue;
      if (cancelled.has(`${m.id}:${date}`)) continue;
      out.push({ key: `m:${m.id}:${date}`, date, town: m.town, place: m.place, hours: m.hours, special: false });
    }
  }
  for (const e of exceptions) {
    if (e.kind !== "EXCEPTIONNEL" || e.date < today || e.date > last) continue;
    if (town && e.town !== town) continue;
    out.push({
      key: `x:${e.id ?? e.date + e.town}`,
      date: e.date,
      town: e.town,
      place: e.place,
      hours: e.hours,
      note: e.note,
      special: true,
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : startMinutes(a.hours) - startMinutes(b.hours)));
  return limit ? out.slice(0, limit) : out;
}

/** Marchés exceptionnels encore à venir (pour l'encadré « Marchés de Noël et des fêtes »). */
export function upcomingSpecials(now: Date, exceptions: MarketExceptionInput[]): MarketExceptionInput[] {
  const today = parisNow(now).date;
  return exceptions
    .filter((e) => e.kind === "EXCEPTIONNEL" && e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : startMinutes(a.hours) - startMinutes(b.hours)));
}

/**
 * Heure limite de commande : la veille du marché à `cutoffHour` heures, heure de Paris.
 * Renvoie true si l'on peut encore commander pour ce marché.
 */
export function canOrderFor(marketDate: string, now: Date, cutoffHour: number): boolean {
  const { date: today, minutes } = parisNow(now);
  const eve = addDays(marketDate, -1);
  if (today < eve) return true;
  if (today > eve) return false;
  return minutes < cutoffHour * 60;
}

/** Marchés pour lesquels on peut encore passer commande. */
export function orderableMarkets(
  now: Date,
  markets: WeeklyMarket[],
  exceptions: MarketExceptionInput[],
  cutoffHour: number,
  opts: { days?: number; town?: string; limit?: number } = {},
): Occurrence[] {
  const all = upcomingMarkets(now, markets, exceptions, { days: opts.days ?? 70, town: opts.town });
  const ok = all.filter((o) => canOrderFor(o.date, now, cutoffHour));
  return opts.limit ? ok.slice(0, opts.limit) : ok;
}
