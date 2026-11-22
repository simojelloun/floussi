// Données : enregistrement, emplacements inchangés, sauvegarde/restauration, anciennes données, version installée.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, sansErreur } = require("./aide");

test("les données restent après rechargement, au même endroit", async ({ page }) => {
  await ouvrir(page);
  await commencer(page);
  await page.click("#fab");
  await page.fill("#f-amt", "12");
  await page.fill("#f-note", "Café test");
  await page.click('#sheet button[type="submit"]');
  await page.reload();
  expect(await page.evaluate(() => allTx().some(t => t.note === "Café test"))).toBe(true);
  // emplacement historique : ne jamais le changer
  const brut = await page.evaluate(() => JSON.parse(localStorage.getItem("carnet-comptes-v1")));
  expect(Object.values(brut.months).flatMap(m => m.items).some(t => t.note === "Café test")).toBe(true);
  sansErreur(page);
});

test("si localStorage est vidé, IndexedDB restaure les données", async ({ page }) => {
  await ouvrir(page);
  await commencer(page);
  await page.click("#fab"); await page.fill("#f-amt", "7"); await page.fill("#f-note", "Copie de secours"); await page.click('#sheet button[type="submit"]');
  await page.waitForTimeout(1200);
  await page.evaluate(() => localStorage.removeItem("carnet-comptes-v1"));
  await page.reload();
  await expect.poll(() => page.evaluate(() => allTx().some(t => t.note === "Copie de secours")), { timeout: 5000 }).toBe(true);
  sansErreur(page);
});

test("sauvegarde puis restauration à l'identique", async ({ page }) => {
  await ouvrir(page);
  await commencer(page);
  const json = await page.evaluate(() => backupJSON());
  const avant = await page.evaluate(() => JSON.stringify(S));
  await page.evaluate(() => { location.hash = "donnees"; });
  await page.locator('input[type="file"]').first().setInputFiles({ name: "sauvegarde.json", mimeType: "application/json", buffer: Buffer.from(json) });
  if (await page.locator("#wrap").isVisible()) await page.locator('#sheet button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => JSON.stringify(S.meta.accounts))).toBe(JSON.stringify(JSON.parse(avant).meta.accounts));
  expect(await page.evaluate(() => allTx().length)).toBe(Object.values(JSON.parse(avant).months).flatMap(m => m.items).length);
  sansErreur(page);
});

test("d'anciennes données (sans modèles, sans étiquettes) s'ouvrent sans erreur", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => {
    const old = clone(S); delete old.meta.templates; old.meta.recurring.forEach(r => { delete r.skip; delete r.open; });
    localStorage.setItem("carnet-comptes-v1", JSON.stringify(old));
  });
  await page.reload();
  for (const e of ["accueil", "operations", "stats", "recurrentes", "modeles"]) { await page.evaluate(e => { location.hash = e; }, e); await expect(page.locator("#view")).not.toBeEmpty(); }
  sansErreur(page);
});

test("version installée (Capacitor simulé) : fichier privé, reprise et partage", async ({ page }) => {
  await page.addInitScript(() => {
    const K = "__fs", get = () => JSON.parse(sessionStorage.getItem(K) || "{}"), put = o => sessionStorage.setItem(K, JSON.stringify(o)), key = (d, p) => (d || "DOCUMENTS") + ":" + p;
    window.__partages = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: {
        async writeFile({ path, data, directory }) { const o = get(); o[key(directory, path)] = data; put(o); return { uri: "file:///" + key(directory, path) }; },
        async readFile({ path, directory }) { const o = get(), k = key(directory, path); if (!(k in o)) throw new Error("absent"); return { data: o[k] }; },
        async readdir({ path, directory }) { const o = get(), pre = key(directory, path) + "/"; return { files: Object.keys(o).filter(k => k.startsWith(pre) && !k.slice(pre.length).includes("/")).map(k => ({ name: k.slice(pre.length) })) }; },
        async deleteFile({ path, directory }) { const o = get(); delete o[key(directory, path)]; put(o); } },
      Share: { async share(o) { window.__partages.push(o); return {}; } },
      App: { addListener() { return { remove() {} }; } } } };
  });
  await ouvrir(page);
  await commencer(page);
  await page.click("#fab"); await page.fill("#f-amt", "250"); await page.fill("#f-note", "Pharmacie"); await page.click('#sheet button[type="submit"]');
  const fichiers = () => page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem("__fs") || "{}")));
  await expect.poll(fichiers).toContain("DATA:floussi/donnees.json");
  expect((await fichiers()).some(f => f.startsWith("DOCUMENTS:Floussi/floussi-sauvegarde-"))).toBe(true);
  await page.evaluate(() => { localStorage.removeItem("carnet-comptes-v1"); indexedDB.deleteDatabase("flousi"); });
  await page.reload();
  await expect.poll(() => page.evaluate(() => allTx().some(t => t.note === "Pharmacie")), { timeout: 5000 }).toBe(true);
  await page.evaluate(() => { location.hash = "donnees"; });
  await page.click('[data-act="export"]');
  await expect.poll(() => page.evaluate(() => window.__partages.length)).toBe(1);
  sansErreur(page);
});
