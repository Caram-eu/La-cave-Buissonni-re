import type { Metadata } from "next";
import { ForgotForm } from "@/components/account/PasswordForms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function Page() {
  return (
    <section><div className="band"><div className="formwrap">
      <h1>Mot de passe oublié</h1>
      <p className="muted" style={{ margin: "8px 0 18px" }}>Indiquez l&apos;adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <ForgotForm />
    </div></div></section>
  );
}
