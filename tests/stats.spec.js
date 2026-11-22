// Recherche, étiquettes, statistiques, bilan, devise d'affichage.
const { test, expect } = require("@playwright/test");
const { ouvrir, choisir, sansErreur } = require("./aide");

test("recherche par libellé et par montant", async ({ page }) => {
  await ouvrir(page);
  const t = await page.evaluate(() => allTx().find(t => t.t === "dep" && t.note));
  await page.evaluate(() => { P.opView = "list"; location.hash = "operations"; render(); });
  await page.fill("#q", t.note);
  await expect(page.locator(".srch-info b")).toContainText("résultat");
  await page.fill("#q", (t.amt / 100).toFixed(2));
  await expect(page.locator("#tx-list .row").first()).toBeVisible();
  sansErreur(page);
});

test("statistiques : devise d'affichage choisie", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="stat-accs"]');
  await choisir(page, "sa-cur", "Euro");
  await page.click('#sheet button[type="submit"]');
  expect(await page.evaluate(() => statF().out)).toBe("EUR");
  await page.evaluate(() => { statView = "more"; render(); });
  await expect(page.locator("#view .sec-h", { hasText: "Dépenses cumulées" })).toBeVisible();
  sansErreur(page);
});

test("bilan du mois et impression", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "bilan"; window.__imp = 0; window.print = () => { window.__imp++; }; });
  await expect(page.locator("#view .tiles")).toBeVisible();
  await page.click('[data-act="print"]');
  expect(await page.evaluate(() => window.__imp)).toBeGreaterThan(0);
  sansErreur(page);
});
