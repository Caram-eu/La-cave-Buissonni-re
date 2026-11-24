import { randomBytes } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cave_test" } } });
test.afterAll(() => db.$disconnect());

/** Image PNG de bruit aléatoire (environ 4 Mo, peu compressible), comme une grosse photo de téléphone. */
function bigPng(w = 1150, h = 1150): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) randomBytes(w * 3).copy(raw, y * (w * 3 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function signup(page: Page, email: string, first: string) {
  await page.goto("/compte");
  await page.getByRole("button", { name: "J'ai compris" }).click();
  await page.getByLabel("Prénom").fill(first);
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("secret-solide-123");
  await page.getByLabel("Confirmation").fill("secret-solide-123");
  await page.getByLabel("Je certifie avoir 18 ans ou plus.").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: `Bonjour ${first} !` })).toBeVisible();
}

async function login(page: Page, email: string) {
  await page.goto("/compte");
  await page.getByRole("tab", { name: "Se connecter" }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("secret-solide-123");
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("administration : accès réservé, produits, marchés, cartes cadeaux, commandes", async ({ page, browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;

  // 1. Un client ordinaire passe une commande et ne voit pas l'administration
  const client = await browser.newPage();
  await signup(client, `client-${stamp}@exemple.fr`, "Client");
  await client.goto("/vins/domaine-d-aupilhac-le-cinsault-2022");
  await client.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(client.locator(".badge")).toHaveText("1"); // fin de l'animation : panier enregistré
  await client.goto("/panier");
  await client.getByRole("button", { name: "Valider mon panier" }).click();
  await client.getByLabel("Téléphone pour vous joindre").fill("06 11 22 33 44");
  await client.getByLabel(/J'ai lu et j'accepte/).check();
  await client.getByRole("button", { name: "Commander avec obligation de paiement" }).click();
  await expect(client.getByRole("heading", { name: "Merci !" })).toBeVisible();
  const resp = await client.goto("/admin");
  expect(resp?.status()).toBe(404);

  // 2. Administrateur
  const adminEmail = `admin-${stamp}@exemple.fr`;
  await signup(page, adminEmail, "Guillaume");
  await db.user.update({ where: { email: adminEmail }, data: { isAdmin: true } });
  await page.reload();
  await page.getByRole("link", { name: "Accéder à l'administration" }).click();
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

  // 3. La commande du client est visible, on la confirme
  await page.getByRole("link", { name: /^Commandes/ }).click();
  await page.getByLabel("Nom, téléphone ou n°").fill("06 11 22 33 44");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await page.locator(".card", { hasText: "Client Test" }).first().click();
  await page.getByRole("button", { name: "Passer en « Confirmée »" }).click();
  await expect(page.locator(".st").first()).toHaveText("Confirmée");
  const order = await db.order.findFirstOrThrow({ where: { phone: "06 11 22 33 44" }, orderBy: { createdAt: "desc" } });

  // 4. Fiche de préparation du marché de la commande
  await page.goto(`/admin/preparation?date=${order.marketDate}&town=${encodeURIComponent(order.marketTown!)}`);
  await expect(page.getByRole("heading", { name: "À charger dans le camion" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Le Cinsault");

  // 5. Produit rendu indisponible : le client ne peut plus l'ajouter
  await page.goto("/admin/produits?q=montesclat");
  await page.getByRole("button", { name: /Montesclat : disponible/ }).click();
  await expect(page.getByRole("button", { name: /Montesclat : indisponible/ })).toBeVisible();
  await client.goto("/vins/domaine-des-maels-montesclat-2023");
  await expect(client.getByText("Indisponible pour le moment")).toBeVisible();
  await page.getByRole("button", { name: /Montesclat : indisponible/ }).click();

  // 5 bis. Photo prise au téléphone (plus de 1 Mo) : réduite dans le navigateur puis enregistrée
  const png = bigPng();
  expect(png.length).toBeGreaterThan(3 * 1024 * 1024);
  await page.goto("/admin/produits?q=montesclat");
  await page.locator(".card a", { hasText: "Montesclat" }).first().click();
  await page.setInputFiles("#ph", { name: "photo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Envoyer la photo" }).click();
  await expect(page.getByText("Photo enregistrée.")).toBeVisible({ timeout: 15000 });
  const photo = (await db.product.findUniqueOrThrow({ where: { slug: "domaine-des-maels-montesclat-2023" } })).photoUrl!;
  const img = await page.request.get(photo);
  expect(img.headers()["content-type"]).toBe("image/jpeg");
  await db.product.update({ where: { slug: "domaine-des-maels-montesclat-2023" }, data: { photoUrl: null } });

  // 6. Marché exceptionnel : il apparaît sur le site
  await page.goto("/admin/marches");
  const ex = page.locator(".card", { hasText: "Marché exceptionnel ou annulé" });
  await ex.getByLabel("Date").fill("2026-12-12");
  await ex.getByLabel("Ville").fill("Dompierre-sur-Besbre");
  await ex.getByLabel("Horaires").fill("18h-21h");
  await ex.getByLabel("Lieu").fill(`Marché de Noël ${stamp}`);
  await ex.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Marché exceptionnel ajouté.")).toBeVisible();
  await client.goto("/");
  await expect(client.locator(".fetes")).toContainText(`Marché de Noël ${stamp}`);

  // 7. Carte cadeau : code généré, utilisable par le client
  await page.goto("/admin/cartes-cadeaux");
  await page.getByLabel("Montant (€)").fill("50");
  await page.getByRole("button", { name: "Créer la carte et son code" }).click();
  const code = (await page.locator(".okbox p").nth(1).textContent())!.trim();
  expect(code).toMatch(/^LCB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});
