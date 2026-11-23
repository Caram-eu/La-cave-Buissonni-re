import { timingSafeEqual } from "node:crypto";
import { dailyTasks } from "@/lib/server/notify";

/**
 * Tâche quotidienne (rappels de la veille + nettoyage RGPD), appelée chaque soir après 19 h
 * par l'hébergeur (cron Vercel ou crontab du serveur) avec l'en-tête « Authorization: Bearer <CRON_SECRET> ».
 */
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Non autorisé", { status: 401 });
  const result = await dailyTasks(new Date());
  return Response.json(result);
}
