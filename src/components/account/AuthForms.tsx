"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup, type FormState } from "@/app/compte/actions";
import { keepFormSubmit } from "@/lib/use-keep-form";

export function AuthForms({ towns, next, fromCart }: { towns: string[]; next: string; fromCart: boolean }) {
  const [tab, setTab] = useState<"creer" | "connexion">("creer");
  const [sState, sAction, sPending] = useActionState<FormState, FormData>(signup, {});
  const [lState, lAction, lPending] = useActionState<FormState, FormData>(login, {});
  return (
    <>
      <h1>Mon compte</h1>
      <p className="muted" style={{ marginTop: 8 }}>Créez votre compte pour commander en ligne et retirer vos bouteilles au marché.</p>
      {fromCart && <div className="okbox" style={{ marginTop: 16 }}>Connectez-vous ou créez un compte pour valider votre panier. Il est conservé.</div>}
      <div className="seg" role="tablist">
        <button type="button" role="tab" className={tab === "creer" ? "on" : ""} aria-selected={tab === "creer"} onClick={() => setTab("creer")}>Créer un compte</button>
        <button type="button" role="tab" className={tab === "connexion" ? "on" : ""} aria-selected={tab === "connexion"} onClick={() => setTab("connexion")}>Se connecter</button>
      </div>
      {tab === "creer" ? (
        <form onSubmit={keepFormSubmit(sAction)} noValidate>
          <input type="hidden" name="next" value={next} />
          <div className="two">
            <div className="f"><label htmlFor="cFirst">Prénom</label><input className="field" id="cFirst" name="firstName" autoComplete="given-name" required /></div>
            <div className="f"><label htmlFor="cLast">Nom</label><input className="field" id="cLast" name="lastName" autoComplete="family-name" required /></div>
          </div>
          <div className="f"><label htmlFor="cMail">Adresse e-mail</label><input className="field" id="cMail" name="email" type="email" autoComplete="email" required /></div>
          <div className="f"><label htmlFor="cTel">Téléphone (facultatif)</label><input className="field" id="cTel" name="phone" type="tel" autoComplete="tel" /></div>
          <div className="two">
            <div className="f"><label htmlFor="cPw">Mot de passe</label><input className="field" id="cPw" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="cPwHelp" /><span className="small muted" id="cPwHelp">8 caractères minimum</span></div>
            <div className="f"><label htmlFor="cPw2">Confirmation</label><input className="field" id="cPw2" name="password2" type="password" autoComplete="new-password" required /></div>
          </div>
          <div className="f"><label htmlFor="cMk">Mon marché habituel</label>
            <select className="field" id="cMk" name="habitualTown" defaultValue=""><option value="">Aucun</option>{towns.map((t) => <option key={t}>{t}</option>)}</select></div>
          <label className="check"><input type="checkbox" id="cAge" name="adult" required /> <span>Je certifie avoir 18 ans ou plus.</span></label>
          <label className="check"><input type="checkbox" name="newsletter" /> <span>Je souhaite recevoir les arrivages et le calendrier des marchés par e-mail.</span></label>
          <p className="small muted" style={{ marginBottom: 10 }}>Vos données servent uniquement à gérer votre compte et vos commandes. Détails et droits : <Link href="/confidentialite">politique de confidentialité</Link>.</p>
          <p className="err" role="alert">{sState.error}</p>
          <button className="btn green" type="submit" style={{ width: "100%" }} disabled={sPending}>{sPending ? "Création…" : "Créer mon compte"}</button>
        </form>
      ) : (
        <form onSubmit={keepFormSubmit(lAction)} noValidate>
          <input type="hidden" name="next" value={next} />
          <div className="f"><label htmlFor="lMail">Adresse e-mail</label><input className="field" id="lMail" name="email" type="email" autoComplete="email" required /></div>
          <div className="f"><label htmlFor="lPw">Mot de passe</label><input className="field" id="lPw" name="password" type="password" autoComplete="current-password" required /></div>
          <p className="small" style={{ margin: "-10px 0 8px" }}><Link href="/compte/mot-de-passe-oublie" style={{ display: "inline-block", padding: "10px 0" }}>Mot de passe oublié ?</Link></p>
          <p className="err" role="alert">{lState.error}</p>
          <button className="btn green" type="submit" style={{ width: "100%" }} disabled={lPending}>{lPending ? "Connexion…" : "Se connecter"}</button>
        </form>
      )}
    </>
  );
}
