import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const OUTBOX = "test-results/outbox-e2e";

async function mailFor(email: string) {
  for (let i = 0; i < 20; i++) {
    const files = (await readdir(OUTBOX).catch(() => [])).sort().reverse();
    for (const f of files) {
      const t = await readFile(path.join(OUTBOX, f), "utf8");
      if (t.includes(`À : ${email}`)) return t;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("e-mail introuvable");
}

async function signup(page: Page, email: string) {
  await page.goto("/compte");
  await page.getByRole("button", { name: "J'ai compris" }).click();
  await page.getByLabel("Prénom").fill("Alix");
  await page.getByLabel("Nom", { exact: true }).fill("Essai");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("premier-secret");
  await page.getByLabel("Confirmation").fill("premier-secret");
  await page.getByLabel("Je certifie avoir 18 ans ou plus.").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Bonjour Alix !" })).toBeVisible();
}

test("compte : marché habituel, mot de passe oublié, export et suppression", async ({ page }, info) => {
  const email = `alix-${info.project.name}-${Date.now()}@exemple.fr`;
  await signup(page, email);

  // Marché habituel, avec l'option « Aucun »
  await page.getByLabel("Mon marché habituel").selectOption("Nevers");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Vos informations sont enregistrées.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Mon marché habituel")).toHaveValue("Nevers");

  // Export des données
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger mes données" }).click();
  const file = await (await dl).path();
  const data = JSON.parse(await readFile(file, "utf8"));
  expect(data.compte).toMatchObject({ email, marcheHabituel: "Nevers" });

  // Déconnexion puis mot de passe oublié
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByRole("tab", { name: "Se connecter" }).click();
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await page.getByLabel("Adresse e-mail de votre compte").fill(email);
  await page.getByRole("button", { name: "Recevoir un lien par e-mail" }).click();
  await expect(page.getByRole("status")).toContainText("Si un compte existe");
  const link = /https?:\/\/\S+jeton=\S+/.exec(await mailFor(email))![0];
  await page.goto(link);
  await page.getByLabel("Nouveau mot de passe").fill("second-secret");
  await page.getByLabel("Confirmation").fill("second-secret");
  await page.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
  await expect(page.getByText("Votre nouveau mot de passe est enregistré.")).toBeVisible();
  // le lien ne sert qu'une fois
  await page.goto(link);
  await expect(page.locator(".okbox")).toContainText("déjà servi");

  // Suppression du compte, avec le mot de passe
  await page.goto("/compte");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais");
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page.locator("p.err").last()).toContainText("incorrect");
  await page.getByLabel("Mot de passe", { exact: true }).fill("second-secret");
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page.getByText("Votre compte a été supprimé.")).toBeVisible();

  // l'ancien compte ne permet plus de se connecter
  await page.getByRole("tab", { name: "Se connecter" }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("second-secret");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("p.err")).toContainText("incorrect");
});
