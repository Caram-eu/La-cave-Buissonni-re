"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, setNewPassword, type SaveState } from "@/app/compte/actions";
import { keepFormSubmit } from "@/lib/use-keep-form";

export function ForgotForm() {
  const [st, action, pending] = useActionState<SaveState, FormData>(forgotPassword, {});
  if (st.ok)
    return (
      <div className="okbox" role="status">
        <p>{st.ok}</p>
        <p style={{ marginTop: 10 }}><Link href="/compte">Retour à la connexion</Link></p>
      </div>
    );
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <div className="f"><label htmlFor="fMail">Adresse e-mail de votre compte</label><input className="field" id="fMail" name="email" type="email" autoComplete="email" required /></div>
      <p className="err" role="alert">{st.error}</p>
      <button className="btn green" type="submit" style={{ width: "100%" }} disabled={pending}>Recevoir un lien par e-mail</button>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [st, action, pending] = useActionState<SaveState, FormData>(setNewPassword, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="f"><label htmlFor="nPw">Nouveau mot de passe</label><input className="field" id="nPw" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="nPwHelp" /><span className="small muted" id="nPwHelp">8 caractères minimum</span></div>
      <div className="f"><label htmlFor="nPw2">Confirmation</label><input className="field" id="nPw2" name="password2" type="password" autoComplete="new-password" required /></div>
      <p className="err" role="alert">{st.error}</p>
      <button className="btn green" type="submit" style={{ width: "100%" }} disabled={pending}>Enregistrer mon nouveau mot de passe</button>
    </form>
  );
}
