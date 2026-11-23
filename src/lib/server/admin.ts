import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "./auth";

/** Réservé à Guillaume et Léo (comptes marqués administrateurs). */
export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/compte?suite=admin");
  if (!u.isAdmin) notFound(); // ne révèle pas l'existence de l'administration
  return u;
}
