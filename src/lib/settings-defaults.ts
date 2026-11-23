/** Valeurs par défaut des réglages, modifiables ensuite dans l'administration. */
export const DEFAULT_SETTINGS = {
  deliveryRadiusKm: 100,
  discountPercent: 5,
  discountMinQty: 6,
  cutoffHour: 19,
  base: { town: "Dompierre-sur-Besbre", address: "Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre", lon: 3.68, lat: 46.517 },
  giftCardAmounts: [20, 30, 50, 100],
  paymentMethods: "espèces ou carte bancaire",
  onlinePayment: { enabled: false, provider: "" as "" | "stripe" | "sumup" },
  contact: {
    name: "Guillaume Plantard",
    phone: "06 12 33 57 70",
    phoneIntl: "+33612335770",
    email: "lacavebuissonniere@gmail.com",
    facebook: "https://www.facebook.com/lacavebuissonniere/",
  },
  bannerText: "",
  /** Informations légales : un champ vide apparaît dans « À compléter avant mise en ligne » (admin), jamais aux visiteurs. */
  legal: {
    siret: "832 692 230 00010",
    rcs: "RCS Cusset 832 692 230",
    vat: "FR06 832 692 230",
    kbisChecked: false,
    licenceNumber: "",
    licenceTown: "",
    hostName: "",
    hostAddress: "",
    hostPhone: "",
    mediatorName: "",
    mediatorAddress: "",
    mediatorWebsite: "",
    giftCardValidity: "",
    emailProvider: "",
    dataLocation: "",
    warrantyText: "",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;

export const LEGAL_LABELS: Record<keyof Settings["legal"], string> = {
  siret: "SIRET",
  rcs: "Immatriculation RCS",
  vat: "Numéro de TVA intracommunautaire",
  kbisChecked: "SIRET, RCS et TVA vérifiés sur le Kbis",
  licenceNumber: "Numéro de la petite licence à emporter",
  licenceTown: "Commune de délivrance de la licence",
  hostName: "Nom ou raison sociale de l'hébergeur",
  hostAddress: "Adresse de l'hébergeur",
  hostPhone: "Téléphone de l'hébergeur",
  mediatorName: "Nom du médiateur de la consommation",
  mediatorAddress: "Adresse postale du médiateur",
  mediatorWebsite: "Site internet du médiateur",
  giftCardValidity: "Durée de validité de la carte cadeau (ex. 1 an)",
  emailProvider: "Service d'envoi d'e-mails (ex. Brevo, Paris)",
  dataLocation: "Lieu de stockage des données (ex. Union européenne, Francfort)",
  warrantyText: "Encadré officiel sur la garantie légale de conformité (article D. 211-2 du Code de la consommation, à copier depuis Légifrance)",
};

/** Mentions légales encore à compléter (affichées dans l'administration seulement). */
export function legalTodo(s: Settings): string[] {
  const out = (Object.keys(LEGAL_LABELS) as (keyof Settings["legal"])[])
    .filter((k) => (k === "kbisChecked" ? !s.legal.kbisChecked : !String(s.legal[k]).trim()))
    .map((k) => LEGAL_LABELS[k]);
  if (s.onlinePayment.enabled) out.push("Nommer le prestataire de paiement en ligne dans la politique de confidentialité");
  return out;
}
export type SettingKey = keyof Settings;

/** Catégories auxquelles la remise « 6 bouteilles » ne s'applique pas. */
export const NO_DISCOUNT_CATEGORIES = ["biere", "sansalcool", "accessoire", "coffret"];
