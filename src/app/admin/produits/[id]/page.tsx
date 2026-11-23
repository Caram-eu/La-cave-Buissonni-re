import Link from "next/link";
import { notFound } from "next/navigation";
import { duplicateProduct, removePhoto } from "@/app/admin/actions";
import { ProductPicture } from "@/components/BottleArt";
import { PhotoForm, ProductEditor } from "@/components/admin/ProductEditor";
import { db } from "@/lib/server/db";
import { toView } from "@/lib/server/products";

export const metadata = { title: "Produit" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string; copie?: string }> }) {
  const [p, sp] = await Promise.all([db.product.findUnique({ where: { id: (await params).id } }), searchParams]);
  if (!p) notFound();
  const regions = (await db.product.findMany({ distinct: ["region"], select: { region: true } })).map((r) => r.region);
  return (
    <>
      <p><Link href="/admin/produits">‹ Tous les produits</Link></p>
      <h1>{p.name}</h1>
      {sp.cree && <p className="okbox" role="status">Produit ajouté.</p>}
      {sp.copie && <p className="okbox" role="status">Copie créée, masquée du site : modifiez-la (millésime, prix…) puis décochez « Masqué du site ».</p>}
      <div className="grid2">
        <div className="card"><ProductEditor p={p} regions={regions} /></div>
        <div>
          <div className="card">
            <h2>Photo</h2>
            <div className="fiche-pic" style={{ minHeight: 220, padding: 14 }}><ProductPicture p={toView(p)} /></div>
            <p className="small muted" style={{ margin: "8px 0" }}>{p.photoUrl ? "Photo envoyée." : "Pas de photo : le dessin hachuré est affiché."}</p>
            <PhotoForm id={p.id} />
            {p.photoUrl && <form action={removePhoto} style={{ marginTop: 8 }}><input type="hidden" name="id" value={p.id} /><button className="btn sm ghost" type="submit">Retirer la photo</button></form>}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h2>Autres actions</h2>
            <p className="small muted">Adresse de la fiche : <Link href={`/vins/${p.slug}`}>/vins/{p.slug}</Link></p>
            <form action={duplicateProduct} style={{ marginTop: 10 }}><input type="hidden" name="id" value={p.id} /><button className="btn sm ghost" type="submit">Dupliquer (nouveau millésime…)</button></form>
          </div>
        </div>
      </div>
    </>
  );
}
