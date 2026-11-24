import { describe, expect, it } from "vitest";
import { giftCardEmail, marketReminder, orderAlert, orderConfirmation, passwordResetEmail, quoteAlert, type OrderForEmail } from "@/lib/emails";

const contact = { name: "Guillaume Plantard", phone: "06 12 33 57 70", email: "contact@lacavebuissonniere.fr" };
const site = "https://www.lacavebuissonniere.fr";
const o: OrderForEmail = {
  number: "LCB-261123-ABCD", mode: "MARCHE", customerName: "Marie <Dupont>", customerEmail: "marie@exemple.fr", phone: "06 12 34 56 78",
  marketDate: "2026-11-29", marketTown: "Moulins", marketPlace: "Place de la Liberté", marketHours: "8h-13h", address: null, city: null, distanceKm: null,
  note: "Sonnez fort", grossCents: 10400, discountCents: 450, giftCardCents: 1000, totalCents: 8950, paymentMethod: "A_LA_REMISE",
  items: [{ name: "Les Escures", domain: "Fabien Jouves", vintage: "2024", qty: 6, unitCents: 1500, lineTotalCents: 8550 }, { name: "Éthylotest", domain: "Norme NF", vintage: "", qty: 1, unitCents: 150, lineTotalCents: 150 }],
};

describe("e-mails automatiques", () => {
  it("confirmation : récapitulatif, marché, total, paiement, rétractation", () => {
    const e = orderConfirmation(o, { site, contact, paymentMethods: "espèces ou carte bancaire", cutoffHour: 19 });
    expect(e.subject).toBe("Votre commande LCB-261123-ABCD est enregistrée");
    for (const t of [e.text, e.html]) {
      expect(t).toContain("dimanche 29 novembre");
      expect(t).toContain("Moulins");
      expect(t).toContain("89,50");
      expect(t).toContain("Les Escures");
      expect(t).toContain("espèces ou carte bancaire");
      expect(t).toContain("rétractation");
      expect(t).not.toContain("undefined");
    }
    expect(e.html).toContain("Marie &lt;Dupont&gt;".split(" ")[0]); // prénom échappé dans le HTML
    expect(e.html).not.toContain("<Dupont>");
  });
  it("livraison : annonce l'appel pour les frais et l'annulation sans frais", () => {
    const e = orderConfirmation({ ...o, mode: "LIVRAISON", address: "12 rue de Paris", city: "Moulins" }, { site, contact, paymentMethods: "espèces", cutoffHour: 19 });
    expect(e.text).toContain("hors frais");
    expect(e.text).toContain("annuler sans frais");
  });
  it("alerte à Guillaume : téléphone du client et lien vers la commande", () => {
    const e = orderAlert({ ...o, id: "abc123" }, { site, contact });
    expect(e.text).toContain("06 12 34 56 78");
    expect(e.html).toContain("tel:0612345678");
    expect(e.text).toContain(`${site}/admin/commandes/abc123`);
    expect(e.text).toContain("Sonnez fort");
  });
  it("rappel de la veille", () => {
    const e = marketReminder(o, { site, contact, paymentMethods: "espèces ou carte bancaire" });
    expect(e.subject).toContain("demain au marché de Moulins");
    expect(e.text).toContain("8 h – 13 h");
  });
  it("carte cadeau, mot de passe, devis", () => {
    const g = giftCardEmail({ code: "LCB-7KQ2-M9XP", amountCents: 5000, buyerName: "Sophie" }, { site, contact });
    expect(g.html).toContain("LCB-7KQ2-M9XP");
    expect(g.text).toContain("Sophie vous offre");
    const p = passwordResetEmail({ firstName: "Alix", link: `${site}/compte/nouveau-mot-de-passe?jeton=xyz` }, { site, contact });
    expect(p.html).toContain("jeton=xyz");
    const q = quoteAlert({ type: "Mariage", date: "2027-06-19", guests: 90, message: "Vin d'honneur", name: "Claire", phone: "0699887766" }, { site, contact });
    expect(q.text).toContain("19 juin 2027");
    expect(q.subject).toBe("Demande de devis : Mariage (Claire)");
  });
});
