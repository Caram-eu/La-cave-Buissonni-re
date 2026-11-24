import Link from "next/link";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { db } from "@/lib/server/db";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct() {
  const regions = (await db.product.findMany({ distinct: ["region"], select: { region: true } })).map((r) => r.region);
  return (
    <>
      <p><Link href="/admin/produits">‹ Tous les produits</Link></p>
      <h1>Nouveau produit</h1>
      <p className="small muted" style={{ marginBottom: 12 }}>La photo s&apos;ajoute une fois le produit enregistré.</p>
      <div className="card" style={{ maxWidth: 720 }}>
        <ProductEditor regions={regions} p={{ name: "", domain: "", category: "rouge", color: "rouge", label: "", region: "", appellation: "", grapes: "", vintage: "", volumeCl: 75, priceCents: 0, sugar: null, style: null, tag: null, noAddedSulfites: false, available: true, hidden: false, discountEligible: true }} />
      </div>
    </>
  );
}
