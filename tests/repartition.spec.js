// Opérations réparties (« dépense combinée ») : totaux justes partout, et modifications sans double comptage.
const { test, expect } = require("@playwright/test");
const { ouvrir, commencer, sansErreur } = require("./aide");

/** Crée par l'interface une dépense répartie : 120 DH Alimentation (Compte courant Maroc), 30 € Transport (Compte France), −40 DH Alimentation (Espèces). */
async function creerRepartie(page) {
  await page.click("#fab");
  await page.fill("#f-note", "Courses et taxi");
  await page.locator("#f-more summary").click();
  await page.check("#f-split");
  await page.fill("#p-amt-0", "120");
  await page.evaluate(() => { const s = document.getElementById("p-cat-0"); s.value = "c-alim"; s.dispatchEvent(new Event("change", {bubbles: true})); const a = document.getElementById("p-acc-0"); a.value = "a-mad"; a.dispatchEvent(new Event("change", {bubbles: true})); });
  await page.click('[data-act="part-add"]');
  await page.fill("#p-amt-1", "30");
  await page.evaluate(() => { const s = document.getElementById("p-cat-1"); s.value = "c-trans"; s.dispatchEvent(new Event("change", {bubbles: true})); const a = document.getElementById("p-acc-1"); a.value = "a-eur"; a.dispatchEvent(new Event("change", {bubbles: true})); });
  await page.click('[data-act="part-add"]');
  await page.fill("#p-amt-2", "-40");
  await page.evaluate(() => { const s = document.getElementById("p-cat-2"); s.value = "c-alim"; s.dispatchEvent(new Event("change", {bubbles: true})); const a = document.getElementById("p-acc-2"); a.value = "a-esp"; a.dispatchEvent(new Event("change", {bubbles: true})); });
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#wrap")).toBeHidden();
}
const etat = page => page.evaluate(() => {
  const ym = today().slice(0, 7), all = allTx(), g = all.filter(t => t.grp);
  const mad = curF("MAD"), eur = curF("EUR"), tous = {has: () => true, out: "MAD", ids: S.meta.accounts.map(a => a.id)};
  return {n: all.length, grp: g.length, groupes: new Set(g.map(t => t.grp)).size,
    depMAD: monthFlows(ym, mad).dep, depEUR: monthFlows(ym, eur).dep, depTout: monthFlows(ym, tous).dep,
    alim: budgetState({cat: "c-alim", cur: "MAD", limit: 100000}, ym).spent,
    soldes: Object.fromEntries(S.meta.accounts.map(a => [a.id, balance(a)]))};
});

test("les totaux comptent chaque ligne une fois, dans sa devise", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  const avant = await etat(page);
  await creerRepartie(page);
  const e = await etat(page);
  expect(e.n - avant.n).toBe(3); expect(e.groupes).toBe(1);
  expect(e.depMAD - avant.depMAD).toBe(8000);          // 120 − 40 DH
  expect(e.depEUR - avant.depEUR).toBe(3000);          // 30 €
  expect(e.depTout - avant.depTout).toBe(8000 + 32400); // 30 € à 10,8 DH
  expect(e.alim - avant.alim).toBe(8000);
  expect(e.soldes["a-mad"] - avant.soldes["a-mad"]).toBe(-12000);
  expect(e.soldes["a-esp"] - avant.soldes["a-esp"]).toBe(4000);
  expect(e.soldes["a-eur"] - avant.soldes["a-eur"]).toBe(-3000);
  // ligne de groupe dans Opérations : total net par devise
  await page.evaluate(() => { location.hash = "operations"; P.opView = "list"; render(); });
  await expect(page.locator("li.grp > .row .amt").first()).toHaveText(/−80,00\s?DH · −30,00\s?€/);
  sansErreur(page);
});

test("rouvrir et enregistrer sans rien changer ne double rien", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  await creerRepartie(page); const e1 = await etat(page);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => openTx(allTx().find(t => t.grp)));
    await page.click('#sheet button[type="submit"]');
    await expect(page.locator("#wrap")).toBeHidden();
  }
  const e2 = await etat(page);
  expect(e2).toEqual(e1);
  sansErreur(page);
});

test("décocher « Répartir » remplace tout le groupe par une seule opération", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  const avant = await etat(page);
  await creerRepartie(page);
  await page.evaluate(() => openTx(allTx().filter(t => t.grp)[1]));
  await page.uncheck("#f-split");
  await page.click('#sheet button[type="submit"]');
  const e = await etat(page);
  expect(e.n - avant.n).toBe(1); expect(e.grp).toBe(0);
  sansErreur(page);
});

test("transformer une opération répartie en virement ne laisse pas d'autres lignes", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  const avant = await etat(page);
  await creerRepartie(page);
  await page.evaluate(() => openTx(allTx().find(t => t.grp && t.acc === "a-mad")));
  await page.check("#f-t-vir", { force: true });
  await page.evaluate(() => { const s = document.getElementById("f-to"); s.value = "a-ep"; s.dispatchEvent(new Event("change", {bubbles: true})); });
  await page.fill("#f-amt", "120");
  await page.click('#sheet button[type="submit"]');
  const e = await etat(page);
  expect(e.n - avant.n).toBe(1); expect(e.grp).toBe(0);
  expect(e.depMAD).toBe(avant.depMAD);
  sansErreur(page);
});

test("répartir une échéance déjà payée la garde payée", async ({ page }) => {
  await ouvrir(page); await commencer(page);
  // loyer mensuel déjà payé aujourd'hui
  const rid = await page.evaluate(() => { const r = {id: "rc-t", t: "dep", amt: 300000, acc: "a-mad", cat: "c-log", note: "Loyer", unit: "m", every: 1, start: today(), end: "", k: 1, mode: "manual", paused: false};
    S.meta.recurring.push(r); putTx(recTx(r, today())); touch("meta"); render(); return r.id; });
  const etatRec = () => page.evaluate(id => recState(recOf(id), today(), txIds()), rid);
  expect(await etatRec()).toBe("paid");
  await page.evaluate(() => openTx(allTx().find(t => t.rec === "rc-t")));
  await page.locator("#f-more summary").click();
  await page.check("#f-split");
  await page.fill("#p-amt-0", "2500");
  await page.click('[data-act="part-add"]');
  await page.fill("#p-amt-1", "500");
  await page.click('#sheet button[type="submit"]');
  await expect(page.locator("#wrap")).toBeHidden();
  expect(await etatRec()).toBe("paid");
  expect(await page.evaluate(() => allTx().filter(t => t.date === today() && t.note === "Loyer").reduce((s, t) => s + t.amt, 0))).toBe(300000);
  sansErreur(page);
});

test("plus grosses dépenses : une opération répartie compte une fois, pour sa somme", async ({ page }) => {
  await ouvrir(page);
  const r = await page.evaluate(() => {
    const a = S.meta.accounts[0].id, c = cats("dep").filter(x => !x.parent), g = "g-" + uid(), d = today();
    // trois lignes de 4 000 : aucune n'est la plus grosse seule, mais leur somme (12 000) l'est
    for (let i = 0; i < 3; i++) putTx({id: uid(), t: "dep", amt: 400000, acc: a, cat: c[i].id, date: d, note: "Courses du mois", grp: g});
    putTx({id: uid(), t: "dep", amt: 900000, acc: a, cat: c[0].id, date: d, note: "Seule"});
    const F = statF(), deps = allTx().filter(t => t.t === "dep" && t.date === d && F.has(acc(t.acc)));
    const big = bigDeps(deps, acc(a).cur, 5);
    return {first: big[0].v, n: big[0].g.length, second: big[1].v, count: big.filter(x => x.t.grp === g).length};
  });
  expect(r.first).toBe(1200000); expect(r.n).toBe(3); expect(r.second).toBe(900000); expect(r.count).toBe(1);
  await page.evaluate(() => { location.hash = "stats"; statView = "more"; anaSel = "where"; setPreset("month"); render(); });
  const rows = page.locator("#view .ana-body .card").first().locator(".row");
  await expect(rows.first()).toContainText("Courses du mois");
  await expect(rows.first()).toContainText("3 lignes");
  await expect(page.locator("#view .ana-body .card").first().locator(".row", { hasText: "Courses du mois" })).toHaveCount(1);
  sansErreur(page);
});
