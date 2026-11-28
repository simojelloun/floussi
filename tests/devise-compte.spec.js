// Création d'un compte dans n'importe quelle devise : la devise est ajoutée avec son cours.
const { test, expect } = require("@playwright/test");
const { ouvrir, sansErreur } = require("./aide");

test("nouveau compte dans une devise pas encore ajoutée", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => openAcc());
  await expect(page.locator("#f-newrate-w")).toBeHidden();
  expect(await page.locator('#f-cur optgroup').count()).toBe(2);
  expect(await page.evaluate(() => S.meta.currencies.some(c => c.code === "GBP"))).toBe(false);
  await page.fill("#f-name", "Compte Londres");
  // par la liste de l'appli : titres de groupes, recherche, choix
  await page.click("#f-cur-pk");
  await expect(page.locator("#pick .pk-g")).toHaveCount(2);
  await page.fill("#pk-q", "sterling");
  await page.locator('#pick [role="option"]', { hasText: "Livre sterling" }).click();
  await expect(page.locator("#f-cur-pk")).toContainText("Livre sterling");
  await expect(page.locator("#f-newrate-w")).toBeVisible();
  await expect(page.locator("#f-newrate-l")).toContainText("livre sterling");
  // sans cours : erreur, rien n'est créé
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#f-err")).toContainText("cours");
  expect(await page.evaluate(() => S.meta.currencies.some(c => c.code === "GBP"))).toBe(false);
  await page.fill("#f-newrate", "12,80");
  await page.fill("#f-init", "100");
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#wrap")).toBeHidden();
  const r = await page.evaluate(() => ({c: S.meta.currencies.find(c => c.code === "GBP"), a: S.meta.accounts.find(a => a.name === "Compte Londres")}));
  expect(r.c.rate).toBe(12.8); expect(r.c.name).toBe("Livre sterling"); expect(r.c.sym).toBe("£");
  expect(r.a.cur).toBe("GBP"); expect(r.a.initial).toBe(10000);
  // revenir sur une devise déjà présente masque le champ du cours
  await page.evaluate(() => openAcc());
  await page.evaluate(() => { const s = document.getElementById("f-cur"); s.value = "JPY"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await expect(page.locator("#f-newrate-w")).toBeVisible();
  await page.evaluate(() => { const s = document.getElementById("f-cur"); s.value = "GBP"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await expect(page.locator("#f-newrate-w")).toBeHidden();
  sansErreur(page);
});

test("nouvelle devise : choisir dans la liste remplit le formulaire", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => openCur());
  await page.evaluate(() => { const s = document.getElementById("f-pick"); s.value = "CAD"; s.dispatchEvent(new Event("change", {bubbles: true})); });
  await expect(page.locator("#f-code")).toHaveValue("CAD");
  await expect(page.locator("#f-name")).toHaveValue("Dollar canadien");
  await page.fill("#f-rate", "7,1");
  await page.click('#sheet button[type="submit"]');
  expect(await page.evaluate(() => S.meta.currencies.find(c => c.code === "CAD").rate)).toBe(7.1);
  sansErreur(page);
});
