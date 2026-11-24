// Statistiques ajoutées : ce qui a changé, évolution d'une catégorie, patrimoine net, bilan de l'année.
const { test, expect } = require("@playwright/test");
const { ouvrir, sansErreur } = require("./aide");

test("analyse : ce qui a changé par rapport à la période d'avant", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="statview"][data-v="more"]');
  await page.click('[data-act="ana"][data-v="chg"]');
  await expect(page.locator("#view .ana-t")).toContainText("Ce qui a changé");
  const n = await page.locator("#view .chg").count();
  expect(n).toBeGreaterThan(0);
  // chaque ligne : écart affiché = maintenant − avant
  // toucher une ligne ouvre la fiche de la catégorie, en dépenses même si on regardait les revenus
  await page.evaluate(() => { statKind = "rev"; });
  await page.locator("#view .chg").first().click();
  await expect(page.locator("#sheet")).toContainText("Évolution sur 12 mois");
  expect(await page.evaluate(() => statKind)).toBe("dep");
  sansErreur(page);
});

test("fiche d'une catégorie : évolution sur 12 mois, moyenne et mois le plus élevé", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.locator('.rank[data-act="cat-detail"]').first().click();
  await expect(page.locator("#sheet svg.ce .ceb")).toHaveCount(12);
  await expect(page.locator("#sheet")).toContainText("Moyenne par mois");
  await expect(page.locator("#sheet")).toContainText("Mois le plus élevé");
  await page.locator("#sheet svg.ce .ceb").nth(10).dispatchEvent("pointerover");
  await expect(page.locator("#ce-l")).not.toBeEmpty();
  sansErreur(page);
});

test("patrimoine net : comptes + ce qu'on vous doit − ce que vous devez", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; statView = "bal"; render(); });
  await page.click('[data-act="balmode"][data-v="nw"]');
  await expect(page.locator("#bal-cap")).toContainText("Patrimoine au");
  const r = await page.evaluate(() => {
    const F = statF(), oc = F.out, ser = balanceSeries(F, true), last = ser[ser.length - 1];
    const accs = S.meta.accounts.reduce((s, a) => s + conv(balAt(a, last.d), a.cur, oc), 0);
    let lent = 0, bor = 0; for (const l of S.meta.loans) { let x = 0; for (const t of allTx()) if (t.t === "pret" && t.loan === l.id && t.date <= last.d) x += t.mv === "base" ? t.amt : -t.amt; if (x > 0) (l.kind === "lent" ? lent += conv(x, l.cur, oc) : bor += conv(x, l.cur, oc)); }
    return {nw: last.v, calc: accs + lent - bor, lent, bor};
  });
  expect(r.lent + r.bor).toBeGreaterThan(0);
  expect(Math.abs(r.nw - r.calc)).toBeLessThanOrEqual(2);
  await page.click('[data-act="balmode"][data-v="acc"]');
  await expect(page.locator("#bal-cap")).toContainText("Solde au");
  sansErreur(page);
});

test("bilan de l'année : mois par mois, faits marquants, année précédente", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "bilan"; window.__imp = 0; window.print = () => { window.__imp++; }; });
  await page.click('[data-act="bilmode"][data-v="y"]');
  await expect(page.locator("#view .sec-h", { hasText: "Mois par mois" })).toBeVisible();
  await expect(page.locator("#view .sec-h", { hasText: "Faits marquants" })).toBeVisible();
  const y = await page.evaluate(() => bilY);
  await expect(page.locator("#view .period b")).toHaveText(String(y));
  // dépenses de l'année = somme des mois du tableau
  const ok = await page.evaluate(() => { const F = statF(), f = flowsBetween(bilY + "-01-01", bilY + "-12-31", F); let s = 0; for (let m = 1; m <= 12; m++) s += flowsBetween(bilY + "-" + pad(m) + "-01", lastDay(bilY + "-" + pad(m)), F).dep; return Math.abs(s - f.dep) < 2; });
  expect(ok).toBe(true);
  await expect(page.locator('[data-act="bil-year"][data-n="1"]')).toBeDisabled();
  await page.click('[data-act="bil-year"][data-n="-1"]');
  await expect(page.locator("#view .period b")).toHaveText(String(y - 1));
  await page.click('[data-act="print"]');
  expect(await page.evaluate(() => window.__imp)).toBeGreaterThan(0);
  await page.click('[data-act="bilmode"][data-v="m"]');
  await expect(page.locator('[data-act="bil-month"]').first()).toBeVisible();
  sansErreur(page);
});

test("analyse en thèmes : sommaire court, une page par thème, navigation", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; });
  await page.click('[data-act="statview"][data-v="more"]');
  // le sommaire ne contient aucun graphique : seulement les thèmes et le bilan
  await expect(page.locator("#view .ana-menu li")).toHaveCount(7);
  await expect(page.locator("#view svg.chart")).toHaveCount(0);
  await expect(page.locator('#view .ana-menu [data-v="save"] small')).toContainText("Épargne");
  const themes = ["save", "chg", "when", "where", "fixed", "src"];
  await page.click('[data-act="ana"][data-v="save"]');
  for (let i = 0; i < themes.length; i++) {
    await expect(page.locator("#view .ana-body .card").first()).toBeVisible();
    expect(await page.evaluate(() => anaSel)).toBe(themes[i]);
    if (i < themes.length - 1) await page.locator('#view .ana-nav [data-act="ana"]').last().click();
  }
  await expect(page.locator("#view .ana-t")).toContainText("Comptes et revenus");
  await page.click('#view .ana-top [data-act="ana"]');
  await expect(page.locator("#view .ana-menu")).toBeVisible();
  // changer d'onglet puis revenir ramène au sommaire
  await page.click('[data-act="ana"][data-v="when"]');
  await page.click('[data-act="statview"][data-v="cat"]');
  await page.click('[data-act="statview"][data-v="more"]');
  await expect(page.locator("#view .ana-menu")).toBeVisible();
  // le bilan imprimable est dans le sommaire
  await page.click('#view .ana-menu a[href="#bilan"]');
  await expect(page.locator('[data-act="bilmode"]').first()).toBeVisible();
  sansErreur(page);
});

test("catégories : 6 premières, puis « afficher les autres » ; tableau par mois replié", async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => { location.hash = "stats"; preset = "all"; setPreset("all"); render(); });
  const n = await page.evaluate(() => Object.keys(flowsBetween(range.from, range.to, statF()).byTop.dep).length);
  if (n > 7) {
    await expect(page.locator("#view .rank")).toHaveCount(6);
    await page.click('[data-act="cat-all"]');
    await expect(page.locator("#view .rank")).toHaveCount(n);
  }
  await page.click('[data-act="statview"][data-v="months"]');
  await expect(page.locator("#view table.mini")).toBeHidden();
  await page.click("#view .tbl-more summary");
  await expect(page.locator("#view table.mini")).toBeVisible();
  sansErreur(page);
});
