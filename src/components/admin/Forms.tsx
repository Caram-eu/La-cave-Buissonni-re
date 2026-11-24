"use client";

import { useActionState, useState } from "react";
import { addException, createGiftCard, saveMarket, saveSettings, applyGiftCardAtMarket, type AdminState } from "@/app/admin/actions";
import { DAYS } from "@/lib/rules/paris-time";
import { keepFormSubmit } from "@/lib/use-keep-form";

function Msg({ st }: { st: AdminState }) {
  return (
    <>
      <p className="err" role="alert">{st.error}</p>
      {st.ok && <p className="okmsg small" role="status">{st.ok}</p>}
    </>
  );
}

/** Formulaire de réglages : un groupe (commerce, contact, legal, payment) par formulaire. */
export function SettingsForm({ group, children, submit = "Enregistrer" }: { group: string; children: React.ReactNode; submit?: string }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(saveSettings, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <input type="hidden" name="group" value={group} />
      {children}
      <Msg st={st} />
      <button className="btn sm green" type="submit" disabled={pending}>{submit}</button>
    </form>
  );
}

type M = { id?: string; town: string; department: string; weekday: number; place: string; hours: string; active?: boolean };

export function MarketForm({ m, compact }: { m?: M; compact?: boolean }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(saveMarket, {});
  const [open, setOpen] = useState(!compact);
  if (!open) return <button className="btn sm ghost" type="button" onClick={() => setOpen(true)}>Modifier</button>;
  const id = m?.id ?? "new";
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate style={{ marginTop: 8 }}>
      {m?.id && <input type="hidden" name="id" value={m.id} />}
      <div className="grid2">
        <div className="f"><label htmlFor={`t-${id}`}>Ville</label><input className="field" id={`t-${id}`} name="town" defaultValue={m?.town} /></div>
        <div className="f"><label htmlFor={`d-${id}`}>Département</label><input className="field" id={`d-${id}`} name="department" defaultValue={m?.department} placeholder="03" inputMode="numeric" /></div>
      </div>
      <div className="grid2">
        <div className="f"><label htmlFor={`w-${id}`}>Jour</label><select className="field" id={`w-${id}`} name="weekday" defaultValue={m?.weekday ?? 1}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}</select></div>
        <div className="f"><label htmlFor={`h-${id}`}>Horaires</label><input className="field" id={`h-${id}`} name="hours" defaultValue={m?.hours} placeholder="8h-12h30" /></div>
      </div>
      <div className="f"><label htmlFor={`p-${id}`}>Lieu</label><input className="field" id={`p-${id}`} name="place" defaultValue={m?.place} /></div>
      {m?.id && <label className="check"><input type="checkbox" name="active" defaultChecked={m.active} /> <span>Marché actif (décoché : n&apos;apparaît plus nulle part)</span></label>}
      <Msg st={st} />
      <button className="btn sm green" type="submit" disabled={pending}>{m?.id ? "Enregistrer" : "Ajouter le marché"}</button>
    </form>
  );
}

export function ExceptionForm({ markets }: { markets: { id: string; label: string }[] }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(addException, {});
  const [kind, setKind] = useState<"EXCEPTIONNEL" | "ANNULE">("EXCEPTIONNEL");
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <div className="seg" style={{ margin: "4px 0 14px" }}>
        <button type="button" className={kind === "EXCEPTIONNEL" ? "on" : ""} aria-pressed={kind === "EXCEPTIONNEL"} onClick={() => setKind("EXCEPTIONNEL")}>Marché exceptionnel</button>
        <button type="button" className={kind === "ANNULE" ? "on" : ""} aria-pressed={kind === "ANNULE"} onClick={() => setKind("ANNULE")}>Marché annulé</button>
      </div>
      <input type="hidden" name="kind" value={kind} />
      <div className="f"><label htmlFor="xd">Date</label><input className="field" id="xd" type="date" name="date" /></div>
      {kind === "EXCEPTIONNEL" ? (
        <>
          <div className="grid2">
            <div className="f"><label htmlFor="xt">Ville</label><input className="field" id="xt" name="town" placeholder="Dompierre-sur-Besbre" /></div>
            <div className="f"><label htmlFor="xh">Horaires</label><input className="field" id="xh" name="hours" placeholder="9h-19h" /></div>
          </div>
          <div className="f"><label htmlFor="xp">Lieu</label><input className="field" id="xp" name="place" placeholder="Marché de Noël, salle Laurent Grillet" /></div>
        </>
      ) : (
        <div className="f"><label htmlFor="xm">Marché habituel annulé ce jour-là</label>
          <select className="field" id="xm" name="marketId"><option value="">Choisir…</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
      )}
      <div className="f"><label htmlFor="xn">Note (facultatif)</label><input className="field" id="xn" name="note" placeholder={kind === "ANNULE" ? "Congés" : "Suivi d'un after avec les commerçants"} /></div>
      <Msg st={st} />
      <button className="btn sm green" type="submit" disabled={pending}>{kind === "ANNULE" ? "Annuler ce marché" : "Ajouter"}</button>
    </form>
  );
}

export function GiftCardCreate({ amounts }: { amounts: number[] }) {
  const [st, action, pending] = useActionState<AdminState & { code?: string }, FormData>(createGiftCard, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate>
      <div className="grid2">
        <div className="f"><label htmlFor="ga">Montant (€)</label><input className="field" id="ga" name="amount" list="gamounts" inputMode="decimal" defaultValue={amounts[1] ?? 30} /><datalist id="gamounts">{amounts.map((a) => <option key={a} value={a} />)}</datalist></div>
        <div className="f"><label htmlFor="ge">Valable jusqu&apos;au (facultatif)</label><input className="field" id="ge" name="expiresAt" type="date" /></div>
      </div>
      <div className="grid2">
        <div className="f"><label htmlFor="gb">Offerte par (facultatif)</label><input className="field" id="gb" name="buyerName" /></div>
        <div className="f"><label htmlFor="gr">E-mail du bénéficiaire (facultatif)</label><input className="field" id="gr" name="recipientEmail" type="email" /></div>
      </div>
      <div className="f"><label htmlFor="gn">Note interne (facultatif)</label><input className="field" id="gn" name="note" placeholder="Payée en espèces au marché de Moulins" /></div>
      <p className="err" role="alert">{st.error}</p>
      {st.code && <div className="okbox" role="status"><p>{st.ok}</p><p style={{ fontSize: 24, fontWeight: 700, letterSpacing: ".05em", marginTop: 6 }}>{st.code}</p><p className="small">Notez ce code sur la carte remise au client.</p></div>}
      <button className="btn sm green" type="submit" disabled={pending}>Créer la carte et son code</button>
    </form>
  );
}

export function GiftUse({ id }: { id: string }) {
  const [st, action, pending] = useActionState<AdminState, FormData>(applyGiftCardAtMarket, {});
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} noValidate className="row" style={{ gap: 6, alignItems: "flex-end" }}>
      <input type="hidden" name="id" value={id} />
      <div className="f" style={{ margin: 0 }}><label htmlFor={`u-${id}`} className="small">Utilisé au marché (€)</label><input className="field" id={`u-${id}`} name="amount" inputMode="decimal" style={{ width: 110 }} /></div>
      <button className="btn sm ghost" type="submit" disabled={pending}>Déduire</button>
      <Msg st={st} />
    </form>
  );
}
