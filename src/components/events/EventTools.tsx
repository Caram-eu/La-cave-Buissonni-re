"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { sendQuote } from "@/app/evenements/actions";
import { QUOTE_TYPES } from "@/lib/quote-types";
import { keepFormSubmit } from "@/lib/use-keep-form";

type QuoteState = { ok: boolean; error?: string };

/** Calculateur « Combien de bouteilles prévoir ? » et formulaire de devis. */
export function EventTools({ phone, email }: { phone: string; email: string }) {
  const [guests, setGuests] = useState("80");
  const [apero, setApero] = useState(true);
  const [repas, setRepas] = useState(true);
  const [soiree, setSoiree] = useState(false);
  const [biere, setBiere] = useState(false);
  const [type, setType] = useState<string>(QUOTE_TYPES[0]);
  const [qGuests, setQGuests] = useState("");
  const [msg, setMsg] = useState("");
  const [state, action, pending] = useActionState<QuoteState, FormData>(sendQuote, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  // boutons « Demander un devis » de la page : présélection du type d'événement
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLElement>("[data-type]");
      if (a?.dataset.type) setType(a.dataset.type);
    };
    document.addEventListener("click", on);
    return () => document.removeEventListener("click", on);
  }, []);

  const n = Math.max(0, Math.min(1000, parseInt(guests) || 0));
  const rows: [string, number][] = [];
  if (apero) rows.push(["Bulles pour le vin d'honneur", Math.ceil(n / 5)]);
  if (repas) {
    const r = Math.ceil(n / 2.5);
    rows.push(["Blanc pour le repas", Math.ceil(r * 0.4)], ["Rouge pour le repas", r - Math.ceil(r * 0.4)]);
  }
  if (soiree) rows.push(["Vins pour la soirée", Math.ceil(n / 4)]);
  const total = rows.reduce((a, r) => a + r[1], 0);
  if (biere) rows.push(["Bières artisanales (33 cl)", Math.ceil(n * 1.5)]);

  const toQuote = () => {
    setQGuests(String(n));
    setMsg((m) => (m ? m + "\n\n" : "") + "Estimation du site : " + rows.map(([l, v]) => `${l} : ${v}`).join(" ; ") + ".");
    document.getElementById("ev-devis")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <>
      <div className="band ev-sec" id="ev-estimation" style={{ background: "#f3f6ee" }}>
        <div className="wrap">
          <h2>Combien de bouteilles prévoir ?</h2>
          <p style={{ maxWidth: "44em", marginTop: 8 }}>Une première estimation pour votre événement. Guillaume l&apos;affinera avec vous, et les bouteilles non ouvertes sont reprises.</p>
          <div className="est">
            <div className="panel">
              <form className="f" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="eGuests">Nombre d&apos;invités adultes</label>
                <input className="field" id="eGuests" type="number" min={1} max={1000} value={guests} onChange={(e) => setGuests(e.target.value)} inputMode="numeric" />
              </form>
              <p style={{ fontWeight: 700, margin: "6px 0 8px" }}>Moments servis</p>
              <label className="check"><input type="checkbox" checked={apero} onChange={(e) => setApero(e.target.checked)} /> <span>Vin d&apos;honneur ou apéritif (bulles)</span></label>
              <label className="check"><input type="checkbox" checked={repas} onChange={(e) => setRepas(e.target.checked)} /> <span>Repas (blanc et rouge)</span></label>
              <label className="check"><input type="checkbox" checked={soiree} onChange={(e) => setSoiree(e.target.checked)} /> <span>Soirée dansante</span></label>
              <label className="check"><input type="checkbox" checked={biere} onChange={(e) => setBiere(e.target.checked)} /> <span>Ajouter des bières artisanales</span></label>
            </div>
            <div className="est-out" aria-live="polite">
              <div className="est-big">{total}<small>bouteilles de vin environ</small></div>
              <div id="eRows">
                {rows.length ? rows.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}{l.startsWith("Bières") ? " bouteilles" : ""}</b></div>) : <div><span>Cochez au moins un moment servi.</span></div>}
              </div>
              <p className="small" style={{ marginTop: 12 }}>Base indicative : 1 bouteille de bulles pour 5 personnes au vin d&apos;honneur, 1 bouteille pour 2,5 personnes au repas, 1 pour 4 en soirée.</p>
              <button className="btn" type="button" onClick={toQuote} style={{ marginTop: 12, background: "#fff", color: "var(--slate)", borderColor: "#fff" }}>Demander un devis avec cette estimation</button>
            </div>
          </div>
        </div>
      </div>

      <div className="band ev-sec" id="ev-devis">
        <div className="formwrap">
          <h2>Demande de devis</h2>
          <p className="muted" style={{ margin: "8px 0 18px" }}>Décrivez votre projet : Guillaume vous recontacte pour en parler.</p>
          {state.ok ? (
            <div className="qdone" role="status">
              <h3>Votre demande est envoyée</h3>
              <p style={{ marginTop: 6 }}>Merci ! Guillaume vous recontacte rapidement. Pour une question urgente, appelez-le au <b>{phone}</b> ou écrivez à <b>{email}</b>.</p>
              <div className="row" style={{ marginTop: 12 }}><Link className="btn green" href="/vins">Voir nos vins</Link></div>
            </div>
          ) : (
            <form ref={formRef} action={action} onSubmit={keepFormSubmit(action)} noValidate>
              <div className="f"><label htmlFor="qType">Type d&apos;événement</label>
                <select className="field" id="qType" name="type" value={type} onChange={(e) => setType(e.target.value)}>{QUOTE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="two">
                <div className="f"><label htmlFor="qDate">Date envisagée</label><input className="field" id="qDate" name="date" type="date" /></div>
                <div className="f"><label htmlFor="qGuests">Nombre de personnes</label><input className="field" id="qGuests" name="guests" type="number" min={1} inputMode="numeric" value={qGuests} onChange={(e) => setQGuests(e.target.value)} /></div>
              </div>
              <div className="two">
                <div className="f"><label htmlFor="qPlace">Commune du lieu</label><input className="field" id="qPlace" name="place" autoComplete="address-level2" /></div>
                <div className="f"><label htmlFor="qBudget">Budget boissons (facultatif)</label><input className="field" id="qBudget" name="budget" placeholder="ex. 600 €" /></div>
              </div>
              <div className="f"><label htmlFor="qMsg">Votre projet</label><textarea className="field" id="qMsg" name="message" rows={4} placeholder="Menu prévu, ambiance, vins que vous aimez…" value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
              <div className="two">
                <div className="f"><label htmlFor="qName">Nom et prénom</label><input className="field" id="qName" name="name" autoComplete="name" required /></div>
                <div className="f"><label htmlFor="qTel">Téléphone</label><input className="field" id="qTel" name="phone" type="tel" autoComplete="tel" /></div>
              </div>
              <div className="f"><label htmlFor="qMail">E-mail</label><input className="field" id="qMail" name="email" type="email" autoComplete="email" /></div>
              <div className="hp" aria-hidden="true"><label htmlFor="qWeb">Site web</label><input id="qWeb" name="website" tabIndex={-1} autoComplete="off" /></div>
              <p className="small muted" style={{ marginBottom: 10 }}>Ces informations servent uniquement à répondre à votre demande (<Link href="/confidentialite">confidentialité</Link>).</p>
              <p className="err" role="alert">{state.error}</p>
              <button className="btn green" type="submit" style={{ width: "100%" }} disabled={pending}>{pending ? "Envoi…" : "Envoyer ma demande"}</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
