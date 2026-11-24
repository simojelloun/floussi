"use strict";
/* ================= Floussi Pro (abonnement, applis App Store et Google Play) =================
   - Version web : tout est gratuit, isPro() vaut toujours vrai.
   - Version installée : l'abonnement est vérifié sur le téléphone par le module
     @capgo/native-purchases (StoreKit 2 / Google Play Billing), sans serveur.
     L'état est gardé dans les préférences (P.pro) pour fonctionner hors connexion.
   - Ce qui est Pro : outils avancés (photo du ticket, répartition, étiquettes, prévisions,
     analyse détaillée, bilan PDF, import CSV) et personnalisation (style, couleurs, images de catégories).
     Les données déjà saisies restent toujours visibles et modifiables. */
const PRO_IOS = "floussi_pro_annuel", PRO_AND = "floussi_pro", PRO_PLAN = "annuel", PRO_LIFE = "floussi_pro_a_vie";
const PRO_TERMS = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/", PRO_PRIVACY = "https://simojelloun.github.io/floussi/confidentialite.html";
const PLATFORM = NATIVE && typeof window.Capacitor.getPlatform === "function" ? window.Capacitor.getPlatform() : "web";
const PRO_GRACE = 3 * 864e5;
/* limites de la version gratuite (appli installée) */
const FREE = {acc: 3, cur: 2, bud: 1};
const NPUR = () => NP("NativePurchases");
let proProd = null, proLife = null, proBack = null, proBusy = false;

function isPro() {
  if (!NATIVE) return true;
  const p = P.pro; if (!p || !p.on) return false;
  return !p.until || Date.parse(p.until) + PRO_GRACE > Date.now();
}
/* l'abonnement est-il actif d'après le magasin ? */
const subActive = t => {
  if (!t || (t.productIdentifier !== PRO_IOS && t.productIdentifier !== PRO_AND)) return false;
  if (t.subscriptionState === "revoked" || t.subscriptionState === "expired") return false;
  if (t.isActive === true || t.purchaseState === "1") return true;
  return !!t.expirationDate && Date.parse(t.expirationDate) > Date.now();
};
/* achat unique « à vie » : sur iPhone, sa présence parmi les droits en cours suffit */
const lifeOwned = t => !!t && t.productIdentifier === PRO_LIFE && !t.revocationDate && (PLATFORM !== "android" || t.purchaseState === "1");
async function proRefresh() {
  const np = NPUR(); if (!np) return;
  const was = isPro();
  try {
    const r = await np.getPurchases({onlyCurrentEntitlements: true}), list = (r && r.purchases) || [];
    const t = list.filter(subActive).sort((a, b) => String(b.expirationDate || "").localeCompare(String(a.expirationDate || "")))[0];
    P.pro = list.some(lifeOwned) ? {on: 1, life: 1, until: "", chk: today()} : t ? {on: 1, until: t.expirationDate || "", renew: t.willCancel === true ? 0 : 1, chk: today()} : {on: 0, chk: today()};
    savePrefs();
  } catch (e) { return; } /* hors connexion : on garde l'état connu */
  if (was !== isPro()) { applyPrefs(); if (S) render(); }
}
async function proLoadProduct() {
  const np = NPUR(); if (!np || (proProd && proLife)) return;
  /* l'un après l'autre : le module n'accepte pas deux demandes en même temps */
  try { const r = await np.getProducts({productIdentifiers: [PLATFORM === "android" ? PRO_AND : PRO_IOS], productType: "subs"}); proProd = (r && r.products && r.products[0]) || null; } catch (e) { proProd = null; }
  try { const r = await np.getProducts({productIdentifiers: [PRO_LIFE], productType: "inapp"}); proLife = (r && r.products && r.products[0]) || null; } catch (e) { proLife = null; }
  const el = $("#pro-price"); if (el) el.innerHTML = proOffersHtml();
}
/* nombre de jours de l'essai gratuit proposé par le magasin (0 s'il n'y en a pas) */
function proTrialDays() {
  const d = proProd && proProd.introductoryPrice; if (!d || d.price) return 0;
  const sp = d.subscriptionPeriod || {}, u = sp.unitString || ["day", "week", "month", "year"][sp.unit] || "day";
  return (sp.numberOfUnits || 0) * (d.numberOfPeriods || 1) * ({day: 1, week: 7, month: 30, year: 365}[u] || 1);
}
function proOffersHtml() {
  const tr = proTrialDays(), yr = proProd && proProd.priceString ? `${esc(proProd.priceString)} ${L("par an")}` : "", dis = proBusy ? "disabled" : "";
  return `<button type="button" class="btn pro-offer" id="pro-buy" data-act="pro-buy" data-plan="an" ${dis}><b>${tr ? L("Essayer gratuitement pendant ") + plur(tr, L("jour"), L("jours")) : L("S'abonner à Floussi Pro")}</b><small>${yr ? (tr ? L("puis ") : "") + yr : L("Prix affiché par l'App Store ou Google Play.")}</small></button>
    ${proLife ? `<button type="button" class="btn ghost pro-offer" id="pro-buy-life" data-act="pro-buy" data-plan="vie" ${dis}><b>${L("Acheter à vie")}${proLife.priceString ? " · " + esc(proLife.priceString) : ""}</b><small>${L("Un seul paiement, sans abonnement.")}</small></button>` : ""}`;
}
/* bouton « Pro » à la place d'une fonction réservée ; realHtml = ce qui s'affiche une fois Pro activé */
function proLock(realHtml, label, why) {
  if (isPro()) return realHtml;
  return `<button type="button" class="pro-lock" data-act="pro" data-why="${esc(why || "")}" data-unlock="${esc(realHtml)}"><span class="pl-t">${label}</span><span class="pro-badge">Pro</span></button>`;
}
/* encart d'une vue réservée (prévisions, analyse, bilan) */
const proTeaser = (title, text, why) => `<div class="card pro-teaser"><div class="pt-h"><b>${title}</b><span class="pro-badge">Pro</span></div><p>${text}</p><button type="button" class="btn" data-act="pro" data-why="${esc(why || "")}">${L("Découvrir Floussi Pro")}</button></div>`;
/* bouton d'ajout limité : au-delà de `max` éléments, il devient un bouton Pro */
function proLimit(realHtml, label, why, n, max, one, many) {
  if (isPro() || n < max) return realHtml;
  return `<button type="button" class="pro-lock" data-act="pro" data-why="${esc(why)}" data-unlock="${esc(realHtml)}"><span class="pl-t">${label}<small>${L("Version gratuite : ")}${plur(max, one, many)}</small></span><span class="pro-badge">Pro</span></button>`;
}
/* ajout bloqué par une limite (comptes, devises, budgets) : ouvre la présentation de Pro */
const overLimit = (kind, n) => !isPro() && n >= FREE[kind] && (openPro(kind), true);
/* données de départ : la version gratuite commence avec 2 comptes et 2 devises */
function startMeta() {
  const m = freshMeta(); if (isPro()) return m;
  m.accounts = m.accounts.slice(0, FREE.acc); m.currencies = m.currencies.filter(c => c.code === m.base || m.accounts.some(a => a.cur === c.code)).concat(m.currencies.filter(c => c.code !== m.base && !m.accounts.some(a => a.cur === c.code))).slice(0, FREE.cur);
  return m;
}
/* true si la fonction est bloquée (et ouvre alors la présentation de Pro) */
function needPro(why) { if (isPro()) return false; openPro(why); return true; }

const PRO_LIST = () => [
  ["∞", L("Comptes, devises et budgets illimités"), L("Version gratuite : 3 comptes, 2 devises, 1 budget.")],
  ["📊", L("Statistiques avancées"), L("Évolution du solde, mois par mois, analyse et taux d'épargne.")],
  ["👪", L("Daret"), L("Tours, cotisations et cagnotte, membre par membre.")],
  ["📷", L("Photo du ticket"), L("Gardez la preuve de chaque achat.")],
  ["⑂", L("Répartir une dépense"), L("Une addition entre catégories, comptes et amis.")],
  ["#", L("Étiquettes"), L("Retrouvez tout un voyage ou des travaux.")],
  ["📈", L("Prévisions de solde"), L("Voyez venir la fin du mois.")],
  ["📄", L("Bilan du mois en PDF"), L("À imprimer ou à partager.")],
  ["⇪", L("Import CSV"), L("Reprenez l'historique de votre banque.")],
  ["🎨", L("Personnalisation"), L("Style verre liquide, couleurs, images de catégories.")]
];
function proHtml(why) {
  const p = P.pro, on = isPro();
  const lim = {acc: L("La version gratuite est limitée à 3 comptes."), cur: L("La version gratuite est limitée à 2 devises."), bud: L("La version gratuite est limitée à 1 budget.")}[why];
  const status = on ? `<p class="pro-on">✓ ${L("Floussi Pro est actif")}${p && p.life ? L(" à vie") : ""}${p && p.until ? `${p.renew === 0 ? L(" jusqu'au ") : L(", renouvellement le ")}${esc(longDate(p.until.slice(0, 10)))}` : ""}.</p>` : "";
  const store = PLATFORM === "android" ? "Google Play" : "Apple";
  return head("Floussi Pro") + `<div class="pro-sheet">
    ${lim && !on ? `<p class="pro-why">${lim}</p>` : ""}<p class="pro-lead">${L("Floussi reste gratuit. Pro ajoute les outils avancés et la personnalisation.")}</p>${status}
    <ul class="plain pro-list">${PRO_LIST().map(([i, t, d]) => `<li><span class="pi" aria-hidden="true">${i}</span><span><b>${t}</b><small>${d}</small></span></li>`).join("")}</ul>
    <p class="pro-free">${L("Toujours gratuits : opérations illimitées, catégories, statistiques par catégorie, récurrentes, prêts et dettes, zakat, code et Face ID, sauvegardes.")}</p>
    ${on ? (p && p.life ? "" : `<button type="button" class="btn ghost" data-act="pro-manage">${L("Gérer mon abonnement")}</button>`)
      : `<div class="pro-offers" id="pro-price" aria-live="polite">${proOffersHtml()}</div>
    <button type="button" class="link pro-rest" data-act="pro-restore">${L("Restaurer mes achats")}</button>`}
    <p class="pro-legal">${L("Abonnement annuel renouvelé automatiquement, payé avec votre compte")} ${store}. ${L("Résiliable à tout moment dans les réglages de votre compte, au plus tard 24 heures avant la date de renouvellement.")} ${L("S'il y a un essai gratuit, il devient un abonnement payant à la fin de l'essai, sauf résiliation avant. L'achat à vie est un paiement unique.")}
      <a href="${PRO_TERMS}" target="_blank" rel="noopener">${L("Conditions d'utilisation")}</a> · <a href="${PRO_PRIVACY}" target="_blank" rel="noopener">${L("Confidentialité")}</a></p>
  </div>`;
}
function openPro(why) {
  if (!NATIVE) return;
  const trigger = document.activeElement, sheetOpen = !$("#wrap").hidden;
  if (sheetOpen && !proBack) {
    /* on met de côté la feuille en cours (saisie, catégorie) avec ce qui y est tapé, pour y revenir ensuite */
    const frag = document.createDocumentFragment(); [...$("#sheet").childNodes].forEach(n => frag.appendChild(n));
    proBack = {frag, sub: onSubmit, draft, catDraft, focus: trigger && trigger.dataset && trigger.dataset.why ? `[data-why="${trigger.dataset.why}"]` : null};
  }
  openSheet(proHtml(why), null, isPro() ? "#sheet-title" : "#pro-buy");
  proLoadProduct();
}
/* appelée par closeSheet : retour à la feuille mise de côté (true si elle a été rétablie) */
function proRestoreSheet() {
  if (!proBack) return false;
  const b = proBack; proBack = null;
  $("#sheet").replaceChildren(b.frag); onSubmit = b.sub; draft = b.draft; catDraft = b.catDraft;
  if (isPro()) $("#sheet").querySelectorAll("[data-unlock]").forEach(el => { el.outerHTML = el.dataset.unlock; });
  const f = (b.focus && $("#sheet").querySelector(b.focus)) || $("#sheet-title"); if (f) f.focus();
  return true;
}
async function proBuy(plan) {
  const np = NPUR(); if (!np) return toast(L("L'achat n'est possible que dans l'appli installée."));
  if (proBusy) return; proBusy = true; const box = () => { const el = $("#pro-price"); if (el) el.innerHTML = proOffersHtml(); }; box();
  try {
    await np.purchaseProduct(plan === "vie" ? {productIdentifier: PRO_LIFE, productType: "inapp"} : PLATFORM === "android" ? {productIdentifier: PRO_AND, planIdentifier: PRO_PLAN, productType: "subs"} : {productIdentifier: PRO_IOS, productType: "subs"});
    await proRefresh();
    if (isPro()) { proBusy = false; applyPrefs(); closeSheet(); render(); toast(L("Merci ! Floussi Pro est activé.")); }
  } catch (e) {
    const m = String((e && (e.code || e.message)) || e);
    if (!/cancel/i.test(m)) toast(L("L'achat n'a pas abouti. Réessayez plus tard."));
  } finally { proBusy = false; box(); }
}
async function proRestore() {
  const np = NPUR(); if (!np) return;
  try { await np.restorePurchases(); } catch (e) {}
  await proRefresh();
  if (isPro()) { applyPrefs(); closeSheet(); render(); toast(L("Floussi Pro retrouvé")); }
  else toast(L("Aucun achat Floussi Pro trouvé pour ce compte."));
}
async function proManage() { const np = NPUR(); if (np) { try { await np.manageSubscriptions(); } catch (e) {} } }

if (NATIVE) { setTimeout(proRefresh, 400); document.addEventListener("visibilitychange", () => { if (!document.hidden && P.pro && P.pro.chk !== today()) proRefresh(); }); }
applyPrefs();
