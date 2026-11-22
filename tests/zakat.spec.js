// Zakat : nisab, 2,5 %, bijoux, dettes, enregistrement du versement.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, sansErreur } = require("./aide");

async function prixOr(page, v) { await page.fill("#z-gp", v); await page.locator("#z-gp").dispatchEvent("change"); }

test("calcul : 2,5 % au-dessus du nisab, rien en dessous", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "zakat"; });
  await expect(page.locator("#z-res")).toContainText("nisab");                 // pas encore de cours
  await prixOr(page, "1000");                                                   // nisab or = 85 000,00 DH
  const r = await page.evaluate(() => zakatCalc(ZK()));
  expect(r.nisab).toBe(8500000);
  expect(r.due).toBe(r.net >= r.nisab ? Math.round(r.net * 0.025) : 0);
  // 100 g d'or d'épargne en plus : la valeur entre dans le calcul
  await page.fill("#z-gold", "100"); await page.locator("#z-gold").dispatchEvent("change");
  const r2 = await page.evaluate(() => zakatCalc(ZK()));
  expect(r2.gold).toBe(10000000);
  expect(r2.due).toBe(Math.round(r2.net * 0.025));
  await expect(page.locator("#z-res")).toContainText("Zakat à verser");
  sansErreur(page);
});

test("bijoux portés comptés seulement si on le choisit ; dettes déduites", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "zakat"; });
  await prixOr(page, "1000");
  await page.fill("#z-jewel", "50"); await page.locator("#z-jewel").dispatchEvent("change");
  expect(await page.evaluate(() => zakatCalc(ZK()).gold)).toBe(0);
  await page.check("#z-jcount");
  expect(await page.evaluate(() => zakatCalc(ZK()).gold)).toBe(5000000);
  const avant = await page.evaluate(() => zakatCalc(ZK()).net);
  await page.fill("#z-debts", "1000"); await page.locator("#z-debts").dispatchEvent("change");
  expect(await page.evaluate(() => zakatCalc(ZK()).net)).toBe(Math.max(0, avant - 100000));
  sansErreur(page);
});

test("réglages gardés et versement enregistré comme dépense", async ({ page }) => {
  await ouvrir(page);
  await commencer(page);
  await page.evaluate(() => { location.hash = "zakat"; });
  await prixOr(page, "10");                                                     // nisab : 850,00
  await page.fill("#z-other", "2000"); await page.locator("#z-other").dispatchEvent("change");   // au-dessus du nisab
  await page.reload();
  await page.evaluate(() => { location.hash = "zakat"; });
  await expect(page.locator("#z-gp")).toHaveValue("10,00");
  const du = await page.evaluate(() => zakatCalc(ZK()).due);
  expect(du).toBeGreaterThan(0);
  await page.click('[data-act="zakat-pay"]');
  await expect(page.locator("#f-amt")).toHaveValue(await page.evaluate(d => plain(d), du));
  await page.click('#sheet button[type="submit"]');
  expect(await page.evaluate(() => allTx().some(t => t.note === "Zakat"))).toBe(true);
  sansErreur(page);
});
