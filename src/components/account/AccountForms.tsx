"use client";

import { useActionState, useState } from "react";
import { changePassword, deleteMyAccount, updateProfile, type SaveState } from "@/app/compte/actions";
import { keepFormSubmit } from "@/lib/use-keep-form";

type U = { firstName: string; lastName: string; email: string; phone: string | null; habitualTown: string | null; newsletter: boolean };

export function ProfileForm({ u, towns }: { u: U; towns: string[] }) {
  const [st, action, pending] = useActionState<SaveState, FormData>(updateProfile, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate style={{ marginTop: 12 }}>
      <div className="two">
        <div className="f"><label htmlFor="pFirst">Prénom</label><input className="field" id="pFirst" name="firstName" defaultValue={u.firstName} autoComplete="given-name" /></div>
        <div className="f"><label htmlFor="pLast">Nom</label><input className="field" id="pLast" name="lastName" defaultValue={u.lastName} autoComplete="family-name" /></div>
      </div>
      <div className="f"><label htmlFor="pMail">Adresse e-mail</label><input className="field" id="pMail" value={u.email} readOnly aria-describedby="pMailHelp" /><span className="small muted" id="pMailHelp">Pour changer d&apos;adresse, écrivez à Guillaume.</span></div>
      <div className="f"><label htmlFor="pTel">Téléphone</label><input className="field" id="pTel" name="phone" type="tel" defaultValue={u.phone ?? ""} autoComplete="tel" /></div>
      <div className="f"><label htmlFor="prefM">Mon marché habituel</label>
        <select className="field" id="prefM" name="habitualTown" defaultValue={u.habitualTown ?? ""}>
          <option value="">Aucun</option>
          {towns.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="small muted">Il sera proposé en premier au moment de commander.</span>
      </div>
      <label className="check"><input type="checkbox" name="newsletter" defaultChecked={u.newsletter} /> <span>Je souhaite recevoir les arrivages et le calendrier des marchés par e-mail.</span></label>
      <p className="err" role="alert">{st.error}</p>
      {st.ok && <p className="small" role="status" style={{ color: "#3f5a05", fontWeight: 700, marginBottom: 8 }}>{st.ok}</p>}
      <button className="btn ghost" type="submit" disabled={pending}>Enregistrer</button>
    </form>
  );
}

export function PasswordForm() {
  const [st, action, pending] = useActionState<SaveState, FormData>(changePassword, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate style={{ marginTop: 12 }}>
      <div className="f"><label htmlFor="cpCur">Mot de passe actuel</label><input className="field" id="cpCur" name="current" type="password" autoComplete="current-password" /></div>
      <div className="two">
        <div className="f"><label htmlFor="cpNew">Nouveau mot de passe</label><input className="field" id="cpNew" name="password" type="password" autoComplete="new-password" minLength={8} /></div>
        <div className="f"><label htmlFor="cpNew2">Confirmation</label><input className="field" id="cpNew2" name="password2" type="password" autoComplete="new-password" /></div>
      </div>
      <p className="err" role="alert">{st.error}</p>
      {st.ok && <p className="small" role="status" style={{ color: "#3f5a05", fontWeight: 700, marginBottom: 8 }}>{st.ok}</p>}
      <button className="btn ghost" type="submit" disabled={pending}>Changer mon mot de passe</button>
    </form>
  );
}

export function DeleteAccount() {
  const [ask, setAsk] = useState(false);
  const [st, action, pending] = useActionState<SaveState, FormData>(deleteMyAccount, {});
  if (!ask)
    return <button className="btn ghost" type="button" onClick={() => setAsk(true)}>Supprimer mon compte</button>;
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <p style={{ marginBottom: 10 }}><b>Confirmer la suppression définitive ?</b> Indiquez votre mot de passe pour confirmer.</p>
      <div className="f"><label htmlFor="dPw">Mot de passe</label><input className="field" id="dPw" name="password" type="password" autoComplete="current-password" /></div>
      <p className="err" role="alert">{st.error}</p>
      <div className="row">
        <button className="btn" type="submit" disabled={pending} style={{ background: "#b3261e", borderColor: "#b3261e" }}>Oui, supprimer</button>
        <button className="btn ghost" type="button" onClick={() => setAsk(false)}>Annuler</button>
      </div>
    </form>
  );
}
