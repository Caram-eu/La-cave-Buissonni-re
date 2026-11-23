import "server-only";

/**
 * Emplacement du paiement en ligne (désactivé par défaut : réglage onlinePayment.enabled).
 * Prestataire à choisir (Stripe ou SumUp). Pour l'activer :
 *  1. implémenter `createPayment` pour le prestataire choisi (page de paiement hébergée chez lui) ;
 *  2. ajouter la route de notification (webhook) qui passe la commande en paymentStatus = "paye" ;
 *  3. renseigner les clés dans les variables d'environnement, puis activer le réglage.
 * Tant que ce n'est pas fait, le site n'affiche pas le choix « payer en ligne ».
 */
export type PaymentRequest = { orderId: string; number: string; amountCents: number; email: string; returnUrl: string };

export async function createPayment(_req: PaymentRequest): Promise<{ redirectUrl: string }> {
  throw new Error("Paiement en ligne non configuré");
}

/** Les clés du prestataire de paiement sont-elles installées sur le serveur ? */
export function paymentConfigured(): boolean {
  return !!(process.env.SUMUP_API_KEY && process.env.SUMUP_MERCHANT_CODE);
}
