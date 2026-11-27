// Heure facultative d'une opération, choisie en bas du calendrier de la date.
const { test, expect } = require("@playwright/test");
const { ouvrir, sansErreur } = require("./aide");

test("sans heure par défaut ; « Préciser l'heure » propose l'heure actuelle", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => openTx(null, "dep"));
  await expect(page.locator("#f-date-tm")).toHaveValue("");
  await page.fill("#f-amt", "12,00");
  await page.fill("#f-note", "Petit café");
  await page.click("#f-date-btn");
  await expect(page.locator("#cal-ton")).not.toBeChecked();
  await expect(page.locator("#cal-time")).toHaveCount(0);
  await page.check("#cal-ton");
  const v = await page.locator("#cal-time").inputValue();
  const now = await page.evaluate(() => nowHM());
  const m = s => +s.slice(0, 2) * 60 + +s.slice(3);
  expect(Math.abs(m(now) - m(v)) % 1439).toBeLessThanOrEqual(1);
  await page.fill("#cal-time", "07:05");
  await page.click('[data-act="cal-ok"]');
  await expect(page.locator("#cal .cal")).toHaveCount(0);
  await expect(page.locator("#f-date-val")).toContainText("07:05");
  await page.click('#sheet button[type="submit"]'); await expect(page.locator("#wrap")).toBeHidden();
  expect(await page.evaluate(() => allTx().find(x => x.note === "Petit café").time)).toBe("07:05");
  await page.evaluate(() => { location.hash = "operations"; });
  await expect(page.locator("#view .row", { hasText: "Petit café" }).locator("small")).toContainText("07:05");
  // une opération plus tard le même jour passe au-dessus
  await page.evaluate(() => openTx(null, "dep"));
  await page.fill("#f-amt", "5,00"); await page.fill("#f-note", "Goûter");
  await page.click("#f-date-btn"); await page.check("#cal-ton"); await page.fill("#cal-time", "16:30");
  await page.click(`#cal [data-act="cal-pick"][data-d="${await page.evaluate(() => today())}"].cal-d`);
  await page.click('#sheet button[type="submit"]'); await expect(page.locator("#wrap")).toBeHidden();
  const order = await page.locator("#view .row b").allTextContents();
  expect(order.findIndex(x => x.includes("Goûter"))).toBeLessThan(order.findIndex(x => x.includes("Petit café")));
  // une opération sans heure n'en reçoit pas
  await page.evaluate(() => openTx(null, "dep"));
  await page.fill("#f-amt", "3,00"); await page.fill("#f-note", "Sans heure");
  await page.click('#sheet button[type="submit"]'); await expect(page.locator("#wrap")).toBeHidden();
  expect(await page.evaluate(() => allTx().find(x => x.note === "Sans heure").time)).toBeUndefined();
  sansErreur(page);
});

test("modifier : l'heure est conservée ; décocher la retire ; Annuler ne change rien ; CSV", async ({ page }) => {
  await ouvrir(page);
  const id = await page.evaluate(() => allTx().find(t => t.t === "dep" && !t.time).id);
  await page.evaluate(id => openTx(allTx().find(t => t.id === id)), id);
  await page.click("#f-date-btn"); await page.check("#cal-ton"); await page.fill("#cal-time", "21:40");
  await page.click('[data-act="cal-close"]');
  await expect(page.locator("#f-date-tm")).toHaveValue("");
  await page.click("#f-date-btn"); await page.check("#cal-ton"); await page.fill("#cal-time", "21:40"); await page.click('[data-act="cal-ok"]');
  await page.click('#sheet button[type="submit"]'); await expect(page.locator("#wrap")).toBeHidden();
  expect(await page.evaluate(id => allTx().find(t => t.id === id).time, id)).toBe("21:40");
  await page.evaluate(id => openTx(allTx().find(t => t.id === id)), id);
  await expect(page.locator("#f-date-val")).toContainText("21:40");
  await page.click("#f-date-btn");
  await expect(page.locator("#cal-ton")).toBeChecked();
  await page.uncheck("#cal-ton"); await page.click('[data-act="cal-ok"]');
  await page.click('#sheet button[type="submit"]'); await expect(page.locator("#wrap")).toBeHidden();
  expect(await page.evaluate(id => allTx().find(t => t.id === id).time, id)).toBeUndefined();
  expect((await page.evaluate(() => csv())).split("\r\n")[0]).toContain('"Heure"');
  sansErreur(page);
});

test("les autres calendriers (récurrence, prêts) n'ont pas d'heure", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => openRec());
  await page.click("#f-date-btn");
  await expect(page.locator("#cal .cal")).toBeVisible();
  await expect(page.locator("#cal-ton")).toHaveCount(0);
  sansErreur(page);
});
