import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("création de compte, panier, commande avec retrait et livraison hors zone refusée", async ({ page }, info) => {
  const email = `client-${info.project.name}-${Date.now()}@exemple.fr`;

  // 1. Ajout au panier depuis la fiche produit, avec la remise
  await page.goto("/vins/fabien-jouves-les-escures-2024");
  await page.getByRole("button", { name: "J'ai compris" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Une de plus" }).click();
  await expect(page.locator(".bigprice")).toContainText("85,50");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.locator(".badge")).toHaveText("6");

  // 2. Panier : sans compte, on est envoyé vers la création de compte
  await page.goto("/panier");
  await expect(page.locator(".sum")).toContainText("85,50");
  await page.getByRole("button", { name: "Valider mon panier" }).click();
  await expect(page).toHaveURL(/\/compte\?suite=panier/);

  // 3. Création de compte : la case 18 ans est obligatoire
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Essai");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-solide");
  await page.getByLabel("Confirmation").fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.locator("p.err")).toContainText("18 ans");
  await page.getByLabel("Je certifie avoir 18 ans ou plus.").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // 4. Retour au panier, étape 2 : livraison hors zone refusée
  await expect(page).toHaveURL(/\/panier\?etape=2/);
  await expect(page.getByRole("heading", { name: "Retrait ou livraison" })).toBeVisible();
  await page.getByLabel("Livraison à domicile").check();
  await page.getByLabel("Votre commune").fill("Marseille");
  await page.getByLabel("Adresse (numéro et rue)").fill("1 La Canebière");
  await page.getByLabel("Téléphone pour vous joindre").fill("06 12 34 56 78");
  await page.getByLabel(/J'ai lu et j'accepte/).check();
  await page.getByRole("button", { name: "Commander avec obligation de paiement" }).click();
  await expect(page.locator("p.err")).toContainText(/hors de la zone|introuvable|plus de 100 km/);

  // 5. Retrait sur un marché : la commande passe
  await page.getByLabel("Retrait sur un marché").check();
  await page.getByRole("button", { name: "Commander avec obligation de paiement" }).click();
  await expect(page.getByRole("heading", { name: "Merci !" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "LCB-" })).toContainText("85,50");
  await expect(page.locator(".badge")).toHaveText("");

  // 6. E-mail de confirmation au client (dossier local des tests)
  const number = /LCB-\d{6}-[A-Z0-9]{4}/.exec((await page.getByRole("status").filter({ hasText: "LCB-" }).textContent())!)![0];
  let mail = "";
  for (let i = 0; i < 20 && !mail; i++) {
    for (const f of await readdir("test-results/outbox-e2e").catch(() => [] as string[])) {
      const t = await readFile(path.join("test-results/outbox-e2e", f), "utf8");
      if (f.endsWith(".txt") && t.includes(`À : ${email}`) && t.includes(number)) mail = t;
    }
    if (!mail) await page.waitForTimeout(250);
  }
  expect(mail).toContain("Retrait au marché");
  expect(mail).toContain("85,50");

  // 7. La commande apparaît dans le compte
  await page.getByRole("link", { name: "Voir mes commandes" }).click();
  await expect(page.locator("main")).toContainText("Retrait au marché");
});
