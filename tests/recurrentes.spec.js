// Opérations récurrentes : rien n'est compté tant que l'échéance n'est pas marquée payée ; calendrier.
const { test, expect } = require("@playwright/test");
const { ouvrir, choisir, toast, sansErreur } = require("./aide");

async function creerFacture(page, note = "Facture eau") {
  await page.click("#fab");
  await page.fill("#f-amt", "300");
  await page.fill("#f-note", note);
  await choisir(page, "f-rep", "Chaque mois");
  await page.uncheck("#f-paid");
  await page.click('#sheet button[type="submit"]');
}

test("une récurrence non payée n'enregistre pas de dépense", async ({ page }) => {
  await ouvrir(page);
  await creerFacture(page);
  expect(await toast(page)).toContain("Payée");
  expect(await page.evaluate(() => allTx().some(t => t.note === "Facture eau"))).toBe(false);
  expect(await page.evaluate(() => pendingRecs().some(x => x.r.note === "Facture eau"))).toBe(true);
  sansErreur(page);
});

test("marquer payée depuis l'Accueil, puis annuler", async ({ page }) => {
  await ouvrir(page);
  await creerFacture(page);
  await page.evaluate(() => { location.hash = "accueil"; });
  const n = () => page.evaluate(() => allTx().filter(t => t.note === "Facture eau").length);
  await page.locator('[data-act="rec-ok"]', { hasText: "Payée" }).first().click();
  expect(await n()).toBe(1);
  await page.click("#toast-undo");
  expect(await n()).toBe(0);
  sansErreur(page);
});

test("calendrier : points, payée puis impayée", async ({ page }) => {
  await ouvrir(page);
  await creerFacture(page);
  await page.evaluate(() => { location.hash = "operations"; });
  await page.click('[data-act="op-view"][data-v="cal"]');
  const auj = await page.evaluate(() => today());
  const jour = page.locator(`.mc-d[data-d="${auj}"]`);
  await expect(jour.locator(".dt.due")).toHaveCount(1);
  await expect(jour).toHaveAttribute("aria-label", /échéance à payer/);
  await page.locator('#view [data-act="rec-pay"]').first().click();
  expect(await page.evaluate(() => allTx().some(t => t.note === "Facture eau"))).toBe(true);
  await page.locator('#view [data-act="rec-unpay"]').first().click();
  expect(await page.evaluate(() => allTx().some(t => t.note === "Facture eau"))).toBe(false);
  // navigation au clavier dans le calendrier
  await page.focus(".mc-d.sel");
  await page.keyboard.press("ArrowLeft");
  expect(await page.evaluate(() => calDay)).toBe(await page.evaluate(() => addDays(today(), -1)));
  sansErreur(page);
});

test("marquer impayée depuis la fiche d'une opération payée", async ({ page }) => {
  await ouvrir(page);
  const id = await page.evaluate(() => allTx().find(t => t.rec && recDateOf(t)).id);
  await page.evaluate(id => openTx(allTx().find(t => t.id === id)), id);
  await page.click('.paid-box [data-act="rec-unpay"]');
  await expect(page.locator("#wrap")).toBeHidden();
  expect(await page.evaluate(id => allTx().some(t => t.id === id), id)).toBe(false);
  sansErreur(page);
});

test("mode prélèvement automatique : l'échéance passée est enregistrée seule", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "recurrentes"; });
  await page.click('[data-act="new-rec"]');
  await page.fill("#f-amt", "99");
  await page.fill("#f-note", "Assurance auto");
  await page.click("label:has(#f-mode-auto)");
  await page.evaluate(() => { const i = document.getElementById("f-date"); i.value = addDays(today(), -40); });
  await page.click('#sheet button[type="submit"]');
  expect(await page.evaluate(() => allTx().filter(t => t.note === "Assurance auto").length)).toBeGreaterThanOrEqual(2);
  sansErreur(page);
});
