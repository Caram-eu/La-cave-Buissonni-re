import Link from "next/link";
import { toggleProduct } from "@/app/admin/actions";
import { ProductPicture } from "@/components/BottleArt";
import { CATEGORIES, tagText, vintageText } from "@/lib/catalog";
import { formatEuros } from "@/lib/rules/pricing";
import { normalize } from "@/lib/rules/text";
import { db } from "@/lib/server/db";
import { toView } from "@/lib/server/products";

export const metadata = { title: "Produits" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; dispo?: string; masques?: string }> }) {
  const f = await searchParams;
  const all = await db.product.findMany({ orderBy: [{ hidden: "asc" }, { sortOrder: "asc" }] });
  const words = normalize(f.q ?? "").split(/\s+/).filter(Boolean);
  const list = all.filter((p) =>
    (!f.cat || p.category === f.cat) && (f.dispo !== "non" || !p.available) && (f.masques === "1" || !p.hidden) &&
    words.every((w) => normalize(`${p.name} ${p.domain} ${p.region} ${p.vintage}`).includes(w)));
  const hiddenCount = all.filter((p) => p.hidden).length;
  return (
    <>
      <h1>Produits</h1>
      <div className="row noprint" style={{ marginBottom: 12, gap: 8 }}>
        <Link className="btn sm green" href="/admin/produits/nouveau">Ajouter un produit</Link>
        <Link className="btn sm ghost" href="/admin/produits/import">Importer une nouvelle carte</Link>
        <a className="btn sm ghost" href="/admin/produits/export">Télécharger la carte (CSV)</a>
      </div>
      <form className="filters" method="get">
        <div className="f"><label htmlFor="pq">Rechercher</label><input className="field" id="pq" name="q" defaultValue={f.q} /></div>
        <div className="f"><label htmlFor="pc">Catégorie</label>
          <select className="field" id="pc" name="cat" defaultValue={f.cat ?? ""}><option value="">Toutes</option>{CATEGORIES.filter(([k]) => k !== "tous").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <label className="check" style={{ margin: 0, alignItems: "center" }}><input type="checkbox" name="dispo" value="non" defaultChecked={f.dispo === "non"} /> <span>Indisponibles seulement</span></label>
        <label className="check" style={{ margin: 0, alignItems: "center" }}><input type="checkbox" name="masques" value="1" defaultChecked={f.masques === "1"} /> <span>Voir les masqués ({hiddenCount})</span></label>
        <button className="btn sm" type="submit">Filtrer</button>
      </form>
      <p className="small muted" style={{ marginBottom: 8 }}>{list.length} produit{list.length > 1 ? "s" : ""}</p>
      <div className="cards">
        {list.map((p) => (
          <div key={p.id} className={`card${p.hidden ? " muted-row" : ""}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="thumb"><ProductPicture p={toView(p)} /></div>
            <div style={{ flex: 1 }}>
              <div className="top">
                <Link href={`/admin/produits/${p.id}`}><b>{p.name}</b>{p.vintage ? ` ${vintageText(p.vintage)}` : ""}</Link>
                <b>{formatEuros(p.priceCents)}</b>
              </div>
              <div className="small muted">{p.domain} · {p.region}{p.tag ? ` · ${tagText(p.tag)}` : ""}{p.hidden ? " · masqué" : ""}{p.kind === "CARTE_CADEAU" ? " · vendue sur les marchés" : ""}</div>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                <form action={toggleProduct} className="inline"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value="available" />
                  <button className={`btn sm ${p.available ? "ghost" : "danger"}`} type="submit" aria-label={`${p.name} : ${p.available ? "disponible, rendre indisponible" : "indisponible, rendre disponible"}`}>{p.available ? "Disponible" : "Indisponible"}</button></form>
                <form action={toggleProduct} className="inline"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value="hidden" />
                  <button className="btn sm ghost" type="submit">{p.hidden ? "Afficher sur le site" : "Masquer"}</button></form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
