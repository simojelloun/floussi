// Daret : création, cotisations payées / impayées, cagnotte reçue, position, suivi des membres, calendrier.
const { test, expect } = require("@playwright/test");
const { ouvrir, toast, sansErreur } = require("./aide");

async function creer(page, { mem = "Fatima\nMoi\nKarim\nSara", amt = "500", debut } = {}) {
  await page.evaluate(() => { location.hash = "prets"; });
  await page.click('[data-act="dar-new"]');
  await page.fill("#dr-name", "Daret famille");
  await page.fill("#dr-amt", amt);
  await page.fill("#dr-mem", mem);
  if (debut) await page.evaluate(d => { document.getElementById("dr-start").value = d; }, debut);
  await page.check("#dr-track");
  await page.click('#sheet button[type="submit"]');
}

test("la daret d'exemple apparaît dans Prêts", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "prets"; });
  await expect(page.locator('[data-act="dar-open"]')).toHaveCount(1);
  sansErreur(page);
});

test("créer une daret : 4 tours, cagnotte de 4 × 500", async ({ page }) => {
  await ouvrir(page);
  await creer(page);
  await expect(page).toHaveURL(/#daret$/);
  const d = await page.evaluate(() => DARETS().at(-1));
  expect(d.members.map(m => m.me)).toEqual([false, true, false, false]);
  expect(await page.evaluate(() => darPot(DARETS().at(-1)))).toBe(200000);
  await expect(page.locator(".dar-list > li")).toHaveCount(4);
  await expect(page.locator(".dar-top")).toContainText("2 000,00");
  sansErreur(page);
});

test("« Moi » est obligatoire, une seule fois", async ({ page }) => {
  await ouvrir(page);
  await creer(page, { mem: "Fatima\nKarim" });
  await expect(page.locator("#f-err")).toContainText("Moi");
  sansErreur(page);
});

test("payer, recevoir, annuler : soldes et position", async ({ page }) => {
  await ouvrir(page);
  const debut = await page.evaluate(() => addDays(today(), -40));
  await creer(page, { debut });
  const solde = () => page.evaluate(() => balance(acc(DARETS().at(-1).acc)));
  const avant = await solde();
  await page.locator('[data-act="dar-pay"][data-k="0"]').click();
  expect(await solde()).toBe(avant - 50000);
  expect(await page.evaluate(() => darState(DARETS().at(-1)).pos)).toBe(50000);            // la daret me doit 500
  // ma cotisation n'est ni une dépense ni un revenu
  expect(await page.evaluate(() => allTx().find(t => t.id.startsWith("dp-")).t)).toBe("pret");
  await page.locator('[data-act="dar-pay"][data-k="1"]').click();
  await page.locator('[data-act="dar-recv"][data-k="1"]').click();
  expect(await solde()).toBe(avant - 100000 + 200000);
  expect(await page.evaluate(() => darState(DARETS().at(-1)).pos)).toBe(-100000);          // je dois encore 2 × 500
  await page.locator('[data-act="dar-unrecv"][data-k="1"]').click();
  expect(await solde()).toBe(avant - 100000);
  await page.click("#toast-undo");
  expect(await solde()).toBe(avant - 100000 + 200000);
  sansErreur(page);
});

test("suivi des versements des membres, gardé après rechargement", async ({ page }) => {
  await ouvrir(page);
  await creer(page);
  await page.locator(".dar-got summary").first().click();
  await page.locator('input[name="dar-got"][data-k="0"][value="0"]').check();
  await expect(page.locator(".dar-got summary").first()).toContainText("(1/4)");
  expect(await page.evaluate(() => DARETS().at(-1).got["0"])).toEqual([0]);
  sansErreur(page);
});

test("cotisation due : dans « À venir », dans le calendrier, et l'opération ouvre la daret", async ({ page }) => {
  await ouvrir(page);
  await creer(page, { debut: await page.evaluate(() => addDays(today(), 1)) });
  await page.evaluate(() => { location.hash = "accueil"; });
  await expect(page.locator('#view [data-act="dar-pay"]').first()).toBeVisible();
  await page.evaluate(() => { P.opView = "cal"; calM = addDays(today(), 1).slice(0, 7); calDay = addDays(today(), 1); location.hash = "operations"; render(); });
  await expect(page.locator(`.mc-d[data-d="${await page.evaluate(() => addDays(today(), 1))}"] .dt.due`)).toHaveCount(1);
  await page.locator('#view [data-act="dar-pay"]').first().click();
  expect(await toast(page)).toContain("Cotisation payée");
  await page.evaluate(() => openTx(allTx().find(t => t.dar)));
  await expect(page).toHaveURL(/#daret$/);
  sansErreur(page);
});

test("supprimer une daret retire aussi ses mouvements (avec annulation)", async ({ page }) => {
  await ouvrir(page);
  await creer(page);
  await page.locator('[data-act="dar-pay"][data-k="0"]').click();
  await page.click('[data-act="dar-del"]');
  await page.locator('#sheet button[type="submit"]').click();
  const id = await page.evaluate(() => darSel);
  const compte = () => page.evaluate(id => [DARETS().filter(d => d.id === id).length, allTx().filter(t => t.dar === id).length], id);
  expect(await compte()).toEqual([0, 0]);
  await page.click("#toast-undo");
  expect(await compte()).toEqual([1, 1]);
  sansErreur(page);
});
