"use client";

import { startTransition, useActionState, useState } from "react";
import { saveProduct, uploadPhoto, type AdminState } from "@/app/admin/actions";
import { CATEGORIES, COLORS } from "@/lib/catalog";
import { keepFormSubmit } from "@/lib/use-keep-form";

export type EditableProduct = {
  id?: string; name: string; domain: string; category: string; color: string; label: string; region: string; appellation: string; grapes: string;
  vintage: string; volumeCl: number; priceCents: number; sugar: string | null; style: string | null; tag: string | null; noAddedSulfites: boolean;
  available: boolean; hidden: boolean; discountEligible: boolean; slug?: string; kind?: string;
};

export function ProductEditor({ p, regions }: { p: EditableProduct; regions: string[] }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(saveProduct, {});
  const t = (k: keyof EditableProduct, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="f"><label htmlFor={`e-${k}`}>{label}</label><input className="field" id={`e-${k}`} name={k} defaultValue={String(p[k] ?? "")} {...extra} /></div>
  );
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid2">{t("name", "Cuvée")}{t("domain", "Domaine")}</div>
      <div className="grid2">
        <div className="f"><label htmlFor="e-category">Catégorie</label>
          <select className="field" id="e-category" name="category" defaultValue={p.category}>
            {CATEGORIES.filter(([k]) => k !== "tous").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div className="f"><label htmlFor="e-color">Couleur du dessin (si pas de photo)</label>
          <select className="field" id="e-color" name="color" defaultValue={p.color}>
            {Object.keys(COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select></div>
      </div>
      <div className="grid2">
        <div className="f"><label htmlFor="e-region">Région</label><input className="field" id="e-region" name="region" list="regions" defaultValue={p.region} /><datalist id="regions">{regions.map((r) => <option key={r} value={r} />)}</datalist></div>
        {t("label", "Agriculture (Bio, Biodynamie…)")}
      </div>
      <div className="grid2">{t("appellation", "Appellation")}{t("grapes", "Cépages")}</div>
      <div className="grid2">
        {t("vintage", "Millésime (année ou NM)", { inputMode: "numeric" })}
        {t("volumeCl", "Contenance (cl)", { type: "number", min: 0 })}
      </div>
      <div className="grid2">
        <div className="f"><label htmlFor="e-price">Prix TTC (€)</label><input className="field" id="e-price" name="price" inputMode="decimal" defaultValue={(p.priceCents / 100).toFixed(2).replace(".", ",")} /></div>
        <div className="f"><label htmlFor="e-tag">Pastille</label>
          <select className="field" id="e-tag" name="tag" defaultValue={p.tag ?? ""}><option value="">Aucune</option><option value="NOUVEAUTE">Nouveauté</option><option value="BEST_SELLER">Best-seller</option></select></div>
      </div>
      <div className="grid2">{t("sugar", "Sucres résiduels (ex. 20 g)")}{t("style", "Style (bières : IPA, Blanche…)")}</div>
      <label className="check"><input type="checkbox" name="available" defaultChecked={p.available} /> <span><b>Disponible</b> (décoché : « Indisponible », la commande est impossible)</span></label>
      <label className="check"><input type="checkbox" name="noAddedSulfites" defaultChecked={p.noAddedSulfites} /> <span>Sans sulfites ajoutés</span></label>
      <label className="check"><input type="checkbox" name="discountEligible" defaultChecked={p.discountEligible} /> <span>Remise « 6 bouteilles » applicable (vins seulement)</span></label>
      <label className="check"><input type="checkbox" name="hidden" defaultChecked={p.hidden} /> <span>Masqué du site</span></label>
      <p className="err" role="alert">{st.error}</p>
      {st.ok && <p className="okmsg" role="status">{st.ok}</p>}
      <button className="btn green" type="submit" disabled={pending}>{p.id ? "Enregistrer" : "Ajouter le produit"}</button>
    </form>
  );
}

/** Réduit une photo (1 600 px de côté au maximum, JPEG) dans le navigateur avant l'envoi. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // format non lu par le navigateur : envoyé tel quel, le serveur vérifie
  }
}

export function PhotoForm({ id }: { id: string }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(uploadPhoto, {});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={action}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
        if (!f) return setMsg("Choisissez une photo.");
        setBusy(true);
        const img = await shrink(f);
        setBusy(false);
        if (img.size > 3 * 1024 * 1024) return setMsg(`Photo trop lourde (${(img.size / 1048576).toFixed(1).replace(".", ",")} Mo, 3 Mo maximum) : réduisez-la avant l'envoi.`);
        setMsg("");
        const fd = new FormData();
        fd.set("id", id);
        fd.set("photo", img, "photo.jpg");
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="f"><label htmlFor="ph">Photo de la bouteille (prise au téléphone ou fichier JPEG, PNG, WebP ; réduite automatiquement)</label>
        <input className="field" id="ph" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /></div>
      <p className="err" role="alert">{msg || st.error}</p>
      {st.ok && !msg && <p className="okmsg" role="status">{st.ok}</p>}
      <button className="btn sm ghost" type="submit" disabled={pending || busy}>{busy ? "Préparation…" : pending ? "Envoi…" : "Envoyer la photo"}</button>
    </form>
  );
}
