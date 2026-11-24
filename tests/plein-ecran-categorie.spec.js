// Création d'une catégorie pendant la saisie, et graphiques en plein écran.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, toast, sansErreur } = require("./aide");

async function ouvrirSaisie(page) {
  await page.click("#fab");
  await expect(page.locator("#f-cat-btn")).toBeVisible();
  await page.fill("#f-amt", "42");
  await page.fill("#f-note", "Croquettes");
  await page.click("#f-cat-btn");
  await expect(page.locator("#pick .pk-add")).toBeVisible();
}

test("nouvelle catégorie principale depuis la saisie : créée, choisie, la saisie est gardée", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  const avant = await page.evaluate(() => S.meta.categories.length);
  await ouvrirSaisie(page);
  await page.click("#pick .pk-add");
  await expect(page.locator("#pk-name")).toBeFocused();
  await page.fill("#pk-name", "Chat");
  // l'icône est devinée d'après le nom
  expect(await page.evaluate(() => document.querySelector('input[name="pk-icon"]:checked').value)).toBe("🐈");
  await page.click('#pk-new button[type="submit"]');
  await expect(page.locator("#pick")).toBeHidden();
  const c = await page.evaluate(() => S.meta.categories.at(-1));
  expect(c).toMatchObject({name: "Chat", kind: "dep", parent: "", icon: "🐈"});
  expect(await page.evaluate(() => S.meta.categories.length)).toBe(avant + 1);
  expect(await page.evaluate(() => draft.cat)).toBe(c.id);
  await expect(page.locator("#f-amt")).toHaveValue("42");
  await expect(page.locator("#f-note")).toHaveValue("Croquettes");
  await expect(page.locator("#f-cat-btn")).toContainText("Chat");
  expect(await toast(page)).toContain("Catégorie ajoutée");
  await page.click('#sheet button[type="submit"]');
  expect(await page.evaluate(id => allTx().some(t => t.cat === id && t.amt === 4200), c.id)).toBe(true);
  sansErreur(page);
});

test("sous-catégorie : choisir la catégorie principale dans « Placer dans »", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await ouvrirSaisie(page);
  const parent = await page.evaluate(() => cats("dep").find(c => !c.parent && !kids(c.id).length));
  await page.click("#pick .pk-add");
  await page.selectOption("#pk-par", parent.id);
  await expect(page.locator(".pk-ic")).toBeHidden();
  await page.fill("#pk-name", "Bio");
  await page.click('#pk-new button[type="submit"]');
  const c = await page.evaluate(() => S.meta.categories.at(-1));
  expect(c).toMatchObject({name: "Bio", parent: parent.id, color: parent.color});
  await expect(page.locator("#f-cat-btn")).toContainText(parent.name);
  // la catégorie principale a maintenant un sous-menu, ouvert sur la sous-catégorie choisie
  await page.click("#f-cat-btn");
  await expect(page.locator('#pick [aria-selected="true"]')).toContainText("Bio");
  await page.click('#pick [data-act="pick-back"]');
  await expect(page.locator(`#pick [data-act="pick-sub"][data-v="${parent.id}"]`)).toBeVisible();
  sansErreur(page);
});

test("nouvelle sous-catégorie depuis le sous-menu d'une catégorie", async ({ page }) => {
  await ouvrir(page);
  await ouvrirSaisie(page);
  const parent = await page.evaluate(() => cats("dep").find(c => !c.parent && kids(c.id).length));
  await page.click(`#pick [data-act="pick-sub"][data-v="${parent.id}"]`);
  await expect(page.locator("#pick .pk-add")).toContainText(parent.name);
  await page.click("#pick .pk-add");
  await expect(page.locator("#pk-par")).toHaveValue(parent.id);
  await expect(page.locator(".pk-ic")).toBeHidden();
  await page.fill("#pk-name", "Vétérinaire");
  await page.press("#pk-name", "Enter");
  await expect(page.locator("#pick")).toBeHidden();
  const c = await page.evaluate(() => S.meta.categories.at(-1));
  expect(c).toMatchObject({name: "Vétérinaire", parent: parent.id, color: parent.color});
  expect(await page.evaluate(() => draft.cat)).toBe(c.id);
  // la saisie n'a pas été enregistrée par la touche Entrée
  await expect(page.locator("#wrap")).toBeVisible();
  sansErreur(page);
});

test("nom vide ou en double refusé ; Échap revient à la liste", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await ouvrirSaisie(page);
  await page.click("#pick .pk-add");
  await page.click('#pk-new button[type="submit"]');
  await expect(page.locator("#pk-err")).toContainText("nom");
  const existante = await page.evaluate(() => cats("dep").find(c => !c.parent).name);
  await page.fill("#pk-name", existante.toUpperCase());
  await page.click('#pk-new button[type="submit"]');
  await expect(page.locator("#pk-err")).toContainText("existe déjà");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pk-new")).toHaveCount(0);
  await expect(page.locator("#pick .pk-add")).toBeVisible();
  sansErreur(page);
});

test("une recherche sans résultat propose de créer la catégorie", async ({ page }) => {
  await ouvrir(page);
  await ouvrirSaisie(page);
  await page.fill("#pk-q", "Jardinerie");
  await expect(page.locator("#pick .pk-add")).toContainText("« Jardinerie »");
  await page.click("#pick .pk-add");
  await expect(page.locator("#pk-name")).toHaveValue("Jardinerie");
  sansErreur(page);
});

test("graphique des catégories en plein écran, puis retour", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="fs"][data-k="cat"]');
  await expect(page.locator("#fs")).toBeVisible();
  await expect(page.locator("#fs-t")).toHaveText("Dépenses par catégorie");
  await expect(page.locator("#fs-close")).toBeFocused();
  await expect(page.locator("#fs .rank").first()).toBeVisible();
  expect(await page.evaluate(() => document.querySelector("nav.tabs").inert)).toBe(true);
  // changer de graphique sans quitter le plein écran
  await page.click('#fs [data-act="catview"][data-v="pie"]');
  await expect(page.locator("#fs .donut")).toBeVisible();
  await page.click('#fs [data-act="statkind"][data-v="rev"]');
  await expect(page.locator("#fs-t")).toHaveText("Revenus par catégorie");
  await page.keyboard.press("Escape");
  await expect(page.locator("#fs")).toBeHidden();
  await expect(page.locator('[data-act="fs"][data-k="cat"]')).toBeFocused();
  expect(await page.evaluate(() => document.querySelector("nav.tabs").inert)).toBe(false);
  sansErreur(page);
});

test("courbe du solde et barres par mois plus grandes en plein écran", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="statview"][data-v="bal"]');
  const h0 = await page.locator("#bal").evaluate(s => s.viewBox.baseVal.height);
  await page.click('[data-act="fs"][data-k="bal"]');
  const h1 = await page.locator("#fs #bal").evaluate(s => s.viewBox.baseVal.height);
  expect(h1).toBeGreaterThan(h0 * 1.5);
  await expect(page.locator("#fs #bal-date")).toHaveCount(1);
  await page.click("#fs-close");
  await expect(page.locator("#fs")).toBeHidden();
  await page.click('[data-act="statview"][data-v="months"]');
  await page.click('[data-act="fs"][data-k="months"]');
  await expect(page.locator("#fs table.mini")).toBeVisible();
  // changer d'onglet ferme le plein écran
  await page.evaluate(() => { location.hash = "accueil"; });
  await expect(page.locator("#fs")).toBeHidden();
  expect(await page.evaluate(() => document.getElementById("view").inert)).toBe(false);
  sansErreur(page);
});
