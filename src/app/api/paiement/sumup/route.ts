import { z } from "zod";
import { db } from "@/lib/server/db";
import { confirmPayment } from "@/lib/server/payment";

/**
 * Notification de SumUp quand un paiement change d'état.
 * Le contenu n'est pas cru : on redemande le statut à SumUp (confirmPayment).
 */
export async function POST(req: Request) {
  const body = z.object({ id: z.string().min(1).max(100) }).passthrough().safeParse(await req.json().catch(() => null));
  if (body.success) {
    const o = await db.order.findFirst({ where: { paymentRef: body.data.id }, select: { id: true } });
    if (o) await confirmPayment(o.id);
  }
  return new Response(null, { status: 204 });
}
