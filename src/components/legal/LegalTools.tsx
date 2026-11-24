"use client";

import { useState } from "react";

export function CopyForm({ targetId }: { targetId: string }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn ghost" type="button" onClick={async () => {
        const el = document.getElementById(targetId);
        try { await navigator.clipboard.writeText(el?.innerText ?? ""); setMsg("Copié."); } catch { setMsg("Sélectionnez le texte pour le copier."); }
      }}>Copier le formulaire</button>
      <span className="small muted" aria-live="polite">{msg}</span>
    </div>
  );
}

export function ClearLocalData() {
  const [msg, setMsg] = useState("");
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn ghost" type="button" onClick={() => {
        try {
          for (const st of [localStorage, sessionStorage]) Object.keys(st).filter((k) => k.startsWith("lcb_")).forEach((k) => st.removeItem(k));
        } catch {}
        setMsg("Données effacées sur cet appareil (panier, préférences). Pour la connexion, utilisez « Se déconnecter ».");
        setTimeout(() => location.reload(), 1500);
      }}>Effacer les données de ce site sur cet appareil</button>
      <span className="small muted" aria-live="polite">{msg}</span>
    </div>
  );
}
