import { SettingsForm } from "@/components/admin/Forms";
import { paymentConfigured } from "@/lib/server/payment";
import { getSettings } from "@/lib/server/settings";
import { LEGAL_LABELS, legalTodo } from "@/lib/settings-defaults";

export const metadata = { title: "Réglages" };

const F = ({ name, label, value, help, ...rest }: { name: string; label: string; value: string | number; help?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="f"><label htmlFor={`s-${name}`}>{label}</label><input className="field" id={`s-${name}`} name={name} defaultValue={value} aria-describedby={help ? `s-${name}-h` : undefined} {...rest} />{help && <span className="small muted" id={`s-${name}-h`}>{help}</span>}</div>
);

export default async function SettingsAdmin() {
  const s = await getSettings();
  const todo = legalTodo(s);
  const keys = Object.keys(LEGAL_LABELS) as (keyof typeof LEGAL_LABELS)[];
  return (
    <>
      <h1>Réglages</h1>
      <div className="grid2">
        <div>
          <div className="card">
            <h2>Règles de vente</h2>
            <SettingsForm group="commerce">
              <div className="grid2">
                <F name="deliveryRadiusKm" label="Rayon de livraison (km)" value={s.deliveryRadiusKm} type="number" inputMode="numeric" help="À vol d'oiseau autour de Dompierre." />
                <F name="cutoffHour" label="Heure limite de commande, la veille (h)" value={s.cutoffHour} type="number" inputMode="numeric" />
              </div>
              <div className="grid2">
                <F name="discountPercent" label="Remise (%)" value={s.discountPercent} type="number" inputMode="decimal" />
                <F name="discountMinQty" label="Dès … bouteilles d'une même référence" value={s.discountMinQty} type="number" inputMode="numeric" />
              </div>
              <F name="paymentMethods" label="Moyens de paiement au retrait" value={s.paymentMethods} />
              <F name="giftCardAmounts" label="Montants proposés pour la carte cadeau (€)" value={s.giftCardAmounts.join(", ")} help="Séparés par des virgules." />
              <F name="bannerText" label="Texte de bandeau (facultatif)" value={s.bannerText} help="Message affiché tout en haut du site (ex. congés). Laisser vide pour ne rien afficher." />
            </SettingsForm>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h2>Coordonnées affichées</h2>
            <SettingsForm group="contact">
              <F name="name" label="Nom" value={s.contact.name} />
              <div className="grid2"><F name="phone" label="Téléphone" value={s.contact.phone} type="tel" /><F name="email" label="E-mail" value={s.contact.email} type="email" /></div>
              <F name="facebook" label="Page Facebook" value={s.contact.facebook} type="url" />
            </SettingsForm>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h2>Paiement en ligne (SumUp)</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>{paymentConfigured() ? "Les clés SumUp sont installées sur le serveur." : "Les clés SumUp ne sont pas encore installées sur le serveur : le paiement en ligne ne peut pas être activé."}</p>
            <SettingsForm group="payment">
              <label className="check"><input type="checkbox" name="enabled" defaultChecked={s.onlinePayment.enabled} /> <span>Proposer le paiement en ligne au moment de commander</span></label>
            </SettingsForm>
          </div>
        </div>
        <div>
          <div className="card" id="legal">
            <h2>Informations légales</h2>
            {todo.length ? (
              <div className="okbox" style={{ background: "#fff7e0", borderLeftColor: "#e0b400" }}>
                <b>À compléter avant mise en ligne ({todo.length})</b>
                <ul className="todo-list" style={{ marginTop: 6 }}>{todo.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            ) : <p className="okmsg" style={{ marginBottom: 10 }}>Tout est renseigné.</p>}
            <p className="small muted" style={{ margin: "10px 0" }}>Ces informations alimentent les mentions légales, les CGV et la politique de confidentialité. Tant qu&apos;un champ est vide, la phrase correspondante n&apos;est pas affichée aux visiteurs.</p>
            <SettingsForm group="legal">
              {keys.filter((k) => k !== "kbisChecked" && k !== "warrantyText").map((k) => <F key={k} name={k} label={LEGAL_LABELS[k]} value={String(s.legal[k])} />)}
              <div className="f">
                <label htmlFor="s-warrantyText">{LEGAL_LABELS.warrantyText}</label>
                <textarea className="field" id="s-warrantyText" name="warrantyText" rows={6} defaultValue={s.legal.warrantyText} aria-describedby="s-warrantyText-h" />
                <span className="small muted" id="s-warrantyText-h">Texte réglementaire : sur <a href="https://www.legifrance.gouv.fr" rel="noopener" target="_blank">Légifrance</a>, cherchez « Code de la consommation, article D. 211-2 » et copiez l&apos;encadré tel quel. Il s&apos;affiche dans les CGV, à l&apos;article 9.</span>
              </div>
              <label className="check"><input type="checkbox" name="kbisChecked" defaultChecked={s.legal.kbisChecked} /> <span>{LEGAL_LABELS.kbisChecked}</span></label>
            </SettingsForm>
          </div>
        </div>
      </div>
    </>
  );
}
