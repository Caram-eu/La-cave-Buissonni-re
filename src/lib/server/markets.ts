import "server-only";
import { db } from "./db";
import type { MarketExceptionInput, WeeklyMarket } from "../rules/markets";

export async function loadMarkets() {
  const [markets, exceptions] = await Promise.all([
    db.market.findMany({ where: { active: true }, orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }] }),
    db.marketException.findMany({ orderBy: { date: "asc" } }),
  ]);
  const weekly: WeeklyMarket[] = markets.map((m) => ({
    id: m.id, town: m.town, department: m.department, weekday: m.weekday, place: m.place, hours: m.hours, lon: m.lon, lat: m.lat,
  }));
  const ex: (MarketExceptionInput & { lon: number | null; lat: number | null })[] = exceptions.map((e) => ({
    id: e.id, kind: e.kind, date: e.date, town: e.town, place: e.place, hours: e.hours, note: e.note, marketId: e.marketId, lon: e.lon, lat: e.lat,
  }));
  return { weekly, exceptions: ex };
}
