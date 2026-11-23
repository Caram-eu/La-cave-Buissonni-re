"use client";

import { useActionState } from "react";
import { saveOrderNotes, type AdminState } from "@/app/admin/actions";
import { keepFormSubmit } from "@/lib/use-keep-form";

export function OrderNotes({ id, shippingNote, adminNote, showShipping }: { id: string; shippingNote: string; adminNote: string; showShipping: boolean }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(saveOrderNotes, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)}>
      <input type="hidden" name="id" value={id} />
      {showShipping ? (
        <div className="f"><label htmlFor="sn">Frais et jour convenus avec le client</label><input className="field" id="sn" name="shippingNote" defaultValue={shippingNote} placeholder="ex. 8 € de livraison, mardi 2 décembre vers 18 h" /></div>
      ) : <input type="hidden" name="shippingNote" value={shippingNote} />}
      <div className="f"><label htmlFor="an">Note interne (non visible du client)</label><textarea className="field" id="an" name="adminNote" rows={2} defaultValue={adminNote} /></div>
      {st.ok && <p className="okmsg small" role="status">{st.ok}</p>}
      <button className="btn sm ghost" type="submit" disabled={pending}>Enregistrer les notes</button>
    </form>
  );
}
