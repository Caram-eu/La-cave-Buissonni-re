"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, categoryLabel, tagText, vintageText, volumeText, type ProductView } from "@/lib/catalog";
import { formatEuros } from "@/lib/rules/pricing";
import { normalize, searchWords } from "@/lib/rules/text";
import { ProductPicture } from "../BottleArt";
import { AddButton } from "./AddButton";
import { Hl } from "./Hl";

const LOT = 36;
const IDEAS = ["Gamay", "Saint-Pourçain", "sans sulfites", "Magnum", "Bourgogne", "Champagne", "IPA"];

function haystack(p: ProductView) {
  return normalize(
    [p.name, p.domain, p.region, p.appellation, p.grapes, p.vintage, p.label, p.style ?? "", p.noAddedSulfites ? "sans sulfites ajoutes sans soufre" : "", p.volumeCl === 150 ? "magnum" : "", categoryLabel(p.category)].join(" "),
  );
}

export function Catalogue({ products, initialFilter }: { products: ProductView[]; initialFilter?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(initialFilter && CATEGORIES.some((c) => c[0] === initialFilter) ? initialFilter : "tous");
  const [region, setRegion] = useState("");
  const [ssa, setSsa] = useState(false);
  const [sort, setSort] = useState("def");
  const [shown, setShown] = useState(LOT);
  const index = useMemo(() => products.map((p) => [p, haystack(p)] as const), [products]);
  const regions = useMemo(() => [...new Set(products.map((p) => p.region))], [products]);

  useEffect(() => setShown(LOT), [q, filter, region, ssa, sort]);

  const list = useMemo(() => {
    const words = searchWords(q);
    let l = index.filter(([p, h]) => (filter === "tous" || p.category === filter) && (!region || p.region === region) && (!ssa || p.noAddedSulfites) && words.every((w) => h.includes(w))).map(([p]) => p);
    if (sort === "asc") l = [...l].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "desc") l = [...l].sort((a, b) => b.priceCents - a.priceCents);
    if (sort === "new") l = [...l].sort((a, b) => +(b.tag === "NOUVEAUTE") - +(a.tag === "NOUVEAUTE"));
    if (sort === "best") l = [...l].sort((a, b) => +(b.tag === "BEST_SELLER") - +(a.tag === "BEST_SELLER"));
    return l;
  }, [index, q, filter, region, ssa, sort]);

  const reset = () => {
    setQ("");
    setFilter("tous");
    setRegion("");
    setSsa(false);
  };
  const rest = list.length - shown;
  let lastRegion = "";

  return (
    <>
      <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M15.5,15.5 L21,21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un vin, un domaine, un cépage, une région…" aria-label="Rechercher dans nos vins et bières" autoComplete="off" enterKeyHint="search" />
        {q && <button type="button" aria-label="Effacer la recherche" onClick={() => setQ("")}>×</button>}
      </form>
      <div className="suggest">
        <span className="small muted">Idées :</span>
        {IDEAS.map((w) => (
          <button key={w} type="button" onClick={() => { setQ(w); setFilter("tous"); }}>{w}</button>
        ))}
      </div>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Type de produit">
          {CATEGORIES.map(([k, l]) => (
            <button key={k} type="button" className={`chip${k === filter ? " on" : ""}`} aria-pressed={k === filter} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="toolbar">
        <select className="field" id="region" aria-label="Région" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Toutes les régions</option>
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <label className="chip ssa"><input type="checkbox" checked={ssa} onChange={(e) => setSsa(e.target.checked)} /> Sans sulfites ajoutés</label>
      </div>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <p className="small muted" aria-live="polite">{list.length} produit{list.length > 1 ? "s" : ""}{q.trim() ? ` pour « ${q.trim()} »` : ""}</p>
        <select className="field" aria-label="Trier" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="def">Par région</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="best">Best-sellers d&apos;abord</option><option value="new">Nouveautés d&apos;abord</option>
        </select>
      </div>
      <div className="grid">
        {list.slice(0, shown).map((p) => {
          const head = sort === "def" && p.region !== lastRegion ? ((lastRegion = p.region), <h2 key={"r-" + p.region} className="reg">{p.region}</h2>) : null;
          const flags = [p.noAddedSulfites ? "Sans sulfites ajoutés" : "", p.style || "", p.sugar ? `Sucres : ${p.sugar}/l` : ""].filter(Boolean);
          const vol = volumeText(p);
          return [
            head,
            <article className="prod" key={p.slug}>
              {p.tag && <span className={`tag${p.tag === "BEST_SELLER" ? " best" : ""}`}>{tagText(p.tag)}</span>}
              <Link className="pic" href={`/vins/${p.slug}`} tabIndex={-1} aria-hidden="true"><ProductPicture p={p} /></Link>
              <h3><Link className="plink" href={`/vins/${p.slug}`}><Hl t={p.name} q={q} /></Link></h3>
              <div className="meta">
                <b><Hl t={p.domain} q={q} /></b>
                {p.label && <> <span className="lab">{p.label}</span></>}
                <br />
                {sort !== "def" && <><Hl t={p.region} q={q} /> · </>}
                <Hl t={p.appellation} q={q} />
                {p.vintage && <> · {p.vintage === "NM" ? vintageText(p.vintage) : <Hl t={p.vintage} q={q} />}</>}
                {vol && <> · {vol}</>}
              </div>
              {p.grapes && <p className="grapes"><Hl t={p.grapes} q={q} /></p>}
              {flags.length > 0 && <div className="flags">{flags.map((f) => <span key={f}>{f}</span>)}</div>}
              <div className="buy">
                <span className="price">{p.kind === "CARTE_CADEAU" ? "dès " + formatEuros(p.priceCents) : formatEuros(p.priceCents)}</span>
                <AddButton p={p} />
              </div>
            </article>,
          ];
        })}
      </div>
      {rest > 0 && (
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button className="btn ghost" type="button" onClick={() => setShown(shown + LOT)}>Afficher {Math.min(rest, LOT)} produits de plus ({rest} restants)</button>
        </div>
      )}
      {list.length === 0 && (
        <div className="empty">
          <p className="muted">Aucun produit ne correspond à votre recherche.</p>
          <button className="btn ghost" type="button" style={{ marginTop: 14 }} onClick={reset}>Voir tous les produits</button>
        </div>
      )}
    </>
  );
}
