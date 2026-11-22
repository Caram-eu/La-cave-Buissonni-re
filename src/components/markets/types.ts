export type TownPin = { town: string; department: string; lon: number; lat: number };
export type WeeklyView = { id: string; town: string; weekday: number; place: string; hours: string };
export type OccView = { key: string; date: string; town: string; place: string; hours: string; note?: string | null; special: boolean };
