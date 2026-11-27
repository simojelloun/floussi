// Changer de téléphone : page d'aide, sauvegarde à emporter, restauration (version web).
const { test, expect } = require("@playwright/test");
const { ouvrir, sansErreur } = require("./aide");

test("page « Changer de téléphone » : étapes, préparer le transfert, restaurer", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "reglages"; });
  await page.click('#view a[href="#transfert"]');
  await expect(page.locator("#view .tr-step")).toHaveCount(3); // sur le web : pas d'étape Floussi Pro
  await expect(page.locator("#view")).not.toContainText("autre marque");
  await expect(page.locator("#view .tr-warn")).toContainText("remplace tout");
  await expect(page.locator("#view #backup-file")).toHaveCount(1);
  // « Préparer le transfert » produit le fichier de sauvegarde
  await page.evaluate(() => { window.__fichier = null; window.offerFile = async (nom, data) => { window.__fichier = {nom, data}; return true; }; window.canCloud = () => false; });
  await page.click('[data-act="transfer-prep"]');
  await expect.poll(() => page.evaluate(() => window.__fichier && window.__fichier.nom)).toMatch(/^floussi-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  const ok = await page.evaluate(() => { const o = JSON.parse(window.__fichier.data); return !!(o.data && o.data.meta && o.data.months); });
  expect(ok).toBe(true);
  // lien depuis la page Sauvegarde
  await page.evaluate(() => { location.hash = "donnees"; });
  await expect(page.locator('#view a[href="#transfert"]')).toBeVisible();
  sansErreur(page);
});
