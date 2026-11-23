import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/account/PasswordForms";
import { checkResetToken } from "@/lib/server/account";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const token = (await searchParams).jeton ?? "";
  const c = await checkResetToken(token);
  return (
    <section><div className="band"><div className="formwrap">
      <h1>Nouveau mot de passe</h1>
      {c.ok ? (
        <>
          <p className="muted" style={{ margin: "8px 0 18px" }}>Choisissez votre nouveau mot de passe. Vos autres appareils seront déconnectés.</p>
          <NewPasswordForm token={token} />
        </>
      ) : (
        <div className="okbox" style={{ marginTop: 16 }} role="alert">
          <p>{c.error}</p>
          <p style={{ marginTop: 10 }}><Link href="/compte/mot-de-passe-oublie">Demander un nouveau lien</Link></p>
        </div>
      )}
    </div></div></section>
  );
}
