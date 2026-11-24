// « À venir » la veille de l'échéance, et rappel des échéances dépassées.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, toast, sansErreur } = require("./aide");

/** Ajoute une opération récurrente mensuelle dont la première échéance est à `jours` d'aujourd'hui (négatif = passée). */
const recurrente = (page, id, jours, note) => page.evaluate(([id, jours, note]) => {
  S.meta.recurring.push({id, t: "dep", amt: 50000, acc: S.meta.accounts[0].id, cat: cats("dep")[0].id, note, unit: "m", every: 1, start: addDays(today(), jours), end: "", k: 0, mode: "manual", paused: false});
  touch("meta"); location.hash = "accueil"; render();
}, [id, jours, note]);

test("« À venir » ne montre que l'échéance de demain", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await recurrente(page, "rc-dem", 1, "Assurance");
  await recurrente(page, "rc-3j", 3, "Abonnement");
  const bloc = page.locator("#view .sec-h", { hasText: "À venir" });
  await expect(bloc).toContainText("Jusqu'à demain");
  const liste = page.locator("#view .sec-h:has-text('À venir') + ul");
  await expect(liste).toContainText("Assurance");
  await expect(liste).not.toContainText("Abonnement");
  await expect(page.locator("#view .when", { hasText: "Demain" })).toHaveCount(1);
  sansErreur(page);
});

test("une échéance dépassée est rappelée en haut de l'Accueil, et disparaît une fois payée", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await recurrente(page, "rc-late", -5, "Loyer");
  const bloc = page.locator("#view .late-box");
  await expect(bloc).toBeVisible();
  await expect(bloc).toContainText("1 échéance dépassée");
  await expect(bloc).toContainText("Loyer");
  await expect(bloc).toContainText("En retard ·");
  await expect(bloc).toContainText("5 jours");
  // pas en double dans « À payer »
  await expect(page.locator("#view .sec-h", { hasText: "À payer" })).toHaveCount(0);
  // le bloc est juste après les soldes, avant les comptes
  expect(await page.evaluate(() => { const b = document.querySelector(".late-box"); return b.previousElementSibling && b.previousElementSibling.classList.contains("ledger"); })).toBe(true);
  await bloc.locator('[data-act="rec-ok"]').click();
  await expect(page.locator("#view .late-box")).toHaveCount(0);
  expect(await page.evaluate(() => allTx().some(t => t.rec === "rc-late"))).toBe(true);
  sansErreur(page);
});

test("une échéance d'aujourd'hui reste dans « À payer », pas dans les retards", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await recurrente(page, "rc-auj", 0, "Électricité");
  await expect(page.locator("#view .sec-h", { hasText: "À payer" })).toHaveCount(1);
  await expect(page.locator("#view .late-box")).toHaveCount(0);
  sansErreur(page);
});

test("un remboursement de prêt en retard est aussi rappelé", async ({ page }) => {
  await ouvrir(page);
  const nom = await page.evaluate(() => { const l = S.meta.loans.find(l => !loanState(l).done); l.due = addDays(today(), -2); render(); return l.person; });
  await expect(page.locator("#view .late-box")).toContainText(nom);
  // au-delà de 3 échéances, les autres sont repliées sous « Voir les … autres »
  const n = await page.evaluate(() => overdue().length);
  if (n > 3) { await expect(page.locator("#view .late-more summary")).toHaveText(`Voir les ${n - 3} autres`); await page.click("#view .late-more summary"); }
  await page.locator('#view .late-box [data-act="loan"]').first().click();
  await expect(page.locator("#wrap")).toBeVisible();
  sansErreur(page);
});

test("rappel à l'ouverture, une seule fois par jour", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await recurrente(page, "rc-late", -3, "Loyer");
  await page.evaluate(() => { delete P.lateSeen; savePrefs(); });
  await page.reload();
  await expect.poll(() => toast(page)).toContain("Rappel : 1 échéance dépassée");
  await page.reload(); await page.waitForTimeout(1800);
  expect(await toast(page)).not.toContain("Rappel");
  sansErreur(page);
});
