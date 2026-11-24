// Interface en espagnol.
const { test, expect } = require("@playwright/test");
const { sansErreur, commencer } = require("./aide");

async function ouvrirEs(page) {
  const erreurs = []; page.on("pageerror", e => erreurs.push(e.message)); page.erreurs = erreurs;
  await page.goto("/index.html");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("carnet-prefs", JSON.stringify({lang: "es"})); });
  await page.reload();
  await expect(page.locator("#view")).not.toBeEmpty();
}
// mots français qui ne devraient plus apparaître une fois l'interface traduite
const FRANCAIS = /\b(Opérations|Dépenses|Revenus|Comptes|Réglages|Accueil|Enregistrer|Ajouter|Supprimer|Catégorie|Montant|Échéance|Solde|aujourd'hui|du mois)\b/;

test("l'interface est en espagnol, sans texte français oublié", async ({ page }) => {
  await ouvrirEs(page);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("es");
  await expect(page.locator("nav.tabs")).toContainText("Inicio");
  for (const v of ["accueil", "operations", "prets", "budgets", "stats", "comptes", "reglages", "recurrentes", "devises", "categories", "apparence", "donnees", "bilan", "modeles", "verrouillage", "zakat"]) {
    await page.evaluate(v => { location.hash = v; }, v);
    await page.waitForTimeout(150);
    const txt = await page.locator("#view").innerText();
    expect(txt, "vue " + v).not.toMatch(FRANCAIS);
  }
  // formulaire de saisie
  await page.click("#fab");
  const f = await page.locator("#sheet").innerText();
  expect(f).toContain("Importe"); expect(f).not.toMatch(FRANCAIS);
  sansErreur(page);
});

test("montants et dates au format espagnol", async ({ page }) => {
  await ouvrirEs(page);
  expect(await page.evaluate(() => fmt(123456, "EUR"))).toMatch(/^1\.234,56\s?€$/);
  expect(await page.evaluate(() => parseAmt("1.234,56"))).toBe(123456);
  expect(await page.evaluate(() => longDate("2026-11-24"))).toContain("noviembre");
  sansErreur(page);
});

test("les catégories créées au départ sont en espagnol", async ({ page }) => {
  await ouvrirEs(page);
  await commencer(page);
  const noms = await page.evaluate(() => S.meta.categories.map(c => c.name));
  expect(noms).toContain("Alimentación"); expect(noms).not.toContain("Alimentation");
  sansErreur(page);
});

test("le choix de la langue propose l'espagnol", async ({ page }) => {
  await ouvrirEs(page);
  await page.evaluate(() => { location.hash = "apparence"; });
  await expect(page.locator('input[name="plang"][value="es"]')).toBeChecked();
  await expect(page.locator("label", { has: page.locator('input[name="plang"][value="es"]') })).toContainText("Español");
  sansErreur(page);
});
