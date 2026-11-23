"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { checkoutOptions, previewCart, submitOrder } from "@/app/panier/actions";
import { formatHours } from "@/lib/rules/markets";
import { formatDateFr } from "@/lib/rules/paris-time";
import { formatEuros } from "@/lib/rules/pricing";
import type { PricedCart, PricedLine } from "@/lib/server/checkout";
import { store } from "@/lib/storage";
import { ProductPicture } from "../BottleArt";
import { CommuneOptions, useZone, zoneMessage } from "../markets/ZoneCheck";
import { useCart } from "./CartProvider";

type Opts = Awaited<ReturnType<typeof checkoutOptions>>;
type Mode = "MARCHE" | "LIVRAISON" | "EXPEDITION";

export type CartSettings = {
  discountPercent: number;
  discountMinQty: number;
  cutoffHour: number;
  radiusKm: number;
  onlinePayment: boolean;
  paymentMethods: string;
  phone: string;
  phoneIntl: string;
  email: string;
};

function pic(l: PricedLine) {
  return { kind: l.kind as "PRODUIT", boxKind: l.boxKind, isBeer: l.isBeer, bottleLabel: l.bottleLabel, volumeCl: l.volumeCl, vintage: l.vintage, color: l.color, photoUrl: l.photoUrl, name: l.name };
}
const vol = (l: PricedLine) => (l.kind !== "PRODUIT" || l.boxKind || !l.volumeCl ? "" : l.volumeCl === 150 ? "magnum 150 cl" : `${l.volumeCl} cl`);

export function CartView({ s, initialStep, loggedIn }: { s: CartSettings; initialStep: 1 | 2; loggedIn: boolean }) {
  const { cart, ready, setQty, clear } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(loggedIn ? initialStep : 1);
  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [opts, setOpts] = useState<Opts | null>(null);
  const [done, setDone] = useState<{ number: string; mode: Mode; txt: string; total: number } | null>(null);

  // Prix et remises recalculés par le serveur à chaque changement du panier
  useEffect(() => {
    if (!ready) return;
    const items = Object.entries(cart).map(([slug, qty]) => ({ slug, qty }));
    let live = true;
    const t = setTimeout(async () => {
      const p = await previewCart(items);
      if (!live) return;
      setPriced(p);
      // produits qui ne peuvent plus être commandés : retirés du panier
      p.removed.forEach((r) => setQty(r.slug, 0));
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [cart, ready, setQty]);

  useEffect(() => {
    if (step === 2 && !opts) checkoutOptions(store.get<string | null>("prefTown", null)).then(setOpts);
  }, [step, opts]);

  const steps = (
    <div className="steps" aria-label="Étapes de la commande">
      <span className={step === 1 ? "on" : ""} aria-current={step === 1 ? "step" : undefined}>1. Panier</span>
      <span className={step === 2 ? "on" : ""} aria-current={step === 2 ? "step" : undefined}>2. Retrait ou livraison</span>
      <span className={step === 3 ? "on" : ""} aria-current={step === 3 ? "step" : undefined}>3. Confirmation</span>
    </div>
  );

  if (step === 3 && done)
    return (
      <>
        <h1>Merci !</h1>
        {steps}
        <div className="panel" style={{ marginTop: 20, maxWidth: 640 }} role="status">
          <p>Votre commande <b>{done.number}</b> est enregistrée.</p>
          <p style={{ marginTop: 8 }}>{done.txt}</p>
          <p style={{ marginTop: 8 }}>
            Montant : <b>{formatEuros(done.total)}</b>
            {done.mode !== "MARCHE" ? ", hors frais de livraison ou d'expédition que Guillaume vous confirmera par téléphone (vous pourrez alors annuler sans frais)" : ""}, à régler lors du retrait ou de la livraison ({s.paymentMethods}).
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn green" href="/vins">Poursuivre mes achats</Link>
            <Link className="btn ghost" href="/compte">Voir mes commandes</Link>
          </div>
        </div>
      </>
    );

  if (!ready || !priced) return <h1>Mon panier</h1>;

  if (!priced.lines.length)
    return (
      <>
        <h1>Mon panier</h1>
        {priced.removed.length > 0 && <div className="okbox" style={{ marginTop: 16 }}>{priced.removed.map((r) => <p key={r.slug}>{r.reason}</p>)}</div>}
        <div className="empty">
          <svg viewBox="0 0 36 44" aria-hidden="true"><path d="M5,3 h26 c0,13 -4,19 -13,19 c-9,0 -13,-6 -13,-19z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M18,22 v14 M10,38 h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <h2 style={{ fontSize: 24 }}>Votre verre est vide</h2>
          <p className="muted" style={{ margin: "6px 0 18px" }}>Il est temps de le remplir.</p>
          <Link className="btn green" href="/vins">Découvrir nos vins</Link>
        </div>
        <ContactBox s={s} />
      </>
    );

  const lines = priced.lines.map((l) => {
    const missing = s.discountMinQty - l.qty;
    return (
      <div className="line" key={l.slug}>
        <ProductPicture p={pic(l)} />
        <div>
          <b>{l.name}</b>
          {l.discounted && <span className="disc">−{s.discountPercent} %</span>}
          <div className="small muted">{l.domain}{l.vintage && l.vintage !== "NM" ? " · " + l.vintage : ""}{vol(l) ? " · " + vol(l) : ""} · {formatEuros(l.unitCents)}</div>
          {!l.discounted && l.discountEligible && missing > 0 && missing <= 3 && (
            <div className="small" style={{ color: "#7a1f3d" }}>Plus que {missing} pour −{s.discountPercent} % sur cette référence</div>
          )}
          {step === 1 && <button className="rm" type="button" onClick={() => setQty(l.slug, 0)}>Retirer</button>}
        </div>
        {step === 1 ? (
          <div className="qty">
            <button type="button" aria-label={`Retirer une bouteille : ${l.name}`} onClick={() => setQty(l.slug, l.qty - 1)}>−</button>
            <span aria-label={`Quantité : ${l.qty}`}>{l.qty}</span>
            <button type="button" aria-label={`Ajouter une bouteille : ${l.name}`} onClick={() => setQty(l.slug, l.qty + 1)}>+</button>
          </div>
        ) : (
          <div className="muted">× {l.qty}</div>
        )}
        <div className="lt">{l.discounted && <s>{formatEuros(l.unitCents * l.qty)}</s>}{formatEuros(l.lineTotalCents)}</div>
      </div>
    );
  });

  const sum = (
    <>
      <dl>
        <dt>{priced.count} article{priced.count > 1 ? "s" : ""}</dt><dd>{formatEuros(priced.grossCents)}</dd>
        {priced.discountCents > 0 && <><dt>Remise {s.discountMinQty} bouteilles (−{s.discountPercent} %)</dt><dd>−{formatEuros(priced.discountCents)}</dd></>}
        <dt>Retrait au marché</dt><dd>Gratuit</dd>
      </dl>
      <dl><dt className="tot">Total</dt><dd className="tot">{formatEuros(priced.totalCents)}</dd></dl>
    </>
  );

  return (
    <>
      <h1>{step === 1 ? "Mon panier" : "Retrait ou livraison"}</h1>
      {steps}
      {priced.removed.length > 0 && <div className="okbox" style={{ marginTop: 16 }}>{priced.removed.map((r) => <p key={r.slug}>{r.reason}</p>)}</div>}
      <div className="cart">
        <div>
          {step === 1 ? lines : (
            <CheckoutForm
              s={s}
              opts={opts}
              lines={lines}
              cart={cart}
              onBack={() => setStep(1)}
              onDone={(d) => {
                setDone({ ...d, total: d.total });
                clear();
                store.remove("prefTown");
                setStep(3);
                router.refresh();
                scrollTo(0, 0);
              }}
            />
          )}
        </div>
        <div className="panel sum">
          <h2 style={{ fontSize: 24 }}>{step === 1 ? "Récapitulatif" : "Total"}</h2>
          {sum}
          {step === 1 ? (
            <>
              <p className="small muted">−{s.discountPercent} % automatique dès {s.discountMinQty} bouteilles d&apos;une même référence de vin.</p>
              <button
                className="btn green"
                type="button"
                onClick={() => {
                  if (!loggedIn) return router.push("/compte?suite=panier");
                  setStep(2);
                  scrollTo(0, 0);
                }}
              >
                Valider mon panier
              </button>
              <Link className="btn ghost" href="/vins">Poursuivre mes achats</Link>
            </>
          ) : (
            <p className="small muted">Paiement lors du retrait ou de la livraison ({s.paymentMethods}). Livraison et expédition : frais confirmés par téléphone avant l&apos;envoi ; vous pourrez alors annuler sans frais.</p>
          )}
          <ContactBox s={s} compact />
        </div>
      </div>
    </>
  );
}

function ContactBox({ s, compact }: { s: CartSettings; compact?: boolean }) {
  return (
    <div className={compact ? "" : "panel"} style={{ marginTop: compact ? 18 : 20, borderTop: compact ? "1px dashed var(--line)" : undefined, paddingTop: compact ? 14 : undefined }}>
      <p style={{ fontWeight: 700 }}>Vous préférez commander par e-mail ou SMS ?</p>
      <p className="small" style={{ marginTop: 4 }}>
        Jusqu&apos;à {s.cutoffHour} h la veille du marché :<br />
        SMS : <a href={`sms:${s.phoneIntl}`}>{s.phone}</a><br />
        E-mail : <a href={`mailto:${s.email}?subject=${encodeURIComponent("Commande")}`}>{s.email}</a>
      </p>
    </div>
  );
}

function CheckoutForm({
  s, opts, lines, cart, onBack, onDone,
}: {
  s: CartSettings;
  opts: Opts | null;
  lines: React.ReactNode;
  cart: Record<string, number>;
  onBack: () => void;
  onDone: (d: { number: string; mode: Mode; txt: string; total: number }) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("MARCHE");
  const [marketKey, setMarketKey] = useState("");
  const [address, setAddress] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [payment, setPayment] = useState<"A_LA_REMISE" | "EN_LIGNE">("A_LA_REMISE");
  const [cgv, setCgv] = useState(false);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const zone = useZone(s.radiusKm);
  const zm = zoneMessage(zone.res, s.radiusKm);

  useEffect(() => {
    if (!opts) return;
    setPhone((p) => p || opts.phone);
    const pref = opts.markets.find((m) => m.town === opts.preferredTown);
    setMarketKey((k) => k || (pref ?? opts.markets[0])?.key || "");
  }, [opts]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    // contrôles de confort ; le serveur refait tous les contrôles
    if (mode === "MARCHE" && !marketKey) return setErr("Aucun marché disponible : choisissez la livraison ou appelez-moi.");
    if (mode === "LIVRAISON" && zone.res?.status === "hors-zone") return setErr(zm.text);
    if (!cgv) return setErr("Merci d'accepter les conditions générales de vente pour commander.");
    setPending(true);
    try {
      const items = Object.entries(cart).map(([slug, qty]) => ({ slug, qty }));
      const base = { items, phone, note, giftCode: giftCode || undefined, payment, cgv: true as const };
      const body =
        mode === "MARCHE" ? { ...base, mode, marketKey } : mode === "LIVRAISON" ? { ...base, mode, city: zone.value, address } : { ...base, mode, shipAddress };
      const r = await submitOrder(body);
      if (!r.ok) return setErr(r.error);
      const m = opts?.markets.find((x) => x.key === marketKey);
      const txt =
        mode === "MARCHE" && m
          ? `Retrait au marché de ${m.town}, ${m.place}, ${formatDateFr(m.date)} (${formatHours(m.hours)}).`
          : mode === "LIVRAISON"
            ? `Livraison à domicile : ${address}, ${zone.value}. Guillaume vous appelle pour convenir du jour et des frais.`
            : `Expédition UPS : ${shipAddress}. Guillaume vous appelle pour la procédure et les frais (expéditions le mardi et le mercredi).`;
      onDone({ number: r.number, mode, txt: txt + (r.giftCardCents ? ` Carte cadeau utilisée : ${formatEuros(r.giftCardCents)}.` : ""), total: r.totalCents });
    } catch {
      setErr("La commande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">Mode de remise</legend>
        <label className="opt">
          <input type="radio" name="mode" value="MARCHE" checked={mode === "MARCHE"} onChange={() => setMode("MARCHE")} />
          <span style={{ flex: 1 }}>
            <b>Retrait sur un marché</b><br />
            <span className="small muted">Gratuit. Commande possible jusqu&apos;à {s.cutoffHour} h la veille du marché.</span>
            <select className="field" aria-label="Marché de retrait" style={{ width: "100%", marginTop: 8 }} value={marketKey} onChange={(e) => { setMarketKey(e.target.value); setMode("MARCHE"); }} disabled={!opts}>
              {!opts && <option>Chargement des marchés…</option>}
              {opts && !opts.markets.length && <option value="">Aucun marché ouvert à la commande</option>}
              {opts?.markets.map((m) => (
                <option key={m.key} value={m.key}>{formatDateFr(m.date)} · {m.town}, {m.place} ({formatHours(m.hours)})</option>
              ))}
            </select>
          </span>
        </label>
        <label className="opt">
          <input type="radio" name="mode" value="LIVRAISON" checked={mode === "LIVRAISON"} onChange={() => setMode("LIVRAISON")} />
          <span style={{ flex: 1 }}>
            <b>Livraison à domicile</b><br />
            <span className="small muted">Jusqu&apos;à {s.radiusKm} km autour de Dompierre-sur-Besbre. Je vous appelle pour convenir du jour et des frais.</span>
            <input className="field" aria-label="Votre commune" list={id + "c"} placeholder="Votre commune" autoComplete="address-level2" style={{ width: "100%", marginTop: 8 }} value={zone.value} onFocus={zone.load} onChange={(e) => { zone.setValue(e.target.value); setMode("LIVRAISON"); }} />
            <CommuneOptions id={id + "c"} list={zone.list} />
            <span className={`zone-res ${zm.cls}`} aria-live="polite">{zm.text}</span>
            <textarea className="field" aria-label="Adresse (numéro et rue)" rows={2} placeholder="Adresse (numéro, rue)" autoComplete="street-address" style={{ width: "100%", marginTop: 8 }} value={address} onChange={(e) => { setAddress(e.target.value); setMode("LIVRAISON"); }} />
          </span>
        </label>
        <label className="opt">
          <input type="radio" name="mode" value="EXPEDITION" checked={mode === "EXPEDITION"} onChange={() => setMode("EXPEDITION")} />
          <span style={{ flex: 1 }}>
            <b>Expédition UPS</b><br />
            <span className="small muted">Pour les plus lointains : à domicile ou en point relais, sous 72 h. Expéditions le mardi et le mercredi. Je vous appelle pour la procédure et les frais.</span>
            <textarea className="field" aria-label="Adresse de livraison ou point relais" rows={2} placeholder="Adresse de livraison ou point relais souhaité" style={{ width: "100%", marginTop: 8 }} value={shipAddress} onChange={(e) => { setShipAddress(e.target.value); setMode("EXPEDITION"); }} />
          </span>
        </label>
      </fieldset>
      <div className="f"><label htmlFor={id + "t"}>Téléphone pour vous joindre</label><input className="field" id={id + "t"} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
      <div className="f"><label htmlFor={id + "n"}>Un mot pour Guillaume (facultatif)</label><textarea className="field" id={id + "n"} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="f"><label htmlFor={id + "g"}>Code de carte cadeau (facultatif)</label><input className="field" id={id + "g"} placeholder="LCB-XXXX-XXXX" autoComplete="off" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} /></div>
      {s.onlinePayment && (
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Paiement</legend>
          <label className="check"><input type="radio" name="pay" checked={payment === "A_LA_REMISE"} onChange={() => setPayment("A_LA_REMISE")} /> <span>Au retrait ou à la livraison ({s.paymentMethods})</span></label>
          <label className="check"><input type="radio" name="pay" checked={payment === "EN_LIGNE"} onChange={() => setPayment("EN_LIGNE")} /> <span>En ligne, par carte bancaire</span></label>
        </fieldset>
      )}
      <div className="ethylo">
        <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#2d3e46" /><path d="M20,9v14" stroke="#fff" strokeWidth="4" strokeLinecap="round" /><circle cx="20" cy="30" r="2.6" fill="#fff" /></svg>
        <span>Si vous conduisez, vérifiez votre taux d&apos;alcoolémie. Des éthylotests sont disponibles dans <Link href="/vins?type=accessoire">nos accessoires</Link> et sur nos marchés. L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.</span>
      </div>
      <label className="check"><input type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} /> <span>J&apos;ai lu et j&apos;accepte les <Link href="/cgv" target="_blank">conditions générales de vente</Link>, et je confirme être majeur.</span></label>
      <p className="small muted" style={{ margin: "-4px 0 12px" }}>Vous disposez d&apos;un droit de rétractation de 14 jours à compter de la remise des produits (hors coffrets composés sur mesure).</p>
      <p className="err" role="alert">{err}</p>
      <div className="row">
        <button className="btn green" type="submit" disabled={pending}>Commander avec obligation de paiement</button>
        <button className="btn ghost" type="button" onClick={onBack}>Retour au panier</button>
      </div>
      <details style={{ marginTop: 18 }}><summary className="small muted">Détail des articles</summary>{lines}</details>
    </form>
  );
}
