import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { currentUser } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PanierPage({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const [s, user, sp] = await Promise.all([getSettings(), currentUser(), searchParams]);
  return (
    <section>
      <div className="band">
        <div className="wrap">
          <CartView
            loggedIn={!!user}
            initialStep={sp.etape === "2" ? 2 : 1}
            s={{
              discountPercent: s.discountPercent, discountMinQty: s.discountMinQty, cutoffHour: s.cutoffHour, radiusKm: s.deliveryRadiusKm,
              onlinePayment: s.onlinePayment.enabled, paymentMethods: s.paymentMethods, phone: s.contact.phone, phoneIntl: s.contact.phoneIntl, email: s.contact.email,
            }}
          />
        </div>
      </div>
    </section>
  );
}
