// Face ID / empreinte dans la version installée (App Store, Google Play) : module natif simulé.
const { test, expect } = require("@playwright/test");
const { sansErreur } = require("./aide");

/** Ouvre l'appli comme si elle tournait dans l'appli installée (Capacitor), avec un module biométrique simulé. */
async function natif(page, { dispo = true, type = 2, reussite = true } = {}) {
  const erreurs = []; page.on("pageerror", e => erreurs.push(e.message)); page.erreurs = erreurs;
  await page.addInitScript(([dispo, type, reussite]) => {
    window.__bio = {appels: 0, reussite};
    window.Capacitor = {isNativePlatform: () => true, Plugins: {NativeBiometric: {
      isAvailable: async () => ({isAvailable: dispo, biometryType: dispo ? type : 0}),
      verifyIdentity: async () => { window.__bio.appels++; if (!window.__bio.reussite) throw new Error("annulé"); }
    }}};
  }, [dispo, type, reussite]);
  await page.goto("/index.html");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("carnet-prefs", JSON.stringify({lang: "fr"})); });
  await page.reload();
  await expect(page.locator("#view")).not.toBeEmpty();
  await page.evaluate(() => setPin("1234"));
  await page.evaluate(() => { location.hash = "verrouillage"; });
}

test("version installée : activer Face ID passe par le module natif, puis déverrouille", async ({ page }) => {
  await natif(page);
  await expect(page.locator("#lock-bio")).toBeVisible();
  await expect(page.locator("label.check", { has: page.locator("#lock-bio") })).toContainText("Face ID");
  await page.check("#lock-bio");
  await expect.poll(() => page.evaluate(() => P.lock.bio)).toBe("natif");
  expect(await page.evaluate(() => __bio.appels)).toBe(1);
  // au verrouillage, Face ID est proposé tout seul
  await page.click('[data-act="lock-now"]');
  await expect.poll(() => page.evaluate(() => __bio.appels)).toBe(2);
  await expect(page.locator("#lock")).toBeHidden();
  sansErreur(page);
});

test("version installée : si Face ID échoue, le code reste possible", async ({ page }) => {
  await natif(page);
  await page.check("#lock-bio");
  await expect.poll(() => page.evaluate(() => P.lock.bio)).toBe("natif");
  await page.evaluate(() => { __bio.reussite = false; });
  await page.click('[data-act="lock-now"]');
  await expect(page.locator("#lock-msg")).toContainText("n'a pas abouti");
  await expect(page.locator("#lock")).toBeVisible();
  // bouton Face ID du clavier : réessayer
  await page.evaluate(() => { __bio.reussite = true; });
  await page.click('#lock [data-k="bio"]');
  await expect(page.locator("#lock")).toBeHidden();
  sansErreur(page);
});

test("version installée Android : l'empreinte est nommée comme telle", async ({ page }) => {
  await natif(page, { type: 3 });
  await expect(page.locator("label.check", { has: page.locator("#lock-bio") })).toContainText(/Touch ID|Empreinte digitale/);
  sansErreur(page);
});

test("version installée sans Face ID réglé : message clair, pas de case à cocher", async ({ page }) => {
  await natif(page, { dispo: false });
  await expect(page.locator("#lock-bio")).toHaveCount(0);
  await expect(page.locator("#view")).toContainText("ne sont pas réglés sur ce téléphone");
  sansErreur(page);
});
