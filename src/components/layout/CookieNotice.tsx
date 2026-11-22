"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { store } from "@/lib/storage";

/** Bandeau d'information : uniquement des traceurs nécessaires, donc pas de consentement à recueillir. */
export function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ck = store.get<number | null>("cookies", null);
    if (!ck || Date.now() - ck > 395 * 864e5) setOpen(true);
  }, []);
  if (!open) return null;
  const close = () => {
    store.set("cookies", Date.now());
    setOpen(false);
  };
  return (
    <div className="ck" role="region" aria-label="Information cookies">
      <b>Cookies</b>
      <p style={{ marginTop: 4 }}>Ce site utilise uniquement des traceurs nécessaires à son fonctionnement (panier, connexion). Aucun cookie publicitaire ni de mesure d&apos;audience.</p>
      <div className="row">
        <button className="btn green" type="button" onClick={close}>J&apos;ai compris</button>
        <Link className="btn ghost" href="/cookies" onClick={close}>En savoir plus</Link>
      </div>
    </div>
  );
}
