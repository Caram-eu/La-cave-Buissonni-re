"use client";

import { useActionState, useRef, useState } from "react";
import { importCatalog, type ImportPreview } from "@/app/admin/actions";

export function ImportForm() {
  const [st, action, pending] = useActionState<ImportPreview, FormData>(importCatalog, {});
  const [file, setFile] = useState<File | null>(null);
  const [hide, setHide] = useState(true);
  const ref = useRef<HTMLInputElement>(null);
  const send = (confirm: boolean) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    if (confirm) fd.set("confirm", "1");
    if (hide) fd.set("hideMissing", "on");
    action(fd);
  };
  if (st.done) return <div className="okbox" role="status"><p>{st.ok}</p><p style={{ marginTop: 8 }}><a href="/admin/produits">Voir les produits</a></p></div>;
  const preview = st.created !== undefined;
  return (
    <div>
      <div className="f"><label htmlFor="imp">Fichier de la carte (CSV ou Excel .xlsx)</label>
        <input ref={ref} className="field" id="imp" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      <button className="btn sm" type="button" disabled={!file || pending} onClick={() => send(false)}>{pending && !preview ? "Lecture…" : "Vérifier le fichier"}</button>
      <p className="err" role="alert" style={{ marginTop: 8 }}>{st.error}</p>
      {st.errors && st.errors.length > 0 && (
        <div className="card" style={{ marginTop: 10, borderColor: "#b3261e" }}>
          <h2>Lignes à corriger ({st.errors.length})</h2>
          <ul>{st.errors.slice(0, 50).map((e) => <li key={e.line + e.message}>Ligne {e.line} : {e.message}</li>)}</ul>
        </div>
      )}
      {preview && (
        <div className="card" style={{ marginTop: 10 }} aria-live="polite">
          <h2>Ce qui va changer</h2>
          <ul>
            <li><b>{st.created}</b> nouvelle(s) référence(s)</li>
            <li><b>{st.updated}</b> référence(s) mise(s) à jour (prix, millésime…)</li>
            <li><b>{st.missing?.length ?? 0}</b> référence(s) de la carte actuelle absente(s) du fichier</li>
          </ul>
          {st.sample && <p className="small muted" style={{ marginTop: 6 }}>Premières lignes lues : {st.sample.map((x) => `${x.domain}, ${x.name} (${x.price})`).join(" ; ")}</p>}
          {(st.missing?.length ?? 0) > 0 && (
            <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> <span>Masquer du site les références absentes du fichier (elles restent dans l&apos;historique et peuvent être réaffichées)</span></label>
          )}
          <button className="btn green" type="button" disabled={pending || (st.errors?.length ?? 0) > 0} onClick={() => send(true)}>{pending ? "Import…" : "Importer cette carte"}</button>
          {(st.errors?.length ?? 0) > 0 && <p className="small muted" style={{ marginTop: 6 }}>Corrigez les lignes en erreur dans votre fichier, puis vérifiez-le à nouveau.</p>}
        </div>
      )}
    </div>
  );
}
