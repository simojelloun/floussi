// Outils communs aux tests.
const { expect } = require("@playwright/test");

/** Ouvre l'appli à neuf (données d'exemple) dans la langue voulue et surveille les erreurs JavaScript. */
async function ouvrir(page, lang = "fr", prefs = {}) {
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message));
  await page.goto("/index.html");
  await page.evaluate(([lang, prefs]) => { localStorage.clear(); localStorage.setItem("carnet-prefs", JSON.stringify({lang, ...prefs})); indexedDB.deleteDatabase("flousi"); }, [lang, prefs]);
  await page.reload();
  await expect(page.locator("#view")).not.toBeEmpty();
  page.erreurs = erreurs;
  return erreurs;
}

/** Quitte le mode « exemple » pour enregistrer réellement les données. */
async function commencer(page) {
  await page.click('[data-act="start"]');
  if (await page.locator("#wrap").isVisible()) await page.locator('#sheet button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => demo)).toBe(false);
}

/** Choisit une option dans une liste déroulante de l'appli (bouton + panneau). */
async function choisir(page, selectId, texte) {
  await page.click(`#${selectId}-pk`);
  await page.locator("#pick [role=option]", { hasText: texte }).first().click();
}

const toast = page => page.evaluate(() => { const t = document.getElementById("toast"); return t.hidden ? "" : t.textContent; });
const sansErreur = page => expect(page.erreurs, "erreurs JavaScript").toEqual([]);

/** Petite image PNG (pour la photo de ticket). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHklEQVR4nGP4z8DwnwFMMDAwMDCMGpAMRg0YDAYAAHWnD/G6NkmXAAAAAElFTkSuQmCC", "base64");

module.exports = { ouvrir, commencer, choisir, toast, sansErreur, PNG };
