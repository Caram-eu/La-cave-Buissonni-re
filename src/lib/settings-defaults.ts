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
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

/** Catégories auxquelles la remise « 6 bouteilles » ne s'applique pas. */
export const NO_DISCOUNT_CATEGORIES = ["biere", "sansalcool", "accessoire", "coffret"];
