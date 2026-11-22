// Saisie d'opérations : catégories et sous-catégories, compte, modèles, suggestions, étiquettes, photo, alerte de budget.
const { test, expect } = require("@playwright/test");
const { ouvrir, choisir, toast, sansErreur, PNG } = require("./aide");

test("ajouter une dépense dans une sous-catégorie", async ({ page }) => {
  await ouvrir(page);
  const avant = await page.evaluate(() => allTx().length);
  await page.click("#fab");
  await page.fill("#f-amt", "85,50");
  await page.click("#f-cat-btn");
  await page.click('#pick [data-v="c-alim"]');                       // sous-menu Alimentation
  await page.locator("#pick [role=option]", { hasText: "Restaurant" }).click();
  await expect(page.locator("#f-cat-btn")).toContainText("Restaurant");
  await expect(page.locator("#f-cat-btn")).toBeFocused();
  await page.fill("#f-note", "Déjeuner");
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#wrap")).toBeHidden();
  const t = await page.evaluate(() => allTx().find(t => t.note === "Déjeuner"));
  expect(t).toMatchObject({ t: "dep", amt: 8550, cat: "c-alim-rest", date: await page.evaluate(() => today()) });
  expect(await page.evaluate(() => allTx().length)).toBe(avant + 1);
  sansErreur(page);
});

test("montant obligatoire : message d'erreur et focus", async ({ page }) => {
  await ouvrir(page);
  await page.click("#fab");
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#f-err")).not.toBeEmpty();
  await expect(page.locator("#f-amt")).toBeFocused();
  sansErreur(page);
});

test("virement entre deux devises", async ({ page }) => {
  await ouvrir(page);
  await page.click("#fab");
  await page.click("label:has(#f-t-vir)");
  await page.fill("#f-amt", "1000");
  const eur = await page.evaluate(() => S.meta.accounts.find(a => a.cur === "EUR").name);
  await choisir(page, "f-to", eur);
  await expect(page.locator("#f-amt-to")).toBeVisible();
  await page.click('#sheet button[type="submit"]');
  const t = await page.evaluate(() => allTx().filter(t => t.t === "vir").sort((a, b) => b.id.localeCompare(a.id))[0]);
  expect(t.amt).toBe(100000); expect(t.amtTo).toBeGreaterThan(0);
  sansErreur(page);
});

test("modèle, suggestion de libellé, étiquettes et photo", async ({ page }) => {
  await ouvrir(page);
  const note = await page.evaluate(() => allTx().find(t => t.t === "dep" && t.note).note);
  await page.click("#fab");
  await page.fill("#f-note", note.slice(0, 3));
  await expect(page.locator("#f-sug button").first()).toBeVisible();
  await page.locator("#f-sug button").first().click();
  await expect(page.locator("#f-amt")).not.toHaveValue("");
  await page.evaluate(() => { document.getElementById("f-more").open = true; });
  await page.fill("#f-tags", "Voyage été, Famille");
  await page.setInputFiles("#f-photo", { name: "ticket.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator("#ph-box img")).toBeVisible();
  await page.click("#f-tpl");
  expect(await page.evaluate(() => TPL().length)).toBe(1);
  await page.click('#sheet button[type="submit"]');
  const t = await page.evaluate(() => { const t = allTx().find(t => (t.tags || []).includes("Famille")); return t && { tags: t.tags, ph: t.ph, photo: !!PHOTOS[t.grp || t.id] }; });
  expect(t).toEqual({ tags: ["Voyage été", "Famille"], ph: 1, photo: true });
  // le modèle apparaît sur l'Accueil et pré-remplit le formulaire
  await page.evaluate(() => { location.hash = "accueil"; });
  await page.locator('[data-act="tpl-new"]').first().click();
  await expect(page.locator("#f-tags")).toHaveValue("Voyage été, Famille");
  sansErreur(page);
});

test("alerte quand un budget est dépassé", async ({ page }) => {
  await ouvrir(page);
  const b = await page.evaluate(() => S.meta.budgets[0]);
  await page.click("#fab");
  await page.evaluate(c => { const s = document.getElementById("f-cat"); s.value = c; s.dispatchEvent(new Event("change", { bubbles: true })); }, b.cat);
  await page.fill("#f-amt", String(b.limit / 100));
  await page.click('#sheet button[type="submit"]');
  expect(await toast(page)).toContain("⚠");
  sansErreur(page);
});

test("répartir une dépense sur deux lignes", async ({ page }) => {
  await ouvrir(page);
  await page.click("#fab");
  await page.evaluate(() => { document.getElementById("f-more").open = true; });
  await page.check("#f-split");
  await page.fill("#p-amt-0", "60");
  await page.click('[data-act="part-add"]');
  await page.fill("#p-amt-1", "40");
  await page.fill("#f-note", "Courses partagées");
  await page.click('#sheet button[type="submit"]');
  const g = await page.evaluate(() => allTx().filter(t => t.note === "Courses partagées").map(t => t.amt).sort());
  expect(g).toEqual([4000, 6000]);
  sansErreur(page);
});
