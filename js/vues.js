"use strict";
/* ================= vues ================= */
/* étiquettes */
const tagsOf = t => Array.isArray(t && t.tags) ? t.tags : [];
function allTags() { const m = {}; allTx().forEach(t => tagsOf(t).forEach(g => m[g] = (m[g] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(x => x[0]); }
function parseTags(str) {
  const known = allTags(), out = [];
  String(str || "").split(/[,،;#]/).map(x => x.trim().slice(0, 30)).filter(Boolean).forEach(x => { const k = known.find(y => norm(y) === norm(x)) || x; if (!out.some(y => norm(y) === norm(k))) out.push(k); });
  return out.slice(0, 8);
}
/* photos des tickets : gardées à part dans IndexedDB (clé ph-<opération ou groupe>) */
const PHOTOS = {};
const phKeyOf = t => t.grp || t.id;
async function loadPhotos() { for (const k of new Set(allTx().filter(t => t.ph).map(phKeyOf))) if (!PHOTOS[k]) { let v = await IDB.get("ph-" + k); if (!v && NATIVE) { v = await NFS.read("floussi/photos/" + k + ".txt"); if (v) IDB.set("ph-" + k, v); } if (v) PHOTOS[k] = v; } }
async function toPhoto(file) {
  const url = URL.createObjectURL(file), img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const mx = 1400, r = Math.min(1, mx / Math.max(img.width, img.height)), cv = document.createElement("canvas");
  cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
  return cv.toDataURL("image/jpeg", .72);
}
function phSave(d, key) {
  const old = d.phKey;
  if (d.photo) { PHOTOS[key] = d.photo; if (!demo && (d.photo !== d.photoOld || old !== key)) { IDB.set("ph-" + key, d.photo); NFS.write("floussi/photos/" + key + ".txt", d.photo); } }
  if (old && (old !== key || !d.photo)) { delete PHOTOS[old]; if (!demo) { IDB.del("ph-" + old); NFS.del("floussi/photos/" + old + ".txt"); } }
}
function phBox(d) {
  return d.photo ? `<div class="ph-row"><button type="button" class="ph-thumb" data-act="ph-view" aria-label="${esc(L("Voir la photo du ticket"))}"><img src="${d.photo}" alt=""></button>
      <div class="ph-acts"><label class="filebtn"><input type="file" id="f-photo" accept="image/*" aria-label="${esc(L("Remplacer la photo"))}"><span class="btn ghost sm">${L("Remplacer")}</span></label><button type="button" class="btn ghost sm" data-act="ph-del">${L("Retirer la photo")}</button></div></div>`
    : `<label class="filebtn"><input type="file" id="f-photo" accept="image/*"><span class="btn ghost sm"><span aria-hidden="true">📷</span> ${L("Ajouter une photo du ticket")}</span></label>`;
}
function openPhoto(src) {
  const v = $("#phv"); if (!v || !src) return; v.hidden = false; $("#app").inert = true; $("#wrap").inert = true;
  v.innerHTML = `<div class="phv" role="dialog" aria-modal="true" aria-label="${esc(L("Photo du ticket"))}"><img src="${src}" alt="${esc(L("Photo du ticket"))}"><button type="button" class="btn" data-act="phv-close">${L("Fermer")}</button></div>`;
  v.querySelector("button").focus();
}
function closePhoto() { const v = $("#phv"); if (!v || v.hidden) return; v.hidden = true; v.innerHTML = ""; $("#wrap").inert = false; $("#app").inert = !$("#wrap").hidden; const b = $("#sheet").querySelector(".ph-thumb"); if (b) b.focus(); }
/* modèles d'opérations */
const TPL = () => S.meta.templates || (S.meta.templates = []);
const tplLabel = tp => tp.name || tp.note || (tp.t === "vir" ? L("Virement") : catName(tp.cat));
function tplAmt(tp) { const a = acc(tp.acc); return tp.amt ? (tp.t === "rev" ? "+" : tp.t === "dep" ? "−" : "") + fmt(tp.amt, a ? a.cur : base()) : ""; }
function tplApply(tp) {
  const d = draft; d.t = tp.t; if (acc(tp.acc)) d.acc = tp.acc; d.cat = tp.cat || d.cat; d.note = tp.note || ""; d.amtS = tp.amt ? plain(tp.amt) : "";
  d.tagsS = (tp.tags || []).join(", "); d.catTouched = true; if (tp.t === "vir" && acc(tp.to)) d.to = tp.to; d.autoTo = undefined; d.split = false;
}
function tplChips(act) {
  return TPL().map(tp => { const c = cat(tp.cat), am = tplAmt(tp);
    return `<button type="button" class="pill-btn tpl" data-act="${act}" data-id="${esc(tp.id)}" aria-label="${esc(L("Modèle") + " : " + tplLabel(tp) + (am ? ", " + am.replace("−", L("moins") + " ") : ""))}">${tp.t === "vir" ? chipHtml(null, "⇄") : c ? chipHtml(c) : ""}<span>${esc(tplLabel(tp))}</span>${am ? `<small class="num">${esc(am)}</small>` : ""}</button>`; }).join("");
}
function quickBlock() {
  if (!TPL().length) return "";
  return `<div class="sec-h"><h2>${L("Saisie rapide")}</h2><a class="link" href="#modeles">${L("Gérer")}</a></div><div class="filters scroll quick" role="group" aria-label="${esc(L("Saisie rapide"))}">${tplChips("tpl-new")}</div>`;
}
function saveTemplate() {
  readTx(); const d = draft;
  if (d.split) return err(L("Une opération répartie ne peut pas devenir un modèle."), "f-split");
  const amt = parseAmt(d.amtS) || 0, tp = {id: "tp-" + uid(), name: "", t: d.t, amt: Math.abs(amt), acc: d.acc, cat: d.t === "vir" ? "" : d.cat, note: (d.note || "").trim(), tags: parseTags(d.tagsS)};
  if (d.t === "vir") tp.to = d.to;
  const same = TPL().findIndex(x => x.t === tp.t && norm(tplLabel(x)) === norm(tplLabel(tp)));
  if (same >= 0) { tp.id = TPL()[same].id; tp.name = TPL()[same].name; TPL()[same] = tp; }
  else { if (TPL().length >= 20) return err(L("Vous avez déjà 20 modèles. Supprimez-en un dans Réglages › Modèles d'opérations."), "f-tpl"); TPL().push(tp); }
  touch("meta"); const b = $("#f-tpl"); if (b) b.textContent = "★ " + L("Modèle enregistré");
  toast(L("Modèle « ") + tplLabel(tp) + L(" » enregistré : il apparaît sur l'Accueil et en haut du formulaire."));
}
/* suggestions de libellés déjà utilisés */
function noteSugs(q, kind) {
  q = norm(q); if (q.length < 2) return [];
  const seen = new Map();
  for (const t of allTx().sort((a, b) => b.date.localeCompare(a.date))) {
    if (!t.note || t.t !== kind) continue; const n = norm(t.note);
    if (!n.includes(q) || seen.has(n)) continue; seen.set(n, t); if (seen.size >= 4) break;
  }
  return [...seen.values()];
}
function markTiles() {
  const b = $("#f-cat-btn"); if (!b || !draft) return;
  const sel = $("#f-cat"); if (sel && sel.value !== draft.cat) sel.value = draft.cat;
  b.outerHTML = catBtn(draft);
}
function syncPk(sel) { const b = sel && sel._pk, o = sel && sel.selectedOptions[0]; if (b && o) { b.firstChild.textContent = o.textContent; b.setAttribute("aria-label", (sel._lab ? sel._lab + " : " : "") + o.textContent); } }
function updateSugs() {
  const box = $("#f-sug"), d = draft; if (!box || !d) return;
  const v = $("#f-note").value, list = noteSugs(v, d.t), exact = list.find(t => norm(t.note) === norm(v));
  box.innerHTML = list.filter(t => t !== exact || list.length > 1).map(t => { const a = acc(t.acc), am = fmt(Math.abs(t.amt), a ? a.cur : base());
    return `<button type="button" class="pill-btn" data-act="sug" data-id="${esc(t.id)}" aria-label="${esc(L("Reprendre") + " " + t.note + ", " + catLabel(t.cat) + ", " + am)}">${chipHtml(cat(t.cat))}<span>${esc(t.note)}</span><small class="num">${esc(am)}</small></button>`; }).join("");
  box.hidden = !box.innerHTML;
  if (exact && !d.catTouched && exact.cat) { const sel = $("#f-cat"); if (sel && sel.value !== exact.cat && [...sel.options].some(o => o.value === exact.cat)) { sel.value = exact.cat; d.cat = exact.cat; syncPk(sel); markTiles(); announce(L("Catégorie proposée : ") + catLabel(exact.cat)); } }
}
/* rappels : échéances des 7 prochains jours */
function upcoming(days) {
  const t0 = today(), lim = addDays(t0, days), out = [];
  for (const r of S.meta.recurring) {
    if (r.paused || !acc(r.acc)) continue;
    for (let k = r.k, n = 0; n < 60; k++, n++) { const d = occ(r, k); if (d > lim || (r.end && d > r.end)) break; if (d > t0 && recState(r, d) === "due") out.push({date: d, kind: "rec", id: r.id, title: recTitle(r), amt: recSign(r), cls: r.t, chip: r.t === "vir" ? chipHtml(null, "⇄") : chipHtml(cat(r.cat))}); }
  }
  for (const l of S.meta.loans) {
    if (!l.due || l.due > lim) continue; const st = loanState(l); if (st.done || st.rest <= 0) continue;
    out.push({date: l.due, kind: "loan", id: l.id, late: l.due < t0, title: (l.kind === "lent" ? L("Remboursement attendu de ") : L("Remboursement à ")) + l.person, amt: fmt(st.rest, l.cur), cls: l.kind === "lent" ? "rev" : "dep", chip: chipHtml(null, "🤝")});
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function whenLabel(d) { const n = Math.round((new Date(d + "T12:00:00") - new Date(today() + "T12:00:00")) / 864e5); return n < 0 ? L("En retard") : n === 0 ? L("Aujourd'hui") : n === 1 ? L("Demain") : L("Dans ") + n + L(" jours"); }
function upcomingBlock() {
  const u = upcoming(7); if (!u.length) return "";
  return `<div class="sec-h"><h2>${L("À venir")}</h2><small class="hint" style="margin:0">${L("7 prochains jours")}</small></div>
    <ul class="card rows">${u.slice(0, 6).map(x => `<li class="${x.kind === "rec" ? "with-pay" : ""}"><button type="button" class="row" data-act="${x.kind === "rec" ? "edit-rec" : "loan"}" data-id="${esc(x.id)}" aria-label="${esc(x.title + ", " + x.amt.replace("−", L("moins") + " ") + ", " + whenLabel(x.date) + ", " + longDate(x.date))}">${x.chip}<span class="t"><b>${esc(x.title)}</b><small><span class="when${x.late || x.date <= addDays(today(), 2) ? " soon" : ""}">${whenLabel(x.date)}</span> · ${dm(x.date)}</small></span><span class="amt ${x.cls}">${esc(x.amt)}</span></button>${x.kind === "rec" ? `<button type="button" class="btn sm ghost paybtn" data-act="rec-pay" data-id="${esc(x.id)}" data-d="${x.date}" aria-label="${esc((x.cls === "rev" ? L("Marquer reçue : ") : L("Marquer payée : ")) + x.title + L(" du ") + longDate(x.date))}">✓ ${(x.cls === "rev" ? L("Reçue") : L("Payée"))}</button>` : ""}</li>`).join("")}</ul>`;
}
const addDays = (d, n) => { const [y, m, x] = d.split("-").map(Number); return ymd(new Date(y, m - 1, x + n)); };
/* alerte de budget au moment d'enregistrer */
const budSnap = ym => S.meta.budgets.map(b => budgetState(b, ym).r);
function budAlert(prev, ym) {
  const msgs = [];
  S.meta.budgets.forEach((b, i) => { const r = budgetState(b, ym).r, p0 = prev[i] || 0, pc = Math.round(r * 100);
    if (p0 <= 1 && r > 1) msgs.push(L("Budget ") + catLabel(b.cat) + L(" dépassé") + " (" + pc + " %)");
    else if (p0 < .8 && r >= .8) msgs.push(L("Budget ") + catLabel(b.cat) + L(" atteint à ") + pc + " %"); });
  return msgs.length ? " ⚠ " + msgs.join(" · ") : "";
}
/* bilan mensuel */
let bilM = today().slice(0, 7);
function balAt(a, date) {
  let b = balance(a);
  for (const t of allTx()) { if (t.date <= date) continue; if (t.acc === a.id) b -= isIn(t) ? t.amt : -t.amt; if (t.t === "vir" && t.to === a.id) b -= (t.amtTo ?? t.amt); }
  return b;
}
function tagTotals(from, to, F) {
  const m = {};
  for (const t of allTx()) { if (t.date < from || t.date > to || !tagsOf(t).length) continue; const a = acc(t.acc); if (!F.has(a) || (t.t !== "dep" && t.t !== "rev")) continue;
    const v = conv(t.t === "dep" ? t.amt : -t.amt, a.cur, F.out); tagsOf(t).forEach(g => { (m[g] = m[g] || {dep: 0, n: 0}); m[g].dep += v; m[g].n++; }); }
  return Object.entries(m).sort((x, y) => y[1].dep - x[1].dep);
}
function vBilan() {
  const F = statF(), dc = F.out, ym = bilM, from = ym + "-01", to = lastDay(ym), f = flowsBetween(from, to, F), pf = flowsBetween(shiftMonth(ym, -1) + "-01", lastDay(shiftMonth(ym, -1)), F);
  const net = f.rev - f.dep, rate = f.rev > 0 ? Math.round(net / f.rev * 100) : null;
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : null, dDep = pct(f.dep, pf.dep), dRev = pct(f.rev, pf.rev);
  const sp = Object.entries(f.byTop.dep).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]), top = sp.length ? sp[0][1] : 1, tot = Math.max(1, f.dep);
  const buds = S.meta.budgets.map(b => ({b, s: budgetState(b, ym)}));
  const tags = tagTotals(from, to, F);
  const big = allTx().filter(t => t.t === "dep" && t.date >= from && t.date <= to && F.has(acc(t.acc)) && t.amt > 0).sort((a, b) => conv(b.amt, acc(b.acc).cur, dc) - conv(a.amt, acc(a.acc).cur, dc)).slice(0, 5);
  const accs = accSorted().filter(a => F.has(a));
  const evo = (v, good) => v == null ? "" : `<small class="evo ${(v > 0) === good ? "pos" : v === 0 ? "" : "neg"}">${v > 0 ? "+" : ""}${v} % ${L("vs mois précédent")}</small>`;
  const isCur = ym === today().slice(0, 7);
  return backLink("stats") + `<div class="bar-line nowrap noprint"><button type="button" class="navb" data-act="bil-month" data-n="-1" aria-label="${esc(L("Mois précédent"))}">‹</button>
      <div class="period static"><b>${esc(cap1(monthName(ym)))}</b><small>${esc(statAccLabel(F))} · ${esc(sym(dc))}</small></div>
      <button type="button" class="navb" data-act="bil-month" data-n="1" aria-label="${esc(L("Mois suivant"))}" ${isCur ? "disabled" : ""}>›</button></div>
    <div class="bilan">
    <div class="print-only bil-head"><b>Floussi</b> · ${esc(L("Bilan de"))} ${esc(monthName(ym))} · ${esc(statAccLabel(F))}</div>
    <h2 class="sr">${L("Résumé du mois, en ")}${esc(plural(dc))}</h2>
    <div class="tiles"><div class="tile"><small>${L("Revenus")}</small><b>${NF.format(f.rev / 100)}<span>${esc(sym(dc))}</span></b>${evo(dRev, true)}</div><div class="tile"><small>${L("Dépenses")}</small><b>${NF.format(f.dep / 100)}<span>${esc(sym(dc))}</span></b>${evo(dDep, false)}</div>
      <div class="tile"><small>${L("Épargne du mois")}</small><b>${net < 0 ? "−" : "+"}${NF.format(Math.abs(net) / 100)}<span>${esc(sym(dc))}</span></b>${rate != null ? `<small class="evo">${rate} % ${L("des revenus")}</small>` : ""}</div></div>
    ${isCur ? `<p class="hint">${L("Mois en cours : le bilan sera complet à la fin du mois.")}</p>` : ""}
    <h2 class="sec-h">${L("Dépenses par catégorie")}</h2>
    <div class="card">${sp.length ? `<ul class="rows">${sp.slice(0, 8).map(([c, v]) => `<li><div class="rank" style="--cc:${esc(cat(c)?.color || "var(--s2)")}">${chipHtml(cat(c))}<span>${esc(catName(c))} <small class="num">${Math.round(v / tot * 100)} %</small></span><span class="amt">${fmt(v, dc)}</span><span class="track"><i style="width:${Math.max(2, v / top * 100)}%"></i></span></div></li>`).join("")}</ul>` : `<p class="empty">${L("Aucune dépense ce mois-ci.")}</p>`}</div>
    ${buds.length ? `<h2 class="sec-h">${L("Budgets")}</h2><div class="card"><ul class="rows">${buds.map(({b, s: st}) => `<li class="alert"><span>${esc(catLabel(b.cat))} <small class="num" style="color:var(--muted)">${fmt(st.spent, b.cur)}${L(" sur ")}${fmt(b.limit, b.cur)}</small></span><span class="state ${st.cls}">${Math.round(st.r * 100)} %</span></li>`).join("")}</ul></div>` : ""}
    ${tags.length ? `<h2 class="sec-h">${L("Étiquettes")}</h2><div class="card"><dl class="kv">${tags.map(([g, x]) => `<div><dt>#${esc(g)} <small class="num">(${plur(x.n, L("opération"), L("opérations"))})</small></dt><dd>${fmt(x.dep, dc)}</dd></div>`).join("")}</dl></div>` : ""}
    ${big.length ? `<h2 class="sec-h">${L("Les 5 plus grosses dépenses")}</h2><div class="card"><ul class="rows">${big.map(t => txRow(t, true)).join("")}</ul></div>` : ""}
    <h2 class="sec-h">${L("Soldes des comptes au ")}${dm(isCur ? today() : to)}</h2>
    <div class="card"><dl class="kv">${accs.map(a => `<div><dt>${esc(a.name)}</dt><dd>${fmt(balAt(a, isCur ? today() : to), a.cur)}</dd></div>`).join("")}</dl></div>
    <p class="hint">${L("Bilan établi le ")}${longDate(today())}${F.ids.some(id => acc(id).cur !== dc) ? ". " + L("Montants convertis en") + " " + esc(plural(dc)) + " " + L("au cours saisi dans les Réglages.") : "."}</p>
    </div>
    <div class="actions noprint"><button type="button" class="btn" data-act="print"><span aria-hidden="true">🖨</span> ${L("Imprimer ou enregistrer en PDF")}</button></div>
    <p class="hint noprint">${L("Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ». Sur iPhone : touchez Imprimer, puis le bouton Partager pour l'enregistrer dans Fichiers ou l'envoyer.")}</p>`;
}
/* gestion des modèles */
function vModeles() {
  const T = TPL();
  return backLink("reglages") + `<p class="hint">${L("Un modèle reprend une opération fréquente (café, taxi, courses…) : touchez-le sur l'Accueil pour la saisir en un geste. Pour en créer un, remplissez une opération puis touchez « Enregistrer comme modèle ».")}</p>
    ${T.length ? `<ul class="card rows">${T.map(tp => { const c = cat(tp.cat), am = tplAmt(tp); return `<li><div class="cat-line"><button type="button" class="row" data-act="tpl-edit" data-id="${esc(tp.id)}" aria-label="${esc(tplLabel(tp) + (am ? ", " + am : "") + ". " + L("Renommer"))}">${tp.t === "vir" ? chipHtml(null, "⇄") : chipHtml(c)}<span class="t"><b>${esc(tplLabel(tp))}</b><small>${esc((tp.t === "vir" ? L("Virement") : catLabel(tp.cat)) + (acc(tp.acc) ? " · " + acc(tp.acc).name : ""))}</small></span><span class="amt ${tp.t}">${esc(am)}</span></button>
      <button type="button" class="drag tpl-del" data-act="tpl-del" data-id="${esc(tp.id)}" aria-label="${esc(L("Supprimer le modèle") + " " + tplLabel(tp))}">🗑</button></div></li>`; }).join("")}</ul>` : `<p class="empty card">${L("Aucun modèle pour l'instant.")}</p>`}`;
}

let opTag = "", searchAll = true;
let tab = "accueil", month = today().slice(0, 7), cur = "MAD", filter = "all", query = "", loanFilter = "open", catKind = "dep";
const TITLES = {accueil: "Floussi", operations: L("Opérations"), recurrentes: L("Opérations récurrentes"), prets: L("Prêts et emprunts"), budgets: L("Budgets"),
  stats: L("Statistiques"), verrouillage: L("Verrouillage"), comptes: L("Comptes"), reglages: L("Réglages"), devises: L("Devises et cours"), categories: L("Catégories"), apparence: L("Apparence"), donnees: L("Sauvegarde et import"), bilan: L("Bilan du mois"), modeles: L("Modèles d'opérations")};
const PARENT = {recurrentes: "operations", bilan: "stats"};
const IN_SETTINGS = ["reglages", "devises", "categories", "apparence", "donnees", "verrouillage", "modeles"];
const backLink = to => `<a class="back" href="#${to}"><span aria-hidden="true">‹</span> ${esc(TITLES[to])}</a>`;

function txInfo(t) {
  const a = acc(t.acc), ca = a ? a.cur : base(), an = a ? a.name : L("compte supprimé"), rec = t.rec ? L(", opération récurrente") : "";
  if (t.t === "vir") {
    const b = acc(t.to), bn = b ? b.name : L("compte supprimé"), cross = b && b.cur !== ca && t.amtTo != null;
    return {title: t.note || L("Virement"), sub: an + " → " + bn, amt: fmt(t.amt, ca) + (cross ? " → " + fmt(t.amtTo, b.cur) : ""), cls: "vir", chip: chipHtml(null, "⇄"),
      sr: `${t.note ? t.note + ", " : ""}${L("virement de ")}${say(t.amt, ca)}${cross ? L(", reçu ") + say(t.amtTo, b.cur) : ""}${L(", de ")}${an}${L(" vers ")}${bn}${rec}`};
  }
  if (t.t === "pret") {
    const l = loan(t.loan), p = l ? l.person : "?", lent = l ? l.kind === "lent" : t.dir === "out";
    const title = (t.mv === "base" ? (lent ? L("Prêt à ") : L("Emprunt auprès de ")) : (lent ? L("Remboursement reçu de ") : L("Remboursement à "))) + p;
    return {title, sub: (t.note ? t.note + " · " : "") + an, amt: (t.dir === "in" ? "+" : "−") + fmt(t.amt, ca), cls: t.dir === "in" ? "rev" : "dep", chip: chipHtml(null, "🤝"),
      sr: `${title}, ${t.dir === "in" ? L("entrée de") : L("sortie de")} ${say(t.amt, ca)}, ${an}${t.note ? ", " + t.note : ""}`};
  }
  const c = cat(t.cat), name = catLabel(t.cat);
  const plus = (t.t === "rev") === (t.amt >= 0), ab = Math.abs(t.amt), ttl = (t.pn ? t.pn + " · " : "") + (t.note || name);
  return {title: ttl, sub: name + " · " + an, amt: (plus ? "+" : "−") + fmt(ab, ca), cls: plus ? "rev" : "dep", chip: chipHtml(c),
    sr: `${ttl !== name ? ttl + ", " : ""}${t.amt < 0 ? (t.t === "dep" ? L("remboursement de") : L("dépense de")) : t.t === "rev" ? L("revenu de") : L("dépense de")} ${say(ab, ca)}${L(", catégorie ")}${name}, ${an}${rec}`};
}
function txRow(t, withDate, inGrp) {
  const i = txInfo(t);
  if (inGrp) { i.title = t.pn || catLabel(t.cat); i.sub = (t.pn ? catLabel(t.cat) + " · " : "") + (acc(t.acc) ? acc(t.acc).name : ""); }
  const tg = tagsOf(t); if (tg.length && !inGrp) { i.sub += " · " + tg.map(x => "#" + x).join(" "); i.sr += L(", étiquettes ") + tg.join(", "); }
  if (t.ph && !inGrp) i.sr += L(", avec photo du ticket");
  const swp = t.t !== "pret";
  return `<li${swp ? ' class="sw"' : ""}>${swp ? '<span class="sw-bg" aria-hidden="true">🗑 ' + L("Supprimer") + '</span>' : ""}<button type="button" class="row" data-act="edit-tx" data-id="${esc(t.id)}"${swp ? ' aria-keyshortcuts="Delete"' : ""} aria-label="${esc(i.sr + (t.grp ? L(", opération répartie") : "") + (withDate ? L(", le ") + longDate(t.date) : "") + L(". Modifier"))}">${i.chip}<span class="t"><b>${esc(i.title)}${t.rec ? `<span class="rec-mark" aria-hidden="true">↻</span>` : ""}${t.grp ? `<span class="rec-mark" aria-hidden="true">⑂</span>` : ""}${t.ph && !inGrp ? `<span class="rec-mark" aria-hidden="true">📎</span>` : ""}</b><small>${esc(i.sub)}</small></span><span class="amt ${i.cls}">${esc(i.amt)}</span></button></li>`;
}
function txByDay(list) {
  const days = {}; list.forEach(t => (days[t.date] = days[t.date] || []).push(t));
  const block = arr => { const done = new Set(); return arr.map(t => {
    if (!t.grp) return txRow(t);
    if (done.has(t.grp)) return ""; done.add(t.grp);
    const g = arr.filter(x => x.grp === t.grp); if (g.length < 2) return txRow(t);
    const net = {}; g.forEach(x => { const a = acc(x.acc), c = a ? a.cur : base(); net[c] = (net[c] || 0) + (x.t === "rev" ? x.amt : -x.amt); });
    const ns = Object.entries(net).map(([c, v]) => (v < 0 ? "−" : "+") + fmt(Math.abs(v), c)).join(" · "), ttl = t.note || L("Opération répartie"), pos = Object.values(net).every(v => v >= 0);
    return `<li class="grp"><button type="button" class="row" data-act="edit-tx" data-id="${esc(t.id)}" aria-label="${esc(L("Opération répartie") + ", " + ttl + ", " + g.length + " " + L("lignes") + ", " + L("Total net :") + " " + ns.replace(/−/g, L("moins") + " ") + L(". Modifier"))}"><span class="chip" aria-hidden="true">⑂</span><span class="t"><b>${esc(ttl)}${t.ph ? `<span class="rec-mark" aria-hidden="true">📎</span>` : ""}</b><small>${L("Opération répartie")} · ${g.length} ${L("lignes")}${tagsOf(t).length ? " · " + esc(tagsOf(t).map(x => "#" + x).join(" ")) : ""}</small></span><span class="amt ${pos ? "rev" : "dep"}">${esc(ns)}</span></button><ul class="rows gsub">${g.map(x => txRow(x, false, true)).join("")}</ul></li>`;
  }).join(""); };
  return Object.keys(days).sort().reverse().map(d => `<h3 class="day"><span>${dayName(d)}</span></h3><ul class="rows">${block(days[d])}</ul>`).join("");
}
const monthSwitch = () => `<div class="switch" role="group" aria-label="${L("Mois affiché")}"><button type="button" data-act="month" data-n="-1" aria-label="${L("Mois précédent")}">‹</button><b>${monthName(month)}</b><button type="button" data-act="month" data-n="1" aria-label="${L("Mois suivant")}">›</button></div>`;
function curSeg(list) {
  if (list.length < 2) return "";
  return `<div class="seg" role="group" aria-label="${L("Devise affichée")}">${list.map(c => `<button type="button" data-act="cur" data-c="${esc(c)}" aria-pressed="${cur === c}"><span aria-hidden="true">${esc(sym(c))}</span><span class="sr">${esc(L(curOf(c).name))}</span></button>`).join("")}</div>`;
}
const banner = () => demo ? `<div class="banner" role="note"><span><b>${L("Ce sont des données d'exemple.")}</b>${L(" Explorez librement : rien n'est enregistré tant que vous n'avez pas commencé.")}</span><button type="button" class="btn" data-act="start">${L("Commencer avec mes comptes")}</button></div>` : "";

function pendingBlock(limit) {
  const pl = pendingRecs(); if (!pl.length) return "";
  const shown = limit ? pl.slice(0, limit) : pl;
  return `<div class="sec-h"><h2>${L("À payer")}</h2>${limit && pl.length > limit ? `<a class="link" href="#recurrentes">${L("Tout voir (")}${pl.length})</a>` : ""}</div>
    <ul class="card rows">${shown.map(({r, ds}) => {
      const f = ds[0], c = cat(r.cat), ttl = recTitle(r), more = ds.length > 1 ? `${L(", et ")}${plur(ds.length - 1, L("autre échéance"), L("autres échéances"))}` : "";
      return `<li class="pend"><div class="top-l">${r.t === "vir" ? chipHtml(null, "⇄") : chipHtml(c)}<div class="t"><b>${esc(ttl)}</b><small>${f.date < today() ? `<span class="when soon">${L("En retard")}</span> · ` : ""}${L("Prévu le ")}${dm(f.date)}${esc(more)}</small></div><span class="amt ${r.t}">${esc(recSign(r))}</span></div>
        <div class="pend-act"><button type="button" class="btn sm ghost" data-act="rec-skip" data-id="${esc(r.id)}" data-d="${f.date}" aria-label="${esc(L("Ignorer ") + ttl + L(" du ") + longDate(f.date))}">${L("Ignorer")}</button><button type="button" class="btn sm" data-act="rec-ok" data-id="${esc(r.id)}" data-d="${f.date}" aria-label="${esc((r.t === "rev" ? L("Marquer reçue : ") : L("Marquer payée : ")) + ttl + ", " + recSign(r).replace("−", L("moins") + " ") + L(", du ") + longDate(f.date))}">✓ ${paidW(r)}</button></div></li>`;
    }).join("")}</ul>`;
}

function vAccueil() {
  const nowYm = today().slice(0, 7), list = usedCurs();
  const colH = c => {
    const total = S.meta.accounts.filter(a => a.cur === c).reduce((s, a) => s + balance(a), 0), f = monthFlows(nowYm, curF(c));
    return `<div role="group" aria-label="${esc(L(curOf(c).name))}"><span class="lab" aria-hidden="true">${esc(L(curOf(c).name))}</span><span class="big"><span class="sr">${L("Solde total : ")}</span>${NF.format(total / 100)}<span> ${esc(sym(c))}</span></span>
      <span class="flow"><span>${L("Revenus du mois ")}<b class="num">+${fmt(f.rev, c)}</b></span><span>${L("Dépenses du mois ")}<b class="num">−${fmt(f.dep, c)}</b></span></span></div>`;
  };
  const lentM = loanTotals("lent"), borM = loanTotals("borrowed"), hasLoans = Object.keys(lentM).length + Object.keys(borM).length > 0;
  const oc = P.ovCur && S.meta.currencies.some(c => c.code === P.ovCur) ? P.ovCur : base();
  const totB = S.meta.accounts.reduce((s, a) => s + conv(balance(a), a.cur, oc), 0), net = totB + sumBase(lentM, oc) - sumBase(borM, oc);
  const overview = (list.length > 1 || hasLoans) ? `<h2 class="sec-h">${L("Vue d'ensemble en ")}${esc(plural(oc))}</h2>
    <div class="card">${S.meta.currencies.length > 1 ? `<label class="f" style="margin-bottom:12px"><span>${L("Afficher en")}</span><select id="ov-cur">${curOpts(oc)}</select></label>` : ""}<dl class="kv">
      <div><dt>${L("Total des comptes")}${list.some(c => c !== oc) ? L(", converti") : ""}</dt><dd>${fmt(totB, oc)}</dd></div>
      ${hasLoans ? `<div><dt>${L("On vous doit")}</dt><dd>${listAmounts(lentM)}</dd></div><div><dt>${L("Vous devez")}</dt><dd>${listAmounts(borM)}</dd></div>` : ""}
      <div class="strong"><dt>${L("Patrimoine net")}${hasLoans ? L(", prêts compris") : ""}</dt><dd>${fmt(net, oc)}</dd></div></dl>
      ${list.some(c => c !== oc) ? `<small class="hint">${L("Conversion au cours saisi le ")}${dm(S.meta.ratesDate)}. <a class="link" href="#devises">${L("Modifier les cours")}</a></small>` : ""}</div>` : "";
  const al = S.meta.budgets.map(b => ({b, s: budgetState(b, nowYm)})).filter(x => x.s.r >= .8);
  const recent = allTx().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const fold = (key, title, extra, body, defOpen) => { const o = P.fold && key in P.fold ? P.fold[key] : defOpen; return `<details class="fold" data-fold="${key}" ${o ? "open" : ""}><summary><span class="ft">${title}</span>${extra ? `<span class="fx">${extra}</span>` : ""}<span class="chev" aria-hidden="true">›</span></summary><div class="fold-b">${body}</div></details>`; };
  const overviewBody = overview ? overview.slice(overview.indexOf('<div class="card">')) : "";
  return `<section class="ledger ${list.length === 1 ? "one" : ""}" aria-label="${L("Soldes par devise")}">${list.map(colH).join("")}</section>` + accCards() + quickBlock() + banner() + dailyBlock() + (overviewBody ? fold("overview", L("Vue d'ensemble en ") + esc(plural(oc)), `<span class="num">${fmt(net, oc)}</span>`, overviewBody, false) : "") + pendingBlock(3) + upcomingBlock() +
    `<div class="sec-h"><h2>${L("Dernières opérations")}</h2><a class="link" href="#operations">${L("Toutes les opérations")}</a></div><div class="card">${recent.length ? `<ul class="rows">${recent.slice(0, 5).map(t => txRow(t, true)).join("")}</ul>` : `<p class="empty">${L("Aucune opération. Utilisez le bouton Ajouter une opération pour saisir la première.")}</p>`}</div>` +
    (al.length ? fold("budgets", L("Budgets à surveiller"), `<span class="state ${al.some(x => x.s.cls === "crit") ? "crit" : "warn"}">${al.length}</span>`, `<ul class="card rows">${al.map(x => `<li class="alert"><span>${esc(catLabel(x.b.cat))} <small class="num" style="color:var(--muted)">${fmt(x.s.spent, x.b.cur)}${L(" sur ")}${fmt(x.b.limit, x.b.cur)}</small></span><span class="state ${x.s.cls}">${x.s.label}</span></li>`).join("")}</ul><a class="link" href="#budgets">${L("Voir les budgets")}</a>`, true) : "") +
    fold("accounts", L("Tous les comptes"), plur(S.meta.accounts.length, L("compte"), L("comptes")), `<ul class="card rows">${accSorted().map(a => `<li><button type="button" class="row" data-act="acc-ops" data-id="${esc(a.id)}" aria-label="${esc(a.name + L(", solde ") + say(balance(a), a.cur) + ". " + L("Voir les opérations"))}">${accChip(a)}<span class="t"><b>${esc(a.name)}</b></span><span class="amt">${fmt(balance(a), a.cur)}</span></button></li>`).join("")}</ul><a class="link" href="#comptes">${L("Gérer les comptes")}</a>`, false) +
    fcBlock();
}

let dayFilter = "";
const opsList = () => {
  if (!opRange) opRange = presetRange("month");
  const q = norm(query.trim()), qa = q.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."), wide = (q || opTag) && searchAll;
  const amtTxt = t => (Math.abs(t.amt) / 100).toFixed(2);
  return allTx().filter(t => (wide || (t.date >= opRange.from && t.date <= opRange.to)) && (!opAcc || t.acc === opAcc || t.to === opAcc) && (filter === "all" || t.t === filter) && (!opTag || tagsOf(t).includes(opTag))
    && (!q || norm([t.note, t.pn, catLabel(t.cat), acc(t.acc)?.name, loan(t.loan)?.person, tagsOf(t).map(x => "#" + x).join(" ")].join(" ")).includes(q) || (/\d/.test(qa) && amtTxt(t).includes(qa))));
};
function opViewSeg() {
  const v = P.opView === "cal" ? "cal" : "list";
  return `<div class="seg viewseg" role="group" aria-label="${esc(L("Affichage des opérations"))}"><button type="button" data-act="op-view" data-v="list" aria-pressed="${v === "list"}"><span aria-hidden="true">☰</span> ${L("Liste")}</button><button type="button" data-act="op-view" data-v="cal" aria-pressed="${v === "cal"}"><span aria-hidden="true">▦</span> ${L("Calendrier")}</button></div>`;
}
let calM = today().slice(0, 7), calDay = today();
function calData(ym) {
  const from = ym + "-01", to = lastDay(ym), days = {}, day = d => (days[d] = days[d] || {dep: 0, rev: 0, mv: 0, due: [], tx: []});
  for (const t of allTx()) { if (t.date < from || t.date > to || (opAcc && t.acc !== opAcc && t.to !== opAcc)) continue; const x = day(t.date); x.tx.push(t); if (t.t === "dep") x.dep++; else if (t.t === "rev") x.rev++; else x.mv++; }
  const have = txIds();
  for (const r of S.meta.recurring) {
    if (r.paused || !acc(r.acc) || (opAcc && r.acc !== opAcc && r.to !== opAcc)) continue;
    const set = new Set(recOccs(r, from, to)); (r.open || []).forEach(d => { if (d >= from && d <= to) set.add(d); });
    for (const d of set) if (recState(r, d, have) === "due") day(d).due.push(r);
  }
  return days;
}
function vCalendar() {
  const ym = calM, [y, m] = ym.split("-").map(Number), nd = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, t0 = today(), data = calData(ym);
  if (calDay.slice(0, 7) !== ym) calDay = ym === t0.slice(0, 7) ? t0 : ym + "-01";
  const wd = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "short"}).format(new Date(2024, 0, 1 + i)).replace(".", ""));
  let cells = ""; for (let i = 0; i < lead; i++) cells += `<span class="mc-x" aria-hidden="true"></span>`;
  for (let d = 1; d <= nd; d++) {
    const v = ym + "-" + pad(d), x = data[v], parts = [];
    if (x) { if (x.dep) parts.push(plur(x.dep, L("dépense"), L("dépenses"))); if (x.rev) parts.push(plur(x.rev, L("revenu"), L("revenus"))); if (x.mv) parts.push(plur(x.mv, L("autre opération"), L("autres opérations"))); if (x.due.length) parts.push(plur(x.due.length, L("échéance à payer"), L("échéances à payer"))); }
    const dueDep = x && x.due.some(r => r.t === "dep"), dueRev = x && x.due.some(r => r.t !== "dep");
    const dots = x ? `${x.dep ? '<i class="dt dep"></i>' : ""}${x.rev ? '<i class="dt rev"></i>' : ""}${x.mv ? '<i class="dt mv"></i>' : ""}${dueDep ? '<i class="dt due dep"></i>' : ""}${dueRev ? '<i class="dt due rev"></i>' : ""}` : "";
    cells += `<button type="button" class="mc-d${v === calDay ? " sel" : ""}${v === t0 ? " today" : ""}${x && x.due.length && v < t0 ? " late" : ""}" data-act="cal-day" data-d="${v}" tabindex="${v === calDay ? 0 : -1}" aria-pressed="${v === calDay}"${v === t0 ? ' aria-current="date"' : ""} aria-label="${esc(cap1(dayName(v)) + (v === t0 ? ", " + L("aujourd'hui") : "") + (parts.length ? ", " + parts.join(", ") : ", " + L("rien")))}"><span class="n">${d}</span><span class="dots" aria-hidden="true">${dots}</span></button>`;
  }
  const x = data[calDay] || {tx: [], due: []}, have = txIds();
  const dueRows = x.due.map(r => { const late = calDay < t0;
    return `<li class="pend"><div class="top-l">${r.t === "vir" ? chipHtml(null, "⇄") : chipHtml(cat(r.cat))}<div class="t"><b>${esc(recTitle(r))}</b><small><span class="pay-st due${late ? " late" : ""}">${late ? L("En retard") : r.t === "rev" ? L("À recevoir") : L("À payer")}</span> · ${esc(freqLabel(r))}</small></div><span class="amt ${r.t}">${esc(recSign(r))}</span></div>
      <div class="pend-act"><button type="button" class="btn sm ghost" data-act="rec-skip" data-id="${esc(r.id)}" data-d="${calDay}" aria-label="${esc(L("Ignorer ") + recTitle(r) + L(" du ") + longDate(calDay))}">${L("Ignorer")}</button><button type="button" class="btn sm" data-act="rec-pay" data-id="${esc(r.id)}" data-d="${calDay}" aria-label="${esc((r.t === "rev" ? L("Marquer reçue : ") : L("Marquer payée : ")) + recTitle(r) + ", " + recSign(r).replace("−", L("moins") + " ") + L(" du ") + longDate(calDay))}">✓ ${paidW(r)}</button></div></li>`; }).join("");
  const txs = x.tx.slice().sort((a, b) => (a.grp || a.id).localeCompare(b.grp || b.id));
  const txRows = txs.map(t => { const rd = recDateOf(t), r = rd && recOf(t.rec);
    if (!r) return null;
    return `<li class="with-pay">${txRow(t).replace(/^<li[^>]*>/, "").replace(/<\/li>$/, "").replace(/<span class="sw-bg"[^>]*>.*?<\/span>/, "")}<button type="button" class="btn sm ghost paybtn paid" data-act="rec-unpay" data-id="${esc(r.id)}" data-d="${rd}" data-tx="${esc(t.id)}" aria-label="${esc((r.t === "rev" ? L("Reçue. Marquer non reçue : ") : L("Payée. Marquer impayée : ")) + recTitle(r) + L(" du ") + longDate(rd))}">✓ ${paidW(r)}</button></li>`; });
  const plain = txs.filter((t, i) => txRows[i] === null), recPaid = txRows.filter(Boolean).join("");
  const sums = {}; x.tx.forEach(t => { if (t.t !== "dep" && t.t !== "rev") return; const a = acc(t.acc); if (!a) return; sums[a.cur] = (sums[a.cur] || 0) + (t.t === "rev" ? t.amt : -t.amt); });
  return `<div class="bar-line"><label class="f accsel"><span class="sr">${L("Filtrer par compte")}</span><select id="op-acc"><option value="">${L("Tous les comptes")}</option>${accOpts(opAcc)}</select></label></div>
    <div class="card mcal">
      <div class="cal-h"><button type="button" class="cal-n" data-act="calm" data-n="-1" aria-label="${esc(L("Mois précédent"))}">‹</button><h2 aria-live="polite">${esc(cap1(monthName(ym)))}</h2><button type="button" class="cal-n" data-act="calm" data-n="1" aria-label="${esc(L("Mois suivant"))}">›</button></div>
      <div class="mc-g" role="group" aria-label="${esc(cap1(monthName(ym)) + ". " + L("Flèches pour changer de jour."))}">${wd.map(w => `<span class="cal-w" aria-hidden="true">${esc(w)}</span>`).join("")}${cells}</div>
      <div class="mc-leg" aria-hidden="true"><span><i class="dt dep"></i>${L("Dépense")}</span><span><i class="dt rev"></i>${L("Revenu")}</span><span><i class="dt mv"></i>${L("Virement, prêt")}</span><span><i class="dt due dep"></i>${L("À payer")}</span></div>
      ${ym !== t0.slice(0, 7) || calDay !== t0 ? `<button type="button" class="link" data-act="cal-today">${L("Revenir à aujourd'hui")}</button>` : ""}
    </div>
    <div class="sec-h"><h2 id="cal-day-h">${esc(cap1(dayName(calDay)))}</h2>${Object.keys(sums).length ? `<span class="num ${Object.values(sums).every(v => v >= 0) ? "pos" : "neg"}" style="font-weight:700">${Object.entries(sums).map(([c, v]) => (v < 0 ? "−" : "+") + fmt(Math.abs(v), c)).join(" · ")}</span>` : ""}</div>
    ${x.due.length ? `<ul class="card rows" aria-label="${esc(L("Échéances à payer"))}">${dueRows}</ul>` : ""}
    ${recPaid || plain.length ? `<div class="card" id="tx-list"><ul class="rows">${recPaid}${plain.length ? txByDay(plain).replace(/^<h3 class="day">.*?<\/h3><ul class="rows">/, "").replace(/<\/ul>$/, "") : ""}</ul></div>` : ""}
    ${!x.due.length && !x.tx.length ? `<p class="empty card">${L("Aucune opération ni échéance ce jour-là.")}</p>` : ""}
    <button type="button" class="btn ghost" data-act="new-on-day" data-d="${calDay}">＋ ${L("Ajouter une opération le ")}${esc(dm(calDay))}</button>`;
}
function vOperations() {
  if (opAcc && !acc(opAcc)) opAcc = "";
  if (P.opView === "cal") return opViewSeg() + vCalendar();
  if (opTag && !allTags().includes(opTag)) opTag = "";
  const tagsAll = allTags();
  const list = opsList(), q = query.trim(), nr = S.meta.recurring.length, np = pendingRecs().length, a = acc(opAcc);
  const F = [["all", L("Tout")], ["dep", L("Dépenses")], ["rev", L("Revenus")], ["vir", L("Virements")], ["pret", L("Prêts")]];
  const lab = rangeLabel(opPreset, opRange);
  let tagSum = "";
  if (opTag) { const m = {}; list.forEach(t => { if (t.t !== "dep" && t.t !== "rev") return; const a0 = acc(t.acc); if (!a0) return; m[a0.cur] = (m[a0.cur] || 0) + (t.t === "dep" ? t.amt : -t.amt); });
    tagSum = `<div class="card tag-sum"><span>${L("Coût total de")} <b>#${esc(opTag)}</b></span><b class="num">${Object.keys(m).length ? Object.entries(m).map(([c, v]) => fmt(v, c)).join(" · ") : fmt(0, base())}</b></div>`; }
  let head2 = "";
  if (a) {
    let inn = 0, out = 0;
    for (const t of list) { if (t.acc === a.id) { const dl = isIn(t) ? t.amt : -t.amt; if (dl > 0) inn += dl; else out -= dl; } if (t.t === "vir" && t.to === a.id) inn += (t.amtTo ?? t.amt); }
    head2 = `<div class="card acc-head" style="--ac:${esc(a.color || "var(--accent)")}"><div class="ah-top">${accChip(a)}<div class="t"><b>${esc(a.name)}</b><small>${L("Solde actuel")}</small></div><b class="num ah-bal">${fmt(balance(a), a.cur)}</b></div>
      <div class="ah-io"><span><small>${L("Entrées")}</small><b class="num pos">+${fmt(inn, a.cur)}</b></span><span><small>${L("Sorties")}</small><b class="num neg">−${fmt(out, a.cur)}</b></span><button type="button" class="btn ghost sm" data-act="edit-acc" data-id="${esc(a.id)}">${L("Modifier le compte")}</button></div></div>`;
  }
  return opViewSeg() + `<div class="bar-line nowrap"><button type="button" class="navb" data-act="op-month" data-n="-1" aria-label="${esc(L("Mois précédent"))}">‹</button>
      <button type="button" class="period" data-act="period" data-t="ops" aria-label="${esc(L("Période : ") + lab + L(", du ") + longDate(opRange.from) + L(" au ") + longDate(opRange.to) + L(". Changer"))}"><b>${esc(lab)}</b><small>${dm(opRange.from)} – ${dm(opRange.to)}</small><span aria-hidden="true">▾</span></button>
      <button type="button" class="navb" data-act="op-month" data-n="1" aria-label="${esc(L("Mois suivant"))}">›</button></div>
    <div class="bar-line"><label class="f accsel"><span class="sr">${L("Filtrer par compte")}</span><select id="op-acc"><option value="">${L("Tous les comptes")}</option>${accOpts(opAcc)}</select></label>
      <a class="pill-btn" href="#recurrentes" aria-label="${esc(L("Opérations récurrentes : ") + nr + (np ? L(", dont ") + np + L(" à payer") : ""))}"><span aria-hidden="true">↻</span>${np ? ` ${np} ${L("À payer").toLowerCase()}` : nr ? ` ${nr}` : ""}</a></div>
    ${head2}
    <div class="filters scroll" role="group" aria-label="${L("Type d'opération")}">${F.map(([k, l]) => `<button type="button" class="pill-btn" data-act="filter" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}</div>
    <label class="f"><span class="sr">${L("Rechercher une opération")}</span><input type="search" id="q" placeholder="${esc(L("Rechercher : libellé, montant, catégorie, #étiquette"))}" value="${esc(query)}"></label>
    ${tagsAll.length ? `<div class="filters scroll" role="group" aria-label="${esc(L("Étiquettes"))}">${tagsAll.slice(0, 15).map(g => `<button type="button" class="pill-btn" data-act="op-tag" data-v="${esc(g)}" aria-pressed="${opTag === g}">#${esc(g)}</button>`).join("")}</div>` : ""}
    ${q || opTag ? `<div class="srch-info"><label class="check"><input type="checkbox" id="q-all" ${searchAll ? "checked" : ""}><span>${L("Chercher sur toutes les dates")}</span></label><b role="status">${plur(list.length, L("résultat"), L("résultats"))}</b></div>${tagSum}` : ""}
    <h2 class="sr">${plur(list.length, L("opération"), L("opérations"))}</h2>
    <div class="card" id="tx-list">${list.length ? txByDay(list.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 300)) : `<p class="empty">${L("Aucune opération sur cette période")}${q || filter !== "all" || opAcc ? L(" avec ces filtres") : ""}.</p>`}</div>
    ${list.length > 300 ? `<p class="hint" style="text-align:center">${L("Seules les 300 premières opérations sont affichées. Réduisez la période pour voir le reste.")}</p>` : list.length ? `<p class="hint" style="text-align:center">${L("Astuce : balayez une opération vers la gauche pour la supprimer (touche Suppr au clavier).")}</p>` : ""}`;
}

/* ---------- comptes en évidence sur l'accueil ---------- */
function accSpark(a, bal) {
  const t = today(), from = ymd(new Date(Date.now() - 29 * 864e5)), per = {};
  for (const x of allTx()) { if (x.date < from) continue; let dl = 0; if (x.acc === a.id) dl += isIn(x) ? x.amt : -x.amt; if (x.t === "vir" && x.to === a.id) dl += (x.amtTo ?? x.amt); if (dl) per[x.date] = (per[x.date] || 0) + dl; }
  let v = bal; Object.keys(per).forEach(d => { if (d > t) v -= per[d]; });
  const now = v, vals = []; let d = new Date();
  for (let i = 0; i < 30; i++) { vals.unshift(v); v -= per[ymd(d)] || 0; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); }
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const pts = vals.map((y, i) => (i / 29 * 100).toFixed(1) + "," + (26 - (y - lo) / sp * 22).toFixed(1)).join(" ");
  return {now, diff: now - vals[0], svg: `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,30 ${pts} 100,30" fill="var(--ac)" opacity=".14"/><polyline points="${pts}" fill="none" stroke="var(--ac)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`};
}
function ratesLine() {
  const b = base(), cs = S.meta.currencies.filter(c => c.code !== b);
  if (!cs.length) return "";
  return `<a class="rates" href="#devises" aria-label="${esc(L("Cours des devises") + " : " + cs.map(c => "1 " + L(c.name) + L(" vaut ") + NF4.format(c.rate) + " " + plural(b)).join(", ") + L(". Modifier"))}"><span class="rl" aria-hidden="true">${L("Cours")}</span>${cs.map(c => `<span class="rc" aria-hidden="true"><b>1 ${esc(c.sym)}</b> = ${NF4.format(c.rate)} ${esc(sym(b))}</span>`).join("")}<span class="chev" aria-hidden="true">›</span></a>`;
}
function accCards() {
  const pins = S.meta.accounts.filter(a => a.pin !== false);
  return `<div class="sec-h"><h2>${L("Comptes")}</h2><button type="button" class="link" data-act="pins">${L("Choisir les comptes")}</button></div>` +
    (pins.length ? `<ul class="acards plain">${pins.map(a => { const b = balance(a), s = accSpark(a, b);
      return `<li><button type="button" class="acard" style="--ac:${esc(a.color || "var(--accent)")}" data-act="acc-ops" data-id="${esc(a.id)}" aria-label="${esc(a.name + L(", solde ") + say(b, a.cur) + ". " + L("Voir les opérations"))}"><span class="an">${esc(a.name)}</span><b class="num">${fmt(b, a.cur)}</b><span class="ad ${s.diff < 0 ? "neg" : "pos"}">${s.diff < 0 ? "−" : "+"}${fmt(Math.abs(s.diff), a.cur)} <small>${L("sur 30 jours")}</small></span>${s.svg}</button></li>`; }).join("")}</ul>`
    : `<p class="hint">${L("Aucun compte en évidence.")}</p>`);
}
function openPins() {
  openSheet(head(L("Comptes en évidence sur l'Accueil")) + `<form novalidate><fieldset><legend>${L("Cochez les comptes à afficher en haut de l'Accueil.")}</legend>${S.meta.accounts.map(a => `<label class="check"><input type="checkbox" name="pin" value="${esc(a.id)}" ${a.pin !== false ? "checked" : ""}>${accChip(a)}<span>${esc(a.name)}</span></label>`).join("")}</fieldset>
    <div class="actions"><button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const on = new Set([...document.querySelectorAll('input[name="pin"]:checked')].map(x => x.value));
    S.meta.accounts.forEach(a => a.pin = on.has(a.id)); touch("meta"); closeSheet(); render();
  }, "#sheet-title");
}

/* ---------- opération répartie sur plusieurs lignes ---------- */
const signBtn = id => `<button type="button" class="signb" data-act="neg" data-for="${id}" aria-label="${esc(L("Changer le signe du montant"))}">±</button>`;
function splitTotal(d) { const m = {}; d.parts.forEach(pt => { const v = parseAmt(pt.amtS), a = acc(pt.acc); if (v && a) m[a.cur] = (m[a.cur] || 0) + v; }); return L("Total net :") + " " + (Object.keys(m).length ? Object.entries(m).map(([c, v]) => fmt(v, c)).join(" + ") : fmt(0, base())); }
function splitHtml(d) {
  return `<fieldset class="boxed"><legend>${L("Répartition")}</legend>
    ${d.parts.map((pt, i) => `<div class="part" role="group" aria-label="${esc(L("Ligne") + " " + (i + 1))}">
      <div class="f"><label for="p-amt-${i}">${L("Montant")} ${i + 1}${acc(pt.acc) ? " (" + esc(sym(acc(pt.acc).cur)) + ")" : ""}</label><div class="amtrow"><input type="text" inputmode="decimal" id="p-amt-${i}" placeholder="0,00" value="${esc(pt.amtS)}" autocomplete="off">${signBtn("p-amt-" + i)}</div></div>
      <label class="f"><span>${L("Catégorie")}</span><select id="p-cat-${i}">${catOpts(d.t, pt.cat)}</select></label>
      <label class="f"><span>${L("Compte")}</span><select id="p-acc-${i}">${accOpts(pt.acc)}</select></label>
      ${d.parts.length > 1 ? `<label class="f pnote"><span class="sr">${L("Note de la ligne (facultatif)")}</span><input type="text" id="p-note-${i}" maxlength="40" placeholder="${esc(L("Note de la ligne (facultatif)"))}" value="${esc(pt.pn || "")}"></label>` : ""}
      ${d.parts.length > 1 ? `<button type="button" class="pdel" data-act="part-del" data-i="${i}" aria-label="${esc(L("Supprimer la ligne") + " " + (i + 1))}">×</button>` : ""}</div>`).join("")}
    <button type="button" class="btn ghost sm" data-act="part-add">${L("Ajouter une ligne")}</button>
    <p class="ptotal num" id="p-total" aria-live="polite">${splitTotal(d)}</p>
    <small class="hint" style="margin:0">${L("Un montant négatif correspond à un remboursement. Exemple : addition de 120 payée par carte, puis une ligne de −30 en Espèces pour chaque ami qui vous rend sa part.")}</small></fieldset>`;
}
function saveSplit(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return err(L("Choisissez une date."), "f-date-btn");
  const parts = [];
  for (let i = 0; i < d.parts.length; i++) { const pt = d.parts[i]; if (!pt.amtS.trim()) continue; const v = parseAmt(pt.amtS); if (!v) return err(L("Saisissez un montant différent de zéro."), "p-amt-" + i); if (!acc(pt.acc)) return err(L("Choisissez un compte."), "p-acc-" + i); parts.push({amt: v, cat: pt.cat, acc: pt.acc, pn: (pt.pn || "").trim()}); }
  if (!parts.length) return err(L("Saisissez un montant différent de zéro."), "p-amt-0");
  const ch = new Set(), grp = parts.length > 1 ? (d.grp || "g-" + uid()) : "", tg = parseTags(d.tagsS), bud0 = budSnap(d.date.slice(0, 7)); let key = "";
  (d.grp ? allTx().filter(t => t.grp === d.grp).map(t => t.id) : d.id ? [d.id] : []).forEach(id => { const m = removeTx(id); if (m) ch.add("tx-" + m); });
  parts.forEach((pt, i) => { const x = {id: uid() + i, t: d.t, amt: pt.amt, acc: pt.acc, cat: pt.cat, date: d.date, note: d.note.trim()}; if (grp) x.grp = grp; if (pt.pn) x.pn = pt.pn; if (tg.length) x.tags = tg; if (d.photo) x.ph = 1; if (!key) key = grp || x.id; putTx(x).forEach(k => ch.add(k)); });
  phSave(d, key);
  touch(...ch); genie(closeSheet); month = d.date.slice(0, 7); showInOps(d.date); render();
  toast((parts.length > 1 ? L("Opération répartie en") + " " + parts.length + " " + L("lignes") : L("Opération ajoutée")) + budAlert(bud0, d.date.slice(0, 7)));
}
function showInOps(date) { if (opRange && (date < opRange.from || date > opRange.to)) { const m = date.slice(0, 7); opRange = {from: m + "-01", to: lastDay(m)}; opPreset = m === today().slice(0, 7) ? "month" : "custom"; } }

/* ---------- statistiques : analyse ---------- */
function insights(F, f, dc) {
  const dayN = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5) + 1;
  const addD = (d, n) => { const [y, m, x] = d.split("-").map(Number); return ymd(new Date(y, m - 1, x + n)); };
  const v = t => conv(t.amt, acc(t.acc).cur, dc);
  const txs = allTx().filter(t => (t.t === "dep" || t.t === "rev") && t.date >= range.from && t.date <= range.to && F.has(acc(t.acc))), deps = txs.filter(t => t.t === "dep");
  const t0 = today(), end = range.to < t0 ? range.to : (t0 < range.from ? range.to : t0), days = Math.max(1, dayN(range.from, end)), len = dayN(range.from, range.to);
  const pTo = addD(range.from, -1), pFrom = addD(pTo, -(len - 1)), pf = flowsBetween(pFrom, pTo, F);
  const rate = f.rev > 0 ? Math.round((f.rev - f.dep) / f.rev * 100) : null, rc = rate == null ? 0 : Math.max(0, Math.min(100, rate)), C = 2 * Math.PI * 30;
  const delta = (now, prev, goodUp) => { if (!prev) return `<span class="delta">–</span>`; const pc = Math.round((now - prev) / prev * 100), up = pc > 0; return `<span class="delta ${pc === 0 ? "" : up === goodUp ? "good" : "bad"}">${up ? "+" : pc < 0 ? "−" : ""}${Math.abs(pc)} %</span>`; };
  const wd = Array(7).fill(0); deps.forEach(t => { const [y, m, d] = t.date.split("-").map(Number); wd[(new Date(y, m - 1, d).getDay() + 6) % 7] += Math.max(0, v(t)); });
  const wmax = Math.max(...wd, 1), wnames = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "short"}).format(new Date(2024, 0, 1 + i)).replace(".", "")), wlong = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "long"}).format(new Date(2024, 0, 1 + i))), wtop = wd.indexOf(Math.max(...wd));
  const byAcc = {}; deps.forEach(t => byAcc[t.acc] = (byAcc[t.acc] || 0) + v(t)); const accRows = Object.entries(byAcc).sort((a, b) => b[1] - a[1]), amax = accRows.length ? accRows[0][1] : 1;
  const top = deps.slice().sort((a, b) => v(b) - v(a)).slice(0, 5);
  return `<h2 class="sec-h">${L("Taux d'épargne")}</h2>
    <div class="card ring-card"><svg viewBox="0 0 76 76" class="ring" aria-hidden="true"><circle cx="38" cy="38" r="30" fill="none" stroke="var(--track)" stroke-width="9"/><circle class="arc" cx="38" cy="38" r="30" fill="none" stroke="${rate != null && rate < 0 ? "var(--crit)" : "var(--accent)"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(rc / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle">${rate == null ? "–" : rate + " %"}</text></svg>
      <p>${rate == null ? L("Aucun revenu sur la période") : rate < 0 ? L("Dépenses supérieures aux revenus") + " : " + fmt(f.dep - f.rev, dc) : `<b>${rate} %</b> ${L("des revenus mis de côté")} : ${fmt(f.rev - f.dep, dc)}`}</p></div>
    <h2 class="sec-h">${L("Chiffres clés")}</h2>
    <div class="card"><dl class="kv">
      <div><dt>${L("Dépense moyenne par jour")}</dt><dd>${fmt(Math.round(f.dep / days), dc)}</dd></div>
      <div><dt>${L("Dépense moyenne par opération")}</dt><dd>${fmt(deps.length ? Math.round(f.dep / deps.length) : 0, dc)}</dd></div>
      <div><dt>${L("Nombre d'opérations")}</dt><dd>${txs.length}</dd></div>
      ${top.length ? `<div><dt>${L("Plus grosse dépense")}</dt><dd>${esc(txInfo(top[0]).title)} · ${fmt(v(top[0]), dc)}</dd></div>` : ""}</dl></div>
    <h2 class="sec-h">${L("Par rapport à la période précédente")}</h2>
    <div class="card"><dl class="kv cmp">
      <div><dt>${L("Dépenses")}<small>${fmt(pf.dep, dc)} ${L("avant")}</small></dt><dd>${fmt(f.dep, dc)} ${delta(f.dep, pf.dep, false)}</dd></div>
      <div><dt>${L("Revenus")}<small>${fmt(pf.rev, dc)} ${L("avant")}</small></dt><dd>${fmt(f.rev, dc)} ${delta(f.rev, pf.rev, true)}</dd></div></dl>
      <small class="hint">${dm(pFrom)} – ${dm(pTo)}</small></div>
    <h2 class="sec-h">${L("Dépenses par jour de la semaine")}</h2>
    <div class="card">${f.dep ? `<p class="sr">${wlong.map((n, i) => n + " : " + say(wd[i], dc)).join(". ")}</p><div class="wk" aria-hidden="true">${wd.map((x, i) => `<div class="wkc${i === wtop ? " top" : ""}"><span class="num">${x ? compact(x) : ""}</span><div class="wkb"><i style="height:${Math.max(3, x / wmax * 100)}%;--i:${i}"></i></div><small>${esc(wnames[i])}</small></div>`).join("")}</div>
      <small class="hint">${L("Jour le plus dépensier :")} <b>${esc(wlong[wtop])}</b></small>` : `<p class="empty">${L("Aucune dépense")}</p>`}</div>
    ${accRows.length > 1 ? `<h2 class="sec-h">${L("Dépenses par compte")}</h2><div class="card"><ul class="rows">${accRows.map(([id, x]) => { const a = acc(id); return `<li><div class="rank" style="--cc:${esc(a.color || "var(--s1)")}">${accChip(a)}<span>${esc(a.name)} <small class="num">${Math.round(x / f.dep * 100)} %</small></span><span class="amt">${fmt(x, dc)}</span><span class="track"><i style="width:${Math.max(2, x / amax * 100)}%"></i></span></div></li>`; }).join("")}</ul></div>` : ""}
    ${top.length ? `<h2 class="sec-h">${L("Les 5 plus grosses dépenses")}</h2><div class="card"><ul class="rows">${top.map(t => txRow(t, true)).join("")}</ul></div>` : ""}` + insights2(F, f, dc);
}
function insights2(F, f, dc) {
  const dayN = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5) + 1;
  const addD = (d, n) => { const [y, m, x] = d.split("-").map(Number); return ymd(new Date(y, m - 1, x + n)); };
  const v = t => conv(t.amt, acc(t.acc).cur, dc), t0 = today(), len = dayN(range.from, range.to), pTo = addD(range.from, -1), pFrom = addD(pTo, -(len - 1));
  const all = allTx().filter(t => t.t === "dep" && F.has(acc(t.acc))), deps = all.filter(t => t.date >= range.from && t.date <= range.to), prev = all.filter(t => t.date >= pFrom && t.date <= pTo);
  const perDay = {}; deps.forEach(t => perDay[t.date] = (perDay[t.date] || 0) + v(t));
  const perPrev = {}; prev.forEach(t => perPrev[t.date] = (perPrev[t.date] || 0) + v(t));
  const end = range.to < t0 ? range.to : (t0 < range.from ? range.to : t0), elapsed = Math.max(1, dayN(range.from, end));
  // cumul
  const n = Math.min(len, 400), cur = [], prv = []; let a1 = 0, a2 = 0;
  for (let i = 0; i < n; i++) { const d = addD(range.from, i); a2 += perPrev[addD(pFrom, i)] || 0; prv.push(a2); if (d <= end) { a1 += perDay[d] || 0; cur.push(a1); } }
  const cmax = niceMax(Math.max(a1, a2, 1)), X0 = 40, W = 290, Y0 = 8, H = 100, px = i => n === 1 ? X0 + W / 2 : X0 + i / (n - 1) * W, py = y => Y0 + H - y / cmax * H;
  const line = arr => arr.map((y, i) => (i ? "L" : "M") + px(i).toFixed(1) + " " + py(y).toFixed(1)).join(" ");
  const cumul = `<svg class="chart" viewBox="0 0 340 128" aria-hidden="true">${[0, .5, 1].map(k => `<line class="grid" x1="${X0}" x2="${X0 + W}" y1="${py(cmax * k)}" y2="${py(cmax * k)}"/><text x="${X0 - 5}" y="${py(cmax * k) + 3}" text-anchor="end">${compact(cmax * k)}</text>`).join("")}
    <path d="${line(prv)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/><path class="line" pathLength="1" d="${line(cur)}" fill="none" stroke="var(--s2)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="${X0}" y="${Y0 + H + 16}">${dm(range.from).slice(0, 5)}</text><text x="${X0 + W}" y="${Y0 + H + 16}" text-anchor="end">${dm(range.to).slice(0, 5)}</text></svg>`;
  // calendrier du dernier mois de la période
  const hm = end.slice(0, 7), [hy, hmo] = hm.split("-").map(Number), nd = new Date(hy, hmo, 0).getDate(), lead = (new Date(hy, hmo - 1, 1).getDay() + 6) % 7;
  const mdays = [...Array(nd)].map((_, i) => hm + "-" + pad(i + 1)), mvals = mdays.map(d => all.filter(t => t.date === d).reduce((z, t) => z + Math.max(0, v(t)), 0)), mmax = Math.max(...mvals, 1);
  const wn = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "narrow"}).format(new Date(2024, 0, 1 + i)));
  const heat = `<div class="heat" aria-hidden="true">${wn.map(w => `<span class="hw">${esc(w)}</span>`).join("")}${"<span></span>".repeat(lead)}${mvals.map((x, i) => `<span class="hc${mdays[i] === t0 ? " today" : ""}" style="--p:${x ? Math.round(18 + x / mmax * 72) : 0}%" title="${esc(dm(mdays[i]) + " : " + fmt(x, dc))}">${i + 1}</span>`).join("")}</div>`;
  // record, jours sans dépense
  const days = Object.entries(perDay).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]), rec = days[0];
  let zero = 0; for (let i = 0; i < elapsed; i++) if (!(perDay[addD(range.from, i)] > 0)) zero++;
  const isCurMonth = range.from === t0.slice(0, 7) + "-01" && range.to === lastDay(t0.slice(0, 7)), months = len / 30.44;
  // charges fixes
  const fixed = deps.filter(t => t.rec).reduce((z, t) => z + v(t), 0), tot = Math.max(1, f.dep), fp = Math.max(0, Math.min(100, Math.round(fixed / tot * 100)));
  // libellés
  const lab = {}; deps.forEach(t => { const k = norm(t.note); if (!k) return; (lab[k] = lab[k] || {name: t.note, n: 0, v: 0}); lab[k].n++; lab[k].v += v(t); });
  const labs = Object.values(lab).sort((x, y) => y.v - x.v).slice(0, 5), lmax = labs.length ? labs[0].v : 1;
  const subs = Object.entries(f.byCat).filter(([c, x]) => cat(c) && cat(c).kind === "dep" && cat(c).parent && x > 0).sort((x, y) => y[1] - x[1]).slice(0, 5), smax = subs.length ? subs[0][1] : 1;
  const revs = Object.entries(f.byTop.rev).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]), rmax = revs.length ? revs[0][1] : 1;
  const bar = (chip, name, extra, x, max, col) => `<li><div class="rank" style="--cc:${col}">${chip}<span>${esc(name)} <small class="num">${esc(extra)}</small></span><span class="amt">${fmt(x, dc)}</span><span class="track"><i style="width:${Math.max(2, x / max * 100)}%"></i></span></div></li>`;
  return `<h2 class="sec-h">${L("Dépenses cumulées")}</h2>
    <div class="card"><p class="sr">${L("Dépenses cumulées")} : ${say(a1, dc)}. ${L("Période précédente")} : ${say(a2, dc)}.</p><div class="legend" aria-hidden="true"><span><i style="background:var(--s2)"></i>${L("Cette période")}</span><span><i style="background:var(--muted)"></i>${L("Période précédente")}</span></div>${zoomWrap(cumul)}</div>
    <h2 class="sec-h">${L("Calendrier des dépenses")} · ${esc(cap1(monthName(hm)))}</h2>
    <div class="card">${heat}<p class="hint">${rec ? L("Jour record :") + " <b>" + esc(cap1(dayName(rec[0]))) + "</b> · " + fmt(rec[1], dc) + ". " : ""}${L("Jours sans dépense :")} <b>${zero}</b> / ${elapsed}</p></div>
    <h2 class="sec-h">${L("Charges fixes et dépenses variables")}</h2>
    <div class="card"><div class="stack" aria-hidden="true"><i style="width:${fp}%;background:var(--c7,#6250d6)"></i><i style="width:${100 - fp}%;background:var(--s2)"></i></div>
      <dl class="kv" style="margin-top:10px"><div><dt><span class="dot" style="background:#6250d6"></span>${L("Charges fixes (opérations récurrentes)")}</dt><dd>${fmt(fixed, dc)} · ${fp} %</dd></div><div><dt><span class="dot" style="background:var(--s2)"></span>${L("Dépenses variables")}</dt><dd>${fmt(f.dep - fixed, dc)} · ${100 - fp} %</dd></div></dl></div>
    ${isCurMonth || months > 1.5 ? `<h2 class="sec-h">${L("Tendances")}</h2><div class="card"><dl class="kv">
      ${isCurMonth ? `<div><dt>${L("Dépenses prévues à la fin du mois, à ce rythme")}</dt><dd>${fmt(Math.round(f.dep / elapsed * len), dc)}</dd></div>` : ""}
      ${months > 1.5 ? `<div><dt>${L("Dépenses moyennes par mois")}</dt><dd>${fmt(Math.round(f.dep / months), dc)}</dd></div><div><dt>${L("Revenus moyens par mois")}</dt><dd>${fmt(Math.round(f.rev / months), dc)}</dd></div>` : ""}</dl></div>` : ""}
    ${labs.length ? `<h2 class="sec-h">${L("Où part l'argent : principaux libellés")}</h2><div class="card"><ul class="rows">${labs.map(x => bar("", x.name, "× " + x.n, x.v, lmax, "var(--s2)")).join("")}</ul></div>` : ""}
    ${subs.length ? `<h2 class="sec-h">${L("Principales sous-catégories")}</h2><div class="card"><ul class="rows">${subs.map(([c, x]) => bar(chipHtml(cat(c)), catLabel(c), Math.round(x / tot * 100) + " %", x, smax, esc(cat(c).color || "var(--s1)"))).join("")}</ul></div>` : ""}
    ${(() => { const tt = tagTotals(range.from, range.to, F); if (!tt.length) return ""; const mx = Math.max(1, ...tt.map(x => x[1].dep)); return `<h2 class="sec-h">${L("Par étiquette")}</h2><div class="card"><ul class="rows">${tt.slice(0, 8).map(([g, x]) => bar("", "#" + g, plur(x.n, L("opération"), L("opérations")), x.dep, mx, "var(--s1)")).join("")}</ul></div>`; })()}
    ${revs.length ? `<h2 class="sec-h">${L("Sources de revenus")}</h2><div class="card"><ul class="rows">${revs.map(([c, x]) => bar(chipHtml(cat(c)), catName(c), Math.round(x / Math.max(1, f.rev) * 100) + " %", x, rmax, esc(cat(c)?.color || "var(--s1)"))).join("")}</ul></div>` : ""}`;
}
function vRecurrentes() {
  const list = S.meta.recurring.slice().sort((a, b) => (nextOcc(a) || "9").localeCompare(nextOcc(b) || "9"));
  return backLink("operations") + pendingBlock(0) +
    `<button type="button" class="btn" data-act="new-rec">${L("Nouvelle opération récurrente")}</button>
    <h2 class="sec-h">${L("Toutes les récurrences")}</h2>
    <ul class="card rows">${list.length ? list.map(r => {
      const nx = nextOcc(r), st = r.paused ? L("En pause") : !nx ? L("Terminée") : L("Prochaine le ") + dm(nx), md = r.mode === "auto" ? L("automatique") : L("à marquer payée");
      const sr = `${recTitle(r)}, ${recSign(r).replace("−", L("moins") + " ")}, ${freqLabel(r).toLowerCase()}, ${md}. ${r.paused ? L("En pause") : !nx ? L("Terminée") : L("Prochaine échéance le ") + longDate(nx)}${L(". Modifier")}`;
      return `<li><button type="button" class="row" data-act="edit-rec" data-id="${esc(r.id)}" aria-label="${esc(sr)}">${r.t === "vir" ? chipHtml(null, "⇄") : chipHtml(cat(r.cat))}<span class="t"><b>${esc(recTitle(r))}</b><small>${esc(freqLabel(r))} · ${md} · ${esc(st)}</small></span><span class="amt ${r.t}">${esc(recSign(r))}</span></button></li>`;
    }).join("") : `<li class="empty">${L("Aucune opération récurrente. Loyer, salaire, abonnements : créez-les ici ou cochez « Répéter » en saisissant une opération.")}</li>`}</ul>
    <p class="hint">${L("Une échéance n'est comptée dans vos dépenses ou revenus que lorsque vous la marquez « Payée » : depuis l'Accueil, le calendrier des opérations ou cet écran. Vous pouvez la remettre « impayée » à tout moment. Le mode automatique, à choisir exprès, sert aux prélèvements : l'échéance est alors enregistrée d'elle-même le jour venu.")}</p>`;
}

function vBudgets() {
  const list0 = [...new Set([...usedCurs(), ...S.meta.budgets.map(b => b.cur)])];
  if (!list0.includes(cur)) cur = list0.includes(base()) ? base() : list0[0];
  const list = S.meta.budgets.filter(b => b.cur === cur);
  const tot = list.reduce((s, b) => s + b.limit, 0), sp = list.reduce((s, b) => s + budgetState(b, month).spent, 0);
  return `<div class="bar-line">${monthSwitch()}${curSeg(list0)}</div>` +
    (list.length ? `<div class="card"><div class="budget" style="padding:0;border:0"><div class="h"><h2 style="margin:0;font-size:15px">${L("Total des budgets")}</h2><span class="amt">${fmt(sp, cur)}</span></div><div class="track" aria-hidden="true"><i class="${sp > tot ? "crit" : sp >= .8 * tot ? "warn" : ""}" style="width:${Math.min(100, tot ? sp / tot * 100 : 0)}%"></i></div><small><span>${L("dépensés sur ")}${fmt(tot, cur)}</span><span>${tot - sp >= 0 ? L("Reste ") + fmt(tot - sp, cur) : L("Dépassement de ") + fmt(sp - tot, cur)}</span></small></div></div>` : "") +
    `<h2 class="sr">${L("Budgets par catégorie")}</h2><ul class="card rows">${list.length ? list.map(b => {
      const s = budgetState(b, month), n = catLabel(b.cat), rest = b.limit - s.spent, c = cat(b.cat);
      const sr = `${n}${c && !c.parent && kids(c.id).length ? L(", sous-catégories comprises") : ""} : ${say(s.spent, b.cur)}${L(" dépensés sur ")}${say(b.limit, b.cur)}, ${Math.round(s.r * 100)} %. ${s.label}. ${rest >= 0 ? L("Reste ") + say(rest, b.cur) : L("Dépassement de ") + say(-rest, b.cur)}${L(". Modifier")}`;
      return `<li><button type="button" class="budget" data-act="edit-budget" data-id="${esc(b.id)}" aria-label="${esc(sr)}"><span class="h"><b>${esc(n)}</b><span class="state ${s.cls}">${s.label}</span></span><span class="track"><i class="${s.cls}" style="width:${Math.min(100, s.r * 100)}%"></i></span><small><span class="num">${fmt(s.spent, b.cur)}${L(" sur ")}${fmt(b.limit, b.cur)}</span><span class="num">${rest >= 0 ? L("Reste ") + fmt(rest, b.cur) : L("Dépassement de ") + fmt(-rest, b.cur)}</span></small></button></li>`;
    }).join("") : `<li class="empty">${L("Aucun budget en ")}${esc(plural(cur))}${L(". Fixez un plafond mensuel par catégorie pour être averti avant de le dépasser.")}</li>`}</ul>
    <button type="button" class="btn ghost" data-act="new-budget">${L("Ajouter un budget")}</button>
    <p class="hint">${L("Le budget d'une catégorie principale compte aussi les dépenses de ses sous-catégories.")}</p>`;
}

/* ---------- prêts ---------- */
function loanRow(l) {
  const s = loanState(l), lent = l.kind === "lent", late = l.due && !s.done && l.due < today();
  const st = s.done ? ["", L("Remboursé")] : late ? ["crit", L("En retard")] : ["warn", L("En cours")];
  const pct = s.principal ? Math.min(100, s.repaid / s.principal * 100) : 0;
  const sr = `${l.person}, ${lent ? L("prêt accordé de") : L("emprunt de")} ${say(s.principal, l.cur)}. ${s.done ? L("Entièrement remboursé") : L("Reste ") + say(s.rest, l.cur) + L(" à rembourser")}${l.due && !s.done ? L(", échéance le ") + longDate(l.due) : ""}${late ? L(", en retard") : ""}${L(". Ouvrir")}`;
  return `<li><button type="button" class="budget" data-act="loan" data-id="${esc(l.id)}" aria-label="${esc(sr)}"><span class="h"><b>${esc(l.person)}</b><span class="state ${st[0]}">${st[1]}</span></span>
    <span class="track"><i style="width:${pct}%;background:var(--accent)"></i></span>
    <small><span class="num">${s.done ? L("Remboursé ") + fmt(s.principal, l.cur) : L("Reste ") + fmt(s.rest, l.cur) + L(" sur ") + fmt(s.principal, l.cur)}</span><span>${l.due && !s.done ? L("Échéance ") + dm(l.due) : esc(l.note)}</span></small></button></li>`;
}
function vPrets() {
  const show = S.meta.loans.filter(l => loanFilter === "open" ? !loanState(l).done : loanState(l).done);
  const sec = (k, title, empty) => { const it = show.filter(l => l.kind === k); return `<h2 class="sec-h">${title}</h2><ul class="card rows">${it.length ? it.map(loanRow).join("") : `<li class="empty">${empty}</li>`}</ul>`; };
  return `<div class="tiles two"><div class="tile"><small>${L("On me doit")}</small><b>${listAmounts(loanTotals("lent"))}</b></div><div class="tile"><small>${L("Je dois")}</small><b>${listAmounts(loanTotals("borrowed"))}</b></div></div>
    <button type="button" class="btn" data-act="new-loan">${L("Nouveau prêt ou emprunt")}</button>
    <div class="seg wide" role="group" aria-label="${L("Afficher")}"><button type="button" data-act="loanfilter" data-v="open" aria-pressed="${loanFilter === "open"}">${L("En cours")}</button><button type="button" data-act="loanfilter" data-v="done" aria-pressed="${loanFilter === "done"}">${L("Remboursés")}</button></div>
    ${sec("lent", L("Prêts accordés"), loanFilter === "open" ? L("Personne ne vous doit d'argent.") : L("Aucun prêt entièrement remboursé."))}
    ${sec("borrowed", L("Emprunts"), loanFilter === "open" ? L("Vous ne devez d'argent à personne.") : L("Aucun emprunt entièrement remboursé."))}
    <p class="hint">${L("Un prêt fait sortir l'argent d'un de vos comptes et chaque remboursement reçu l'y fait revenir ; un emprunt fait l'inverse. Ces mouvements modifient les soldes mais ne comptent ni comme dépenses ni comme revenus.")}</p>`;
}

/* ---------- statistiques ---------- */
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p; return 10 * p; }
const compact = c => { const v = c / 100; return Math.abs(v) >= 1000 ? NF.format(v / 1000).replace(/,00$/, "").replace(/(,\d)0$/, "$1") + " k" : String(Math.round(v)); };
function barPath(x, y, w, h) { const r = Math.min(3, h, w / 2); return h <= 0 ? "" : `M${x},${y + h}V${y + r}q0,${-r} ${r},${-r}h${w - 2 * r}q${r},0 ${r},${r}V${y + h}z`; }
let range = null, preset = "month", catView = "bars", statView = "cat", statKind = "dep", statAccs = null, bal = null;
const PRESETS = [["month", L("Ce mois")], ["prev", L("Mois dernier")], ["q", L("3 derniers mois")], ["year", L("Cette année")], ["all", L("Tout l'historique")]];
const presetLabel = () => (PRESETS.find(p => p[0] === preset) || [0, L("Période choisie")])[1];
function presetRange(p) {
  const t = today(), ym = t.slice(0, 7);
  if (p === "prev") { const m = shiftMonth(ym, -1); return {from: m + "-01", to: lastDay(m)}; }
  if (p === "q") return {from: shiftMonth(ym, -2) + "-01", to: lastDay(ym)};
  if (p === "year") return {from: t.slice(0, 4) + "-01-01", to: t.slice(0, 4) + "-12-31"};
  if (p === "all") { const ds = allTx().map(x => x.date).sort(); return {from: ds[0] || t, to: ds.length && ds[ds.length - 1] > t ? ds[ds.length - 1] : t}; }
  return {from: ym + "-01", to: lastDay(ym)};
}
function setPreset(p) { preset = p; range = presetRange(p); }
let opRange = null, opPreset = "month", opAcc = "", periodTarget = "stats";
const fullMonth = r => r.from.slice(8) === "01" && r.to === lastDay(r.from.slice(0, 7));
const rangeLabel = (pr, r) => { const f = PRESETS.find(x => x[0] === pr); return f ? f[1] : fullMonth(r) ? cap1(monthName(r.from.slice(0, 7))) : L("Période choisie"); };
let statCur = null;
function statF() {
  let ids = (statAccs || []).filter(id => acc(id));
  if (!ids.length) ids = S.meta.accounts.map(a => a.id);
  const cs = [...new Set(ids.map(id => acc(id).cur))];
  return mkF(ids, statCur && S.meta.currencies.some(c => c.code === statCur) ? statCur : cs.length === 1 ? cs[0] : base());
}
function statAccLabel(F) {
  const all = S.meta.accounts;
  if (F.ids.length === all.length) return L("Tous les comptes");
  if (F.ids.length === 1) return acc(F.ids[0]).name;
  for (const c of usedCurs()) { const ids = all.filter(a => a.cur === c).map(a => a.id); if (ids.length === F.ids.length && ids.every(i => F.ids.includes(i))) return L("Comptes en ") + plural(c); }
  return F.ids.length + " comptes";
}
function zoomWrap(svg) {
  return `<div class="zoomable">${'<div class="zin">' + svg + "</div>"}</div><div class="zbar"><button type="button" data-act="zoom" data-z="in" aria-label="${L("Agrandir le graphique")}">+</button><button type="button" data-act="zoom" data-z="out" aria-label="${L("Réduire le graphique")}">−</button><button type="button" data-act="zoom" data-z="reset" aria-label="${L("Taille normale du graphique")}">1:1</button></div>`;
}
function balanceSeries(F) {
  const txs = allTx(), last = txs.reduce((m, t) => t.date > m ? t.date : m, today());
  const end = range.to < last ? range.to : last;
  if (range.from > end) return [];
  let v = S.meta.accounts.reduce((s, a) => F.has(a) ? s + conv(a.initial, a.cur, F.out) : s, 0); const per = {};
  for (const t of txs) { const d = delta(t, F); if (!d) continue; if (t.date < range.from) v += d; else if (t.date <= end) per[t.date] = (per[t.date] || 0) + d; }
  const out = []; out.start = v;
  for (let d = range.from, n = 0; d <= end && n < 3700; d = nextDay(d), n++) { v += per[d] || 0; out.push({d, v}); }
  return out;
}
function balanceChart(F) {
  const dc = F.out, ser = balanceSeries(F);
  if (!ser.length) { bal = null; return `<p class="empty">${L("Cette période commence après la dernière opération.")}</p>`; }
  let lo = Math.min(...ser.map(p => p.v)), hi = Math.max(...ser.map(p => p.v));
  const minP = ser.find(p => p.v === lo), maxP = ser.find(p => p.v === hi);
  if (hi === lo) { hi += 10000; lo -= 10000; } const padv = (hi - lo) * .1; lo -= padv; hi += padv;
  const X0 = 42, W = 288, Y0 = 10, H = 104, n = ser.length;
  const x = i => n === 1 ? X0 + W / 2 : X0 + i / (n - 1) * W, y = v => Y0 + H - (v - lo) / (hi - lo) * H;
  const pts = ser.map((p, i) => x(i).toFixed(1) + "," + y(p.v).toFixed(1)).join(" ");
  const e = ser[n - 1], diff = e.v - ser.start;
  bal = {ser, X0, W, Y0, H, lo, hi, cur: dc};
  return `<h2 class="sr">${L("Évolution du solde")}</h2>
  <p class="sr">${L("Du ")}${longDate(ser[0].d)}${L(" au ")}${longDate(e.d)}${L(" : solde de départ ")}${say(ser.start, dc)}${L(", solde final ")}${say(e.v, dc)}${L(", soit une variation de ")}${diff < 0 ? L("moins") : L("plus")} ${say(Math.abs(diff), dc)}${L(". Le plus bas : ")}${say(minP.v, dc)}${L(" le ")}${longDate(minP.d)}${L(". Le plus haut : ")}${say(maxP.v, dc)}${L(" le ")}${longDate(maxP.d)}.</p>
  <div id="bal-cap" class="cap" aria-live="polite"><span>${L("Solde au ")}${dm(e.d)}</span><b class="num">${fmt(e.v, dc)}</b></div>
  ${zoomWrap(`<svg class="chart" id="bal" viewBox="0 0 340 140" aria-hidden="true">
    ${[0, .5, 1].map(k => { const v = lo + (hi - lo) * k; return `<line class="grid" x1="${X0}" x2="${X0 + W}" y1="${y(v)}" y2="${y(v)}"/><text x="${X0 - 5}" y="${y(v) + 3}" text-anchor="end">${compact(v)}</text>`; }).join("")}
    ${lo < 0 && hi > 0 ? `<line x1="${X0}" x2="${X0 + W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-dasharray="3 3"/>` : ""}
    ${n > 1 ? `<polygon points="${X0},${Y0 + H} ${pts} ${X0 + W},${Y0 + H}" fill="var(--s1)" opacity=".12" class="area"/><path class="line" pathLength="1" d="M${pts.split(" ").join(" L")}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    <line id="bal-x" y1="${Y0}" y2="${Y0 + H}" x1="${x(n - 1)}" x2="${x(n - 1)}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/>
    <circle id="bal-dot" cx="${x(n - 1)}" cy="${y(e.v)}" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${X0}" y="${Y0 + H + 16}">${dm(ser[0].d)}</text><text x="${X0 + W}" y="${Y0 + H + 16}" text-anchor="end">${dm(e.d)}</text>
    <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="transparent"/>
  </svg>`)}
  <div class="f inline"><span id="bal-date-lab">${L("Lire le solde au")}</span>${dateInput("bal-date", e.d, {min: ser[0].d, max: e.d})}</div>
  <small class="hint" aria-hidden="true">${L("Variation sur la période : ")}<b class="num">${diff < 0 ? "−" : "+"}${fmt(Math.abs(diff), dc)}</b>${L(". Touchez la courbe pour lire le solde à une date, pincez pour zoomer.")}</small>`;
}
function balShow(i) {
  if (!bal) return; const n = bal.ser.length, p = bal.ser[i];
  const px = n === 1 ? bal.X0 + bal.W / 2 : bal.X0 + i / (n - 1) * bal.W, py = bal.Y0 + bal.H - (p.v - bal.lo) / (bal.hi - bal.lo) * bal.H;
  const l = document.getElementById("bal-x"), d = document.getElementById("bal-dot"); if (!l) return;
  l.setAttribute("x1", px); l.setAttribute("x2", px); l.setAttribute("visibility", "visible"); d.setAttribute("cx", px); d.setAttribute("cy", py);
  document.getElementById("bal-cap").innerHTML = `<span>${L("Solde au ")}${dm(p.d)}</span><b class="num">${fmt(p.v, bal.cur)}</b>`;
}
function balHover(e) {
  if (!bal) return; const svg = document.getElementById("bal"); if (!svg) return;
  const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * 340, n = bal.ser.length;
  balShow(Math.max(0, Math.min(n - 1, Math.round((vx - bal.X0) / bal.W * (n - 1)))));
}
function pieChart(sp, total, dc) {
  const segs = sp.slice(0, 8).map(([c, v]) => ({id: c, v, color: cat(c)?.color || "var(--other)"}));
  const rest = sp.slice(8).reduce((x, y) => x + y[1], 0); if (rest > 0) segs.push({v: rest, color: "var(--other)"});
  const R = 80, C = 2 * Math.PI * R; let off = 0;
  const arcs = segs.map((sg, k) => { const len = sg.v / total * C, gap = segs.length > 1 && len > 6 ? 2.5 : 0;
    const h = `<circle class="arc" style="--i:${k}" cx="110" cy="110" r="${R}" fill="none" stroke="${esc(sg.color)}" stroke-width="30" ${sg.id ? `data-act="cat-detail" data-id="${esc(sg.id)}"` : ""} stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(C - len + gap).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 110 110)"></circle>`; off += len; return h; }).join("");
  const word = statKind === "dep" ? L("dépensés") : L("reçus");
  return `<div class="donut">${zoomWrap(`<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="${R}" fill="none" stroke="var(--track)" stroke-width="30"/><g class="ring">${arcs}</g>
    <circle cx="110" cy="110" r="62" fill="var(--surface)" opacity=".55"/>
    <text x="110" y="110" text-anchor="middle" class="c1">${compact(total)}</text><text x="110" y="128" text-anchor="middle" class="c2">${esc(sym(dc))} ${word}</text><text x="110" y="143" text-anchor="middle" class="c2">${plur(sp.length, L("catégorie"), L("catégories"))}</text></svg>`)}</div>`;
}
function rankList(sp, tot, dc) {
  const top = sp.length ? sp[0][1] : 1;
  return `<ul class="rows">${sp.map(([c, v]) => { const n = catName(c), pc = Math.round(v / tot * 100), cc = cat(c); return `<li><button type="button" class="rank" data-act="cat-detail" data-id="${esc(c)}" style="--cc:${esc(cc?.color || "var(--s1)")}" aria-label="${esc(n + ", " + pc + " %, " + say(v, dc) + L(". Voir le détail"))}">${chipHtml(cc)}<span>${esc(n)} <small class="num">${pc} %</small></span><span class="amt">${fmt(v, dc)} <span class="chev" aria-hidden="true">›</span></span><span class="track"><i style="width:${Math.max(2, v / top * 100)}%"></i></span></button></li>`; }).join("")}</ul>`;
}
function vStats() {
  const F = statF(), dc = F.out, word = plural(dc), f = flowsBetween(range.from, range.to, F), net = f.rev - f.dep;
  const tot = statKind === "dep" ? f.dep : f.rev, sp = Object.entries(f.byTop[statKind]).sort((a, b) => b[1] - a[1]), top = sp.length ? sp[0][1] : 1;
  const conv1 = F.ids.some(id => acc(id).cur !== dc);
  let ms = []; for (let m = range.from.slice(0, 7); m <= range.to.slice(0, 7) && ms.length < 600; m = shiftMonth(m, 1)) ms.push(m);
  const cut = ms.length > 12; if (cut) ms = ms.slice(-12);
  const data = ms.map(m => flowsBetween(m + "-01" < range.from ? range.from : m + "-01", lastDay(m) > range.to ? range.to : lastDay(m), F));
  const max = niceMax(Math.max(...data.map(d => Math.max(d.rev, d.dep)))), X0 = 36, W = 300, Y0 = 12, H = 120, gw = W / ms.length, bw = Math.max(4, Math.min(14, gw / 2 - 3));
  const y = v => Y0 + H - v / max * H;
  const svg = `<svg class="chart" viewBox="0 0 340 158" aria-hidden="true">
    ${[0, .5, 1].map(k => `<line class="grid" x1="${X0}" x2="${X0 + W}" y1="${y(max * k)}" y2="${y(max * k)}"/><text x="${X0 - 5}" y="${y(max * k) + 3}" text-anchor="end">${compact(max * k)}</text>`).join("")}
    ${data.map((d, i) => { const gx = X0 + i * gw; return `<g class="m" data-act="pick-month" data-m="${ms[i]}"><rect x="${gx}" y="${Y0 - 6}" width="${gw}" height="${H + 26}" fill="transparent"/><path d="${barPath(gx + gw / 2 - bw - 1, y(d.rev), bw, d.rev / max * H)}" fill="var(--s1)" class="bar" style="--i:${i}"/><path d="${barPath(gx + gw / 2 + 1, y(d.dep), bw, d.dep / max * H)}" fill="var(--s2)" class="bar" style="--i:${i}"/><text x="${gx + gw / 2}" y="${Y0 + H + 14}" text-anchor="middle">${monthName(ms[i], true)}</text></g>`; }).join("")}
  </svg>`;
  const tiles = `<div class="tiles"><div class="tile"><small>${L("Revenus")}</small><b>${NF.format(f.rev / 100)}<span>${esc(sym(dc))}</span></b></div><div class="tile"><small>${L("Dépenses")}</small><b>${NF.format(f.dep / 100)}<span>${esc(sym(dc))}</span></b></div><div class="tile"><small>${L("Solde")}</small><b>${net < 0 ? "−" : "+"}${NF.format(Math.abs(net) / 100)}<span>${esc(sym(dc))}</span></b></div></div>`;
  const V = [["cat", L("Catégories")], ["bal", L("Solde")], ["months", L("Par mois")], ["more", L("Analyse")]];
  let body;
  if (statView === "cat") body = `<div class="sec-h" style="align-items:center;margin-bottom:-4px;flex-wrap:wrap"><h2>${L("Par catégorie")}</h2>
      <div class="filters"><div class="seg" role="group" aria-label="${L("Dépenses ou revenus")}"><button type="button" data-act="statkind" data-v="dep" aria-pressed="${statKind === "dep"}">${L("Dépenses")}</button><button type="button" data-act="statkind" data-v="rev" aria-pressed="${statKind === "rev"}">${L("Revenus")}</button></div>
      <div class="seg" role="group" aria-label="${L("Type de graphique")}"><button type="button" data-act="catview" data-v="bars" aria-pressed="${catView === "bars"}">${L("Barres")}</button><button type="button" data-act="catview" data-v="pie" aria-pressed="${catView === "pie"}">${L("Camembert")}</button></div></div></div>
    <div class="card">${!sp.length ? `<p class="empty">${statKind === "dep" ? L("Aucune dépense") : L("Aucun revenu")}${L(" sur cette période pour ces comptes.")}</p>` : (catView === "pie" ? pieChart(sp.filter(x => x[1] > 0), sp.reduce((z, x) => z + Math.max(0, x[1]), 0) || 1, dc) : "") + rankList(sp, tot, dc) + `<small class="hint" aria-hidden="true">${L("Touchez une catégorie pour voir ses sous-catégories et ses opérations.")}</small>`}</div>`;
  else if (statView === "bal") body = `<div class="card">${balanceChart(F)}</div>`;
  else if (statView === "more") body = insights(F, f, dc);
  else body = `<h2 class="sr">${L("Revenus et dépenses par mois")}</h2><div class="card"><div class="legend" aria-hidden="true"><span><i style="background:var(--s1)"></i>${L("Revenus")}</span><span><i style="background:var(--s2)"></i>${L("Dépenses")}</span></div>${zoomWrap(svg)}
      <table class="mini"><caption class="sr">${L("Revenus, dépenses et solde par mois, en ")}${esc(word)}</caption><thead><tr><th scope="col">${L("Mois")}</th><th scope="col">${L("Revenus")}</th><th scope="col">${L("Dépenses")}</th><th scope="col">${L("Solde")}</th></tr></thead><tbody>${ms.map((m, i) => `<tr><th scope="row"><button type="button" class="linkbtn" data-act="pick-month" data-m="${m}" aria-label="${esc(monthName(m))}${L(", limiter la période à ce mois")}">${monthName(m, true)}${ms.length > 1 && m.slice(5) === "01" || i === 0 ? " " + m.slice(0, 4) : ""}</button></th><td>${NF.format(data[i].rev / 100)}</td><td>${NF.format(data[i].dep / 100)}</td><td>${NF.format((data[i].rev - data[i].dep) / 100)}</td></tr>`).join("")}</tbody></table>
      <small class="hint">${L("Choisissez un mois pour limiter la période à ce mois.")}${cut ? L(" Seuls les 12 derniers mois de la période sont affichés.") : ""}</small></div>`;
  const al = statAccLabel(F);
  return `<div class="bar-line"><button type="button" class="period" data-act="period" aria-label="${esc(L("Période : ") + presetLabel() + L(", du ") + longDate(range.from) + L(" au ") + longDate(range.to) + L(". Changer"))}"><b>${esc(presetLabel())}</b><small>${dm(range.from)} – ${dm(range.to)}</small><span aria-hidden="true">▾</span></button>
      <button type="button" class="period" data-act="stat-accs" aria-label="${esc(L("Comptes : ") + al + L(". Changer"))}"><b>${esc(al)}</b><small>${plur(F.ids.length, L("compte"), L("comptes"))} · ${esc(sym(dc))}</small><span aria-hidden="true">▾</span></button></div>
    ${conv1 ? `<p class="hint">${L("Montants convertis en")} ${esc(word)} ${L("au cours saisi dans les Réglages.")}</p>` : ""}
    <h2 class="sr">${L("Résumé de la période, en ")}${esc(word)}</h2>${tiles}
    <a class="pill-btn bil-link" href="#bilan"><span aria-hidden="true">📄</span> ${L("Bilan du mois imprimable")}<span aria-hidden="true" style="margin-inline-start:auto">›</span></a>
    <div class="seg wide" role="group" aria-label="${L("Vue")}">${V.map(([k, l]) => `<button type="button" data-act="statview" data-v="${k}" aria-pressed="${statView === k}">${l}</button>`).join("")}</div>
    ${body}`;
}

/* ---------- comptes et réglages ---------- */
function vComptes() {
  return banner() + `<h2 class="sr">${L("Mes comptes")}</h2>
    <ul class="card rows cats accs">${accSorted().map((a, i, all) => `<li data-acc="${esc(a.id)}"><div class="cat-line"><button type="button" class="row" data-act="edit-acc" data-id="${esc(a.id)}" aria-label="${esc(a.name + L(", solde ") + say(balance(a), a.cur) + L(", solde de départ ") + say(a.initial, a.cur) + L(". Modifier"))}">${accChip(a)}<span class="t"><b>${esc(a.name)}</b><small>${L("Solde de départ ")}${fmt(a.initial, a.cur)}</small></span><span class="amt">${fmt(balance(a), a.cur)}</span></button><button type="button" class="drag" data-drag="${esc(a.id)}" data-act="grip-acc" data-id="${esc(a.id)}" aria-label="${esc(L("Déplacer") + " " + a.name + ", " + L("Position") + " " + (i + 1) + " / " + all.length + ". " + L("Activez pour changer l'ordre"))}">${GRIP}</button></div></li>`).join("")}</ul>
    ${S.meta.accounts.length > 1 ? `<p class="hint">${L("Faites glisser la poignée ")}<span aria-hidden="true">⋮⋮</span>${L(" pour changer l'ordre des comptes. Les comptes en évidence sur l'Accueil restent en tête des listes.")}</p>` : ""}
    <button type="button" class="btn ghost" data-act="new-acc">${L("Ajouter un compte")}</button>
    <p class="hint">${L("Devises, catégories, apparence et sauvegarde se règlent avec la roue dentée en haut à droite. ")}<a class="link" href="#reglages">${L("Ouvrir les réglages")}</a></p>`;
}
function vReglages() {
  const nc = S.meta.categories.length, nr = S.meta.recurring.length, ncur = S.meta.currencies.length;
  const item = (h, e, t, d) => `<li><a href="#${h}"><span class="chip emo" aria-hidden="true"><span class="e">${e}</span></span><span><b>${t}</b><small>${d}</small></span><span class="chev" aria-hidden="true">›</span></a></li>`;
  return `<ul class="card plain menu">
    ${item("devises", "💱", L("Devises et cours"), `${plur(ncur, L("devise"), L("devises"))}${L(", référence : ")}${esc(L(curOf(base()).name))}`)}
    ${item("categories", "🏷️", L("Catégories"), `${plur(nc, L("catégorie"), L("catégories"))}${L(", sous-catégories, icônes et couleurs")}`)}
    ${item("recurrentes", "🔁", L("Opérations récurrentes"), plur(nr, L("récurrence"), L("récurrences")))}
    ${item("modeles", "⚡", L("Modèles d'opérations"), plur(TPL().length, L("modèle"), L("modèles")) + L(" pour la saisie rapide"))}
    ${item("apparence", "🎨", L("Apparence"), `${L("Thème ")}${P.mode === "auto" ? L("automatique") : P.mode === "dark" ? L("sombre") : L("clair")}${L(", couleurs ")}${esc((THEMES[P.accent] || THEMES.sapin).name)}`)}
    ${item("verrouillage", "🔒", L("Verrouillage"), LOCK() ? L("Code activé") + (P.lock.bio ? " · Face ID" : "") : L("Désactivé"))}
    ${item("donnees", "💾", L("Sauvegarde et import"), L("Fichier de sauvegarde, import et export CSV"))}
  </ul>`;
}
function setBase(code) {
  const obj = S.meta.currencies.find(x => x.code === code); if (!obj || code === base()) return;
  const old = clone(S.meta.currencies), ob = base(), r = obj.rate; S.meta.currencies.forEach(x => x.rate = x.rate / r); obj.rate = 1; S.meta.base = code;
  touch("meta"); render(); toastUndo(L("Devise de référence : ") + L(obj.name), () => { S.meta.currencies = old; S.meta.base = ob; touch("meta"); render(); announce(L("Modification annulée")); });
}
function vDevises() {
  const b = base();
  return backLink("reglages") + `<div class="card"><label class="f"><span>${L("Devise de référence")}</span><select id="base-cur">${curOpts(b)}</select></label></div><p class="hint">${L("Devise de référence : ")}${esc(L(curOf(b).name))}${L(". Les cours servent à convertir les totaux et à proposer le montant reçu lors d'un virement entre devises. Cours saisis le ")}${dm(S.meta.ratesDate)}.</p>
    <ul class="card rows">${S.meta.currencies.map(c => { const isB = c.code === b, rt = "1 " + c.sym + " = " + NF4.format(c.rate) + " " + sym(b);
      return `<li><button type="button" class="row" data-act="edit-cur" data-c="${esc(c.code)}" aria-label="${esc(c.name + ", " + (isB ? L("devise de référence") : "1 " + c.name + L(" vaut ") + NF4.format(c.rate) + " " + plural(b)) + L(". Modifier"))}"><span class="chip" aria-hidden="true">${esc(c.sym)}</span><span class="t"><b>${esc(c.name)}</b><small>${esc(c.code)}${isB ? L(" · devise de référence") : ""}</small></span><span class="amt">${isB ? L("Référence") : esc(rt)}</span></button></li>`; }).join("")}</ul>
    <button type="button" class="btn ghost" data-act="new-cur">${L("Ajouter une devise")}</button>`;
}
const GRIP = `<svg viewBox="0 0 20 20"><circle cx="7" cy="5" r="1.6"/><circle cx="13" cy="5" r="1.6"/><circle cx="7" cy="10" r="1.6"/><circle cx="13" cy="10" r="1.6"/><circle cx="7" cy="15" r="1.6"/><circle cx="13" cy="15" r="1.6"/></svg>`;
function vCategories() {
  const counts = {}; allTx().forEach(t => { if (t.cat) counts[t.cat] = (counts[t.cat] || 0) + 1; });
  const row = (c, sub) => { const n = counts[c.id] || 0, k = kids(c.id).length;
    const info = [k ? plur(k, L("sous-catégorie"), L("sous-catégories")) : "", plur(n, L("opération"), L("opérations"))].filter(Boolean).join(" · ");
    return `<button type="button" class="row" data-act="edit-cat" data-id="${esc(c.id)}" aria-label="${esc((sub ? L("Sous-catégorie ") : "") + c.name + ", " + info + L(". Modifier"))}">${chipHtml(c)}<span class="t"><b>${esc(c.name)}</b><small>${esc(info)}</small></span><span></span></button>`; };
  const grip = (c, i, n) => `<button type="button" class="drag" data-drag="${esc(c.id)}" data-act="grip" data-id="${esc(c.id)}" aria-label="${esc(L("Déplacer") + " " + c.name + ", " + L("Position") + " " + (i + 1) + " / " + n + ". " + L("Activez pour changer l'ordre"))}">${GRIP}</button>`;
  const tops = cats(catKind).filter(c => !c.parent);
  return backLink("reglages") + `<div class="seg wide" role="group" aria-label="${L("Type de catégorie")}"><button type="button" data-act="catkind" data-v="dep" aria-pressed="${catKind === "dep"}">${L("Dépenses")}</button><button type="button" data-act="catkind" data-v="rev" aria-pressed="${catKind === "rev"}">${L("Revenus")}</button></div>
    <ul class="card rows cats">${tops.length ? tops.map((c, i) => { const ks = kids(c.id); return `<li data-cat="${esc(c.id)}"><div class="cat-line">${row(c)}${grip(c, i, tops.length)}</div>${ks.length ? `<ul class="sub" aria-label="${esc(L("Sous-catégories de ") + c.name)}">${ks.map((k, j) => `<li data-cat="${esc(k.id)}"><div class="cat-line">${row(k, true)}${grip(k, j, ks.length)}</div></li>`).join("")}</ul>` : ""}</li>`; }).join("") : `<li class="empty">${L("Aucune catégorie.")}</li>`}</ul>
    <button type="button" class="btn" data-act="new-cat" data-k="${catKind}">${L("Nouvelle catégorie ")}${catKind === "dep" ? L("de dépense") : L("de revenu")}</button>
    <p class="hint">${L("Faites glisser la poignée ")}<span aria-hidden="true">⋮⋮</span>${L(" pour changer l'ordre des catégories : cet ordre est repris dans les listes de choix. Ouvrez une catégorie pour changer son icône, sa couleur dans les graphiques, lui ajouter des sous-catégories ou la fusionner avec une autre.")}</p>`;
}
function vApparence() {
  const radio = (name, v, label, cur) => `<label><input type="radio" name="${name}" id="${name}-${v}" value="${v}" ${cur === v ? "checked" : ""}><span>${label}</span></label>`;
  return backLink("reglages") + `<form class="card" style="display:flex;flex-direction:column;gap:16px" onsubmit="return false">
    <fieldset><legend>${L("Langue")}</legend><div class="seg wide">${radio("plang", "fr", '<bdi lang="fr">Français</bdi>', LANG)}${radio("plang", "en", '<bdi lang="en">English</bdi>', LANG)}${radio("plang", "ar", '<bdi lang="ar">العربية</bdi>', LANG)}</div>
      <small class="hint">${L("Le changement de langue recharge l'appli. Les noms que vous avez saisis (comptes, catégories, notes) ne sont pas traduits.")}</small></fieldset>
    <fieldset><legend>${L("Thème")}</legend><div class="seg wide">${radio("pmode", "auto", L("Automatique"), P.mode)}${radio("pmode", "light", L("Clair"), P.mode)}${radio("pmode", "dark", L("Sombre"), P.mode)}</div>
      <small class="hint">${L("Automatique suit le réglage de votre téléphone ou de l'application Claude.")}</small></fieldset>
    <fieldset><legend>${L("Style")}</legend><div class="seg wide">${radio("pstyle", "classic", L("Classique"), P.style || "classic")}${radio("pstyle", "glass", L("Verre liquide"), P.style || "classic")}</div>
      <small class="hint">${L("Verre liquide : panneaux translucides et flous sur un fond coloré.")}</small></fieldset>
    <fieldset><legend>${L("Couleurs")}</legend><div class="swatches">${Object.entries(THEMES).map(([k, t]) => `<label><input type="radio" name="paccent" id="paccent-${k}" value="${k}" ${P.accent === k ? "checked" : ""}><span class="dot" style="--c:${t.l[0]}" aria-hidden="true"></span><span>${t.name}</span></label>`).join("")}</div></fieldset>
    <fieldset><legend>${L("Zoom")}</legend><label class="check"><input type="checkbox" id="pzoom" ${P.zoom ? "checked" : ""} aria-describedby="zoom-hint"><span>${L("Autoriser le zoom de toute la page")}</span></label>
      <small class="hint" id="zoom-hint" style="margin-top:0">${L("Désactivé, seuls les graphiques s'agrandissent (pincer, ou boutons + et −). Activez-le si vous avez besoin d'agrandir le texte. Dans l'application Claude, c'est elle qui décide du zoom de la page.")}</small></fieldset>
  </form>`;
}
function vDonnees() {
  const where = demo ? L("Mode exemple : rien n'est enregistré.") : syncState === "cloud" ? L("Vos données sont enregistrées sur cet appareil et dans votre compte Claude, en privé ; elles vous suivent sur vos appareils.") : syncState === "error" ? L("La dernière sauvegarde en ligne a échoué. Vos données restent sur cet appareil ; elles seront renvoyées à la prochaine modification.") : syncState === "toolarge" ? L("Vos données sont trop volumineuses pour la sauvegarde en ligne, souvent à cause des images de catégories. Elles restent sur cet appareil.") : L("Vos données sont enregistrées sur cet appareil uniquement.");
  return backLink("reglages") + `<div class="card"><p style="margin:0;font-size:14px;color:var(--ink-2)">${where}</p></div>
    <h2 class="sec-h">${L("Sauvegarde sur l'appareil")}</h2>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <p class="hint">${L("Un fichier de sauvegarde contient tout : comptes, opérations, catégories, budgets, prêts et récurrences. Gardez-le en lieu sûr pour restaurer vos données sur un autre appareil ou après une erreur.")}</p>
      <p style="margin:0;font-size:13px">${L("Dernière sauvegarde : ")}<b>${P.lastBackup ? longDate(P.lastBackup) : L("jamais")}</b></p>
      ${canCloud() ? `<button type="button" class="btn" data-act="cloud-backup">${L("Enregistrer dans")} ${cloudName()}…</button>
      <p class="hint">${IS_APPLE ? L("La première fois, choisissez « Enregistrer dans Fichiers », puis iCloud Drive, et créez un dossier Floussi. Les fois suivantes, l'iPhone repropose ce dossier.") : L("Choisissez l'application de stockage où garder le fichier.")}</p>` : ""}
      <button type="button" class="btn${canCloud() ? " ghost" : ""}" data-act="backup">${L("Enregistrer une sauvegarde sur l'appareil")}</button>
      <label class="check"><input type="checkbox" id="pdaily" ${P.daily ? "checked" : ""} aria-describedby="daily-hint"><span><b>${L("Rappel de sauvegarde quotidienne")}</b></span></label>
      <small class="hint" id="daily-hint" style="margin-top:-4px">${L("Chaque jour où vous ouvrez Floussi, l'Accueil propose d'enregistrer la sauvegarde en un geste. Une appli web ne peut pas écrire seule dans iCloud : votre confirmation reste nécessaire.")}</small>
      <label class="filebtn"><input type="file" id="backup-file" accept=".json,application/json"><span class="btn ghost">${L("Restaurer une sauvegarde (fichier .json)…")}</span></label>
    </div>
    <h2 class="sec-h">${L("Sauvegardes automatiques")}</h2>
    <div class="card" style="display:flex;flex-direction:column;gap:8px">
      ${NATIVE ? `<p class="hint"><b>${L("Copie quotidienne dans Fichiers")}</b> : ${IS_APPLE ? L("chaque jour, Floussi range une sauvegarde complète dans l'app Fichiers › Sur mon iPhone › Floussi (14 derniers jours). Elle est aussi incluse dans la sauvegarde iCloud de l'iPhone.") : L("chaque jour, Floussi range une sauvegarde complète dans le dossier Documents › Floussi du téléphone (14 derniers jours). Copiez-la de temps en temps sur Drive ou un ordinateur.")}${P.autoDoc ? " " + L("Dernière copie : ") + longDate(P.autoDoc) + "." : ""}</p>` : ""}
      <p class="hint">${L("Floussi garde une copie de vos données par jour sur cet appareil, pendant 10 jours, en plus de la copie principale. Une mise à jour de l'appli n'efface pas vos données.")}</p>
      ${snaps.length ? `<ul class="rows">${snaps.slice().reverse().map(d => `<li class="row"><span class="chip emo" aria-hidden="true"><span class="e">🕘</span></span><span class="t"><b>${esc(cap1(longDate(d)))}</b></span><button type="button" class="btn ghost sm" data-act="snap-restore" data-d="${d}" aria-label="${esc(L("Restaurer la copie du") + " " + longDate(d))}">${L("Restaurer")}</button></li>`).join("")}</ul>` : `<p class="empty" style="padding:8px">${L("Aucune copie pour l'instant.")}</p>`}
    </div>
    <h2 class="sec-h">${L("Importer et exporter")}</h2>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <label class="filebtn"><input type="file" id="csv-file" accept=".csv,text/csv,text/plain"><span class="btn">${L("Importer un fichier CSV…")}</span></label><p class="hint">${L("Relevé bancaire, export Excel ou d'une autre appli : vous indiquerez ensuite à quoi correspond chaque colonne.")}</p>
      <button type="button" class="btn ghost" data-act="export">${L("Exporter les opérations (CSV pour Excel)")}</button>
    </div>
    ${demo ? "" : `<h2 class="sec-h">${L("Zone sensible")}</h2><button type="button" class="btn danger" data-act="reset">${L("Tout effacer")}</button>`}`;
}
