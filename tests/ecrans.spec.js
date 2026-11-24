// Chaque écran s'affiche sans erreur, dans les trois langues, en clair et en sombre.
const { test, expect } = require("@playwright/test");
const { ouvrir, sansErreur } = require("./aide");

for (const lang of ["fr", "en", "es", "ar"]) {
  test(`tous les écrans s'affichent (${lang})`, async ({ page }) => {
    await ouvrir(page, lang);
    const ecrans = await page.evaluate(() => Object.keys(VIEWS));
    expect(ecrans.length).toBeGreaterThan(10);
    for (const e of ecrans) {
      await page.evaluate(e => { location.hash = e; }, e);
      await expect(page.locator("#view"), `écran ${e}`).not.toBeEmpty();
    }
    await page.evaluate(() => { P.opView = "cal"; location.hash = "operations"; render(); });
    await expect(page.locator(".mc-d").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dir)).toBe(lang === "ar" ? "rtl" : "ltr");
    sansErreur(page);
  });
}

test("mode sombre et style verre liquide", async ({ page }) => {
  await ouvrir(page, "fr", { mode: "dark", style: "glass" });
  for (const e of ["accueil", "operations", "stats", "reglages"]) { await page.evaluate(e => { location.hash = e; }, e); await expect(page.locator("#view")).not.toBeEmpty(); }
  await page.click("#fab"); await expect(page.locator("#f-amt")).toBeVisible();
  sansErreur(page);
});

test("les fenêtres s'ouvrent et se ferment au clavier", async ({ page }) => {
  await ouvrir(page);
  await page.click("#fab");
  await expect(page.locator("#f-amt")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#wrap")).toBeHidden();
  sansErreur(page);
});
