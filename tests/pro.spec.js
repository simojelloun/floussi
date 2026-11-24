// Floussi Pro : abonnement dans l'appli installée (module d'achat simulé). Sur le web, tout reste gratuit.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, toast, sansErreur } = require("./aide");

/** Ouvre l'appli comme la version installée (iPhone), avec un magasin simulé. `actif` : abonnement déjà en cours. */
async function natif(page, { actif = false, expire = false, essai = true } = {}) {
  const erreurs = []; page.on("pageerror", e => erreurs.push(e.message)); page.erreurs = erreurs;
  await page.addInitScript(([actif, expire, essai]) => {
    const dans = j => new Date(Date.now() + j * 864e5).toISOString();
    window.__achats = actif ? [{productIdentifier: "floussi_pro_annuel", isActive: true, expirationDate: dans(300), willCancel: false}] : expire ? [{productIdentifier: "floussi_pro_annuel", isActive: false, expirationDate: dans(-10), subscriptionState: "expired"}] : [];
    window.__appels = [];
    window.Capacitor = {isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {NativePurchases: {
      getProducts: async o => { __appels.push(["produits", o]); const tous = {floussi_pro_annuel: {identifier: "floussi_pro_annuel", priceString: "4,99 €", introductoryPrice: essai ? {price: 0, numberOfPeriods: 1, subscriptionPeriod: {numberOfUnits: 2, unit: 1, unitString: "week"}} : null}, floussi_pro_a_vie: {identifier: "floussi_pro_a_vie", priceString: "14,99 €", introductoryPrice: null}};
        return {products: o.productIdentifiers.map(i => tous[i]).filter(Boolean)}; },
      getPurchases: async () => ({purchases: __achats}),
      purchaseProduct: async o => { __appels.push(["achat", o]); __achats = [o.productIdentifier === "floussi_pro_a_vie" ? {productIdentifier: o.productIdentifier} : {productIdentifier: o.productIdentifier, isActive: true, expirationDate: dans(365), willCancel: false}]; return __achats[0]; },
      restorePurchases: async () => { __appels.push(["restaurer"]); },
      manageSubscriptions: async () => { __appels.push(["gerer"]); }
    }}};
  }, [actif, expire, essai]);
  await page.goto("/index.html");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("carnet-prefs", JSON.stringify({lang: "fr"})); });
  await page.reload();
  await expect(page.locator("#view")).not.toBeEmpty();
  await page.waitForTimeout(600);
}

test("sur le web, tout est gratuit : aucun cadenas Pro", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  expect(await page.evaluate(() => isPro())).toBe(true);
  await page.click("#fab"); await page.locator("#f-more summary").click();
  await expect(page.locator("#sheet .pro-lock")).toHaveCount(0);
  await expect(page.locator("#f-split")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { location.hash = "reglages"; });
  await expect(page.locator('[data-act="pro"]')).toHaveCount(0);
  sansErreur(page);
});

test("appli installée sans abonnement : outils avancés verrouillés, la saisie est gardée", async ({ page }) => {
  await natif(page);
  expect(await page.evaluate(() => isPro())).toBe(false);
  await page.click("#fab");
  await page.fill("#f-amt", "42"); await page.fill("#f-note", "Restaurant");
  await page.locator("#f-more summary").click();
  await expect(page.locator("#sheet .pro-lock")).toHaveCount(3); // répartition, étiquettes, photo
  await expect(page.locator("#f-split")).toHaveCount(0);
  await page.click('#sheet [data-why="split"]');
  await expect(page.locator("#sheet-title")).toHaveText(/Floussi Pro/);
  await expect(page.locator("#pro-price")).toContainText("4,99 €");
  await expect(page.locator("#sheet")).toContainText("Restaurer mes achats");
  await expect(page.locator("#sheet a", { hasText: "Conditions d'utilisation" })).toHaveCount(1);
  // retour : la saisie est intacte
  await page.keyboard.press("Escape");
  await expect(page.locator("#f-amt")).toHaveValue("42");
  await expect(page.locator("#f-note")).toHaveValue("Restaurant");
  sansErreur(page);
});

test("s'abonner débloque tout de suite, sans perdre la saisie", async ({ page }) => {
  await natif(page);
  await page.click("#fab"); await page.fill("#f-amt", "42");
  await page.locator("#f-more summary").click();
  await page.click('#sheet [data-why="photo"]');
  await page.click("#pro-buy");
  await expect.poll(() => toast(page)).toContain("Floussi Pro est activé");
  expect(await page.evaluate(() => isPro())).toBe(true);
  expect(await page.evaluate(() => __appels.find(a => a[0] === "achat")[1])).toMatchObject({productIdentifier: "floussi_pro_annuel", productType: "subs"});
  await expect(page.locator("#f-amt")).toHaveValue("42");
  await expect(page.locator("#sheet .pro-lock")).toHaveCount(0);
  await expect(page.locator("#f-split")).toHaveCount(1);
  sansErreur(page);
});

test("abonnement déjà actif : tout est disponible, et l'abonnement se gère depuis les réglages", async ({ page }) => {
  await natif(page, { actif: true });
  expect(await page.evaluate(() => isPro())).toBe(true);
  await page.evaluate(() => { location.hash = "reglages"; });
  await expect(page.locator('[data-act="pro"]')).toContainText("Actif");
  await page.click('[data-act="pro"]');
  await expect(page.locator("#sheet")).toContainText("Floussi Pro est actif");
  await page.click('[data-act="pro-manage"]');
  expect(await page.evaluate(() => __appels.some(a => a[0] === "gerer"))).toBe(true);
  sansErreur(page);
});

test("abonnement expiré : retour à la version gratuite, style et couleurs par défaut", async ({ page }) => {
  await natif(page, { expire: true });
  await page.evaluate(() => { P.style = "glass"; P.accent = Object.keys(THEMES).find(k => k !== "sapin"); savePrefs(); applyPrefs(); render(); });
  expect(await page.evaluate(() => isPro())).toBe(false);
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-style"))).toBe(null);
  await page.evaluate(() => { location.hash = "apparence"; });
  await expect(page.locator('#view [data-why="theme"]')).toBeVisible();
  await expect(page.locator("#pstyle-glass")).toBeDisabled();
  sansErreur(page);
});

test("vues réservées : prévisions, analyse, bilan, import CSV", async ({ page }) => {
  await natif(page);
  await expect(page.locator("#view .pro-teaser")).toContainText("Prévisions de solde");
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="statview"][data-v="more"]');
  await expect(page.locator("#view .pro-teaser")).toContainText("Analyse détaillée");
  await page.evaluate(() => { location.hash = "bilan"; });
  await expect(page.locator("#view .pro-teaser")).toContainText("Bilan du mois");
  await page.evaluate(() => { location.hash = "donnees"; });
  await expect(page.locator('#view [data-why="csv"]')).toBeVisible();
  await expect(page.locator("#csv-file")).toHaveCount(0);
  sansErreur(page);
});

test("restaurer ses achats retrouve un abonnement pris sur un autre appareil", async ({ page }) => {
  await natif(page);
  await page.evaluate(() => { __achats = [{productIdentifier: "floussi_pro_annuel", isActive: true, expirationDate: new Date(Date.now() + 2e10).toISOString()}]; location.hash = "reglages"; });
  await page.click('[data-act="pro"]');
  await page.click('[data-act="pro-restore"]');
  await expect.poll(() => toast(page)).toContain("retrouvé");
  expect(await page.evaluate(() => isPro())).toBe(true);
  sansErreur(page);
});

test("données saisies avant : des étiquettes existantes restent modifiables sans Pro", async ({ page }) => {
  await natif(page);
  await page.evaluate(() => { const t = allTx().find(t => t.t === "dep"); t.tags = ["Vacances"]; openTx(t); });
  await page.locator("#f-more summary").click();
  await expect(page.locator("#f-tags")).toHaveValue(/Vacances/);
  sansErreur(page);
});

test("version gratuite : on démarre avec 3 comptes et 2 devises, et on ne peut pas en ajouter", async ({ page }) => {
  await natif(page);
  await commencer(page);
  expect(await page.evaluate(() => [S.meta.accounts.length, S.meta.currencies.length])).toEqual([3, 2]);
  await page.evaluate(() => { location.hash = "comptes"; });
  const verrou = page.locator('#view [data-why="acc"]');
  await expect(verrou).toContainText("Version gratuite : 3 comptes");
  await verrou.click();
  await expect(page.locator("#sheet .pro-why")).toContainText("limitée à 3 comptes");
  await page.keyboard.press("Escape");
  // même par un autre chemin, l'ajout est bloqué
  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<button id="x" data-act="new-cur">x</button>'));
  await page.click("#x");
  await expect(page.locator("#sheet .pro-why")).toContainText("limitée à 2 devises");
  sansErreur(page);
});

test("version gratuite : un seul budget", async ({ page }) => {
  await natif(page);
  await commencer(page);
  await page.evaluate(() => { location.hash = "budgets"; });
  await page.click('#view [data-act="new-budget"]');
  await page.fill("#f-lim", "500");
  await page.click('#sheet button[type="submit"]');
  await expect.poll(() => page.evaluate(() => S.meta.budgets.length)).toBe(1);
  await expect(page.locator('#view [data-why="bud"]')).toContainText("Version gratuite : 1 budget");
  await expect(page.locator('#view [data-act="new-budget"]')).toHaveCount(0);
  sansErreur(page);
});

test("version gratuite : statistiques avancées et daret réservés à Pro, zakat gratuite", async ({ page }) => {
  await natif(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await expect(page.locator("#view .pro-teaser")).toHaveCount(0); // catégories : gratuit
  for (const v of ["bal", "months"]) {
    await page.click(`[data-act="statview"][data-v="${v}"]`);
    await expect(page.locator("#view .pro-teaser")).toContainText("statistiques avancées");
  }
  // fiche d'une catégorie : la répartition reste gratuite, l'évolution sur 12 mois est Pro
  await page.click('[data-act="statview"][data-v="cat"]');
  await page.locator('.rank[data-act="cat-detail"]').first().click();
  await expect(page.locator('#sheet .pro-lock')).toContainText("Évolution sur 12 mois");
  await expect(page.locator("#sheet svg.ce")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { location.hash = "prets"; });
  await expect(page.locator('#view [data-why="daret"]')).toBeVisible();
  await expect(page.locator('#view [data-act="dar-new"]')).toHaveCount(0);
  // une daret existante reste consultable
  await page.evaluate(() => { darSel = DARETS()[0].id; location.hash = "daret"; });
  await expect(page.locator("#view")).toContainText("Daret de la famille");
  await page.evaluate(() => { location.hash = "zakat"; });
  await expect(page.locator("#view .pro-teaser")).toHaveCount(0);
  await expect(page.locator("#z-gold, #view input").first()).toBeVisible();
  sansErreur(page);
});

test("avec Pro : pas de limite", async ({ page }) => {
  await natif(page, { actif: true });
  await commencer(page);
  expect(await page.evaluate(() => S.meta.accounts.length)).toBe(4);
  await page.evaluate(() => { location.hash = "comptes"; });
  await expect(page.locator('#view [data-act="new-acc"]')).toBeVisible();
  await page.evaluate(() => { location.hash = "zakat"; });
  await expect(page.locator("#view .pro-teaser")).toHaveCount(0);
  sansErreur(page);
});

test("essai gratuit : affiché quand le magasin en propose un, sinon simple abonnement", async ({ page }) => {
  await natif(page);
  await page.evaluate(() => { location.hash = "reglages"; });
  await page.click('[data-act="pro"]');
  await expect(page.locator("#pro-buy")).toContainText("Essayer gratuitement pendant 14 jours");
  await expect(page.locator("#pro-buy")).toContainText("puis 4,99 € par an");
  await expect(page.locator("#sheet .pro-legal")).toContainText("essai gratuit");
  sansErreur(page);
});

test("sans essai : bouton « S'abonner »", async ({ page }) => {
  await natif(page, { essai: false });
  await page.evaluate(() => { location.hash = "reglages"; });
  await page.click('[data-act="pro"]');
  await expect(page.locator("#pro-buy")).toContainText("S'abonner à Floussi Pro");
  await expect(page.locator("#pro-buy")).toContainText("4,99 € par an");
  sansErreur(page);
});

test("achat à vie : un seul paiement, Pro sans date de fin ni abonnement à gérer", async ({ page }) => {
  await natif(page);
  await page.evaluate(() => { location.hash = "reglages"; });
  await page.click('[data-act="pro"]');
  await expect(page.locator("#pro-buy-life")).toContainText("Acheter à vie · 14,99 €");
  await page.click("#pro-buy-life");
  await expect.poll(() => toast(page)).toContain("Floussi Pro est activé");
  expect(await page.evaluate(() => __appels.find(a => a[0] === "achat")[1])).toMatchObject({productIdentifier: "floussi_pro_a_vie", productType: "inapp"});
  expect(await page.evaluate(() => [isPro(), P.pro.life, P.pro.until])).toEqual([true, 1, ""]);
  await page.click('[data-act="pro"]');
  await expect(page.locator("#sheet")).toContainText("Floussi Pro est actif à vie");
  await expect(page.locator('[data-act="pro-manage"]')).toHaveCount(0);
  sansErreur(page);
});
