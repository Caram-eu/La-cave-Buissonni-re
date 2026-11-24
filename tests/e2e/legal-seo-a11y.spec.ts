import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC = ["/", "/vins", "/vins/fabien-jouves-les-escures-2024", "/vins/carte-cadeau", "/evenements", "/compte", "/compte/mot-de-passe-oublie", "/panier", "/mentions-legales", "/cgv", "/confidentialite", "/cookies"];

test("accessibilité WCAG 2.1 AA (axe) sur les pages publiques", async ({ page }) => {
  test.setTimeout(120000);
  const problems: string[] = [];
  for (const url of PUBLIC) {
    await page.goto(url);
    await page.waitForTimeout(300);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of r.violations) problems.push(`${url} : ${v.id} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 2).join(", ")})`);
  }
  expect(problems).toEqual([]);
});

test("pages légales : contenu, réglages appliqués, aucune mention « à compléter » visible", async ({ page }) => {
  for (const url of ["/mentions-legales", "/cgv", "/confidentialite", "/cookies"]) {
    await page.goto(url);
    const text = (await page.locator("main").textContent()) ?? "";
    expect(text).not.toMatch(/à compléter|undefined|null/i);
  }
  await page.goto("/cgv");
  await expect(page.locator("main")).toContainText("Commander avec obligation de paiement");
  await expect(page.locator("main")).toContainText("19 h la veille");
  await expect(page.locator("main")).toContainText("ne s'applique pas aux bières");
  await expect(page.locator(".upd")).toContainText(/version 2026-11-21-[0-9a-f]{8}/);
  await expect(page.locator("#formulaire-retractation")).toContainText("Je vous notifie par la présente ma rétractation");
  await page.goto("/mentions-legales");
  await expect(page.locator("main")).toContainText("832 692 230");
});

test("référencement : robots.txt, plan du site, données structurées", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("/sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/vins/fabien-jouves-les-escures-2024");
  expect(sitemap).not.toContain("/admin");
  await page.goto("/vins/fabien-jouves-les-escures-2024");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(ld).toMatchObject({ "@type": "Product", offers: { price: "15.00", priceCurrency: "EUR" } });
  await expect(page).toHaveTitle("Les Escures | La Cave Buissonnière");
  await page.goto("/");
  const home = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(home["@type"]).toBe("LiquorStore");
  expect(home.event.length).toBeGreaterThan(0);
});

test("tâche quotidienne refusée sans le secret", async ({ request }) => {
  expect((await request.get("/api/taches/quotidiennes")).status()).toBe(401);
  expect((await request.get("/api/taches/quotidiennes", { headers: { authorization: "Bearer mauvais-secret-de-test" } })).status()).toBe(401);
});
