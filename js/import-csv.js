"use strict";
/* ================= import CSV ================= */
function decodeText(buf) { try { return new TextDecoder("utf-8", {fatal: true}).decode(buf); } catch (e) { return new TextDecoder("windows-1252").decode(buf); } }
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] || "", delim = [";", ",", "\t"].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += ch;
  }
  row.push(f); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function parseDate(s) {
  s = String(s || "").trim(); let m, y, mo, d;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) [y, mo, d] = [m[1], m[2], m[3]];
  else if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/))) [y, mo, d] = [m[3].length === 2 ? "20" + m[3] : m[3], m[2], m[1]];
  else return null;
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
  return y + "-" + pad(+mo) + "-" + pad(+d);
}
function parseLoose(s) {
  s = String(s || "").replace(/−/g, "-").replace(/[^\d,.\-]/g, "");
  if (!s || s === "-") return NaN;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const v = parseFloat(s); return isFinite(v) ? Math.round(v * 100) : NaN;
}
const norm = s => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const IMP_FIELDS = [["date", L("Date"), true], ["amt", L("Montant (ou débit)"), true], ["credit", L("Crédit, si colonne séparée")], ["type", L("Type d'opération")], ["cat", L("Catégorie")], ["note", L("Libellé ou note")], ["acc", L("Compte")]];
function guessMap(h) {
  const n = h.map(norm), find = re => n.findIndex(x => re.test(x));
  const m = {date: find(/date|تاريخ/), amt: find(/^montant$|montant|amount|somme|debit|المبلغ|مدين/), credit: find(/^credit|دائن/), type: find(/^type|النوع/), cat: find(/categor|الفئة/), note: find(/^note$|libelle|description|label|motif|^operation|البيان|ملاحظة/), acc: find(/^compte$|^account$|^الحساب$/),
    dest: find(/compte de destination|destination|المستقبل/), amtTo: find(/montant recu|received|المستلم/)};
  if (m.credit >= 0 && m.amt === m.credit) m.amt = find(/debit/);
  if (m.note < 0) m.note = find(/note/);
  return m;
}
function openImport(rows) {
  const firstIsHead = !rows[0].some(c => parseDate(c));
  impCtx = {rows, head: firstIsHead, map: null, sens: "sign", acc: S.meta.accounts[0]?.id || "", create: true};
  const h = firstIsHead ? rows[0] : rows[0].map((_, i) => L("Colonne ") + (i + 1));
  impCtx.map = firstIsHead ? guessMap(h) : {date: rows[0].findIndex(c => parseDate(c)), amt: rows[0].findIndex(c => !parseDate(c) && !isNaN(parseLoose(c))), credit: -1, type: -1, cat: -1, note: -1, acc: -1, dest: -1, amtTo: -1};
  renderImport();
}
function impHeaders() { const r = impCtx.rows[0]; return impCtx.head ? r.map((c, i) => c.trim() || L("Colonne ") + (i + 1)) : r.map((_, i) => L("Colonne ") + (i + 1) + L(" (ex. : ") + (r[i] || "").trim().slice(0, 18) + ")"); }
function renderImport() {
  const h = impHeaders(), m = impCtx.map;
  const sel = (k, label, req) => `<label class="f"><span>${label}${req ? "" : " (facultatif)"}</span><select id="imp-${k}">${req ? "" : `<option value="-1">${L("Aucune")}</option>`}${h.map((x, i) => `<option value="${i}" ${m[k] === i ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
  openSheet(head(L("Importer un fichier CSV")) + `<form novalidate>
    <p class="hint">${plur(impCtx.rows.length - (impCtx.head ? 1 : 0), L("ligne trouvée"), L("lignes trouvées"))}${L(". Indiquez à quoi correspond chaque colonne.")}</p>
    <label class="check"><input type="checkbox" id="imp-head" ${impCtx.head ? "checked" : ""}><span>${L("La première ligne contient les titres des colonnes")}</span></label>
    <fieldset class="boxed"><legend>${L("Colonnes du fichier")}</legend>${IMP_FIELDS.map(([k, l, r]) => sel(k, l, r)).join("")}</fieldset>
    <fieldset class="boxed"><legend>${L("Règles")}</legend>
      <label class="f"><span>${L("Sens des montants, sans colonne Type ni Crédit")}</span><select id="imp-sens"><option value="sign" ${impCtx.sens === "sign" ? "selected" : ""}>Négatif = dépense, positif = revenu</option><option value="dep" ${impCtx.sens === "dep" ? "selected" : ""}>${L("Tout est une dépense")}</option><option value="rev" ${impCtx.sens === "rev" ? "selected" : ""}>${L("Tout est un revenu")}</option></select></label>
      <label class="f"><span>${L("Compte à utiliser si la colonne Compte est vide ou inconnue")}</span><select id="imp-defacc">${accOpts(impCtx.acc)}</select></label>
      <label class="check"><input type="checkbox" id="imp-create" ${impCtx.create ? "checked" : ""}><span>${L("Créer les catégories inconnues")}</span></label></fieldset>
    <div id="imp-sum" class="boxed imp-prev" aria-live="polite">${impSummaryHtml()}</div>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="button" class="btn ghost" data-act="close">${L("Annuler")}</button><button type="submit" class="btn" id="imp-go">${L("Importer")}</button></div></form>`, doImport, "#sheet-title");
}
function readImport() {
  const g = id => document.getElementById(id);
  for (const [k] of IMP_FIELDS) { const e = g("imp-" + k); if (e) impCtx.map[k] = +e.value; }
  impCtx.sens = g("imp-sens").value; impCtx.acc = g("imp-defacc").value; impCtx.create = g("imp-create").checked;
}
function findAcc(name) { const n = norm(name); return n ? S.meta.accounts.find(a => norm(a.name) === n) : null; }
function findCat(label, kind) {
  const n = norm(label).replace(/\s*[›>\/:]\s*/g, " : ");
  return cats(kind).find(c => norm(catLabel(c.id)) === n) || cats(kind).find(c => norm(c.name) === n) || null;
}
function computeImport() {
  const {rows, head, map, sens, create} = impCtx, defAcc = acc(impCtx.acc);
  const have = new Set(allTx().map(t => [t.date, t.t, t.amt, t.acc, norm(t.note)].join("|")));
  const out = {ready: [], dup: 0, bad: 0, loans: 0, newCats: new Set(), unknownAcc: new Set()};
  rows.slice(head ? 1 : 0).forEach(row => {
    const g = k => map[k] >= 0 ? String(row[map[k]] ?? "").trim() : "";
    const date = parseDate(g("date")); if (!date) { out.bad++; return; }
    let t, amt;
    if (map.credit >= 0) {
      const deb = parseLoose(g("amt")), cre = parseLoose(g("credit"));
      if (!isNaN(cre) && cre) { t = "rev"; amt = Math.abs(cre); } else if (!isNaN(deb) && deb) { t = "dep"; amt = Math.abs(deb); } else { out.bad++; return; }
    } else {
      const v = parseLoose(g("amt")); if (isNaN(v) || !v) { out.bad++; return; }
      amt = Math.abs(v); const ty = norm(g("type"));
      if (/pret|emprunt|rembourse|loan|debt|repay|قرض|دين|سداد/.test(ty)) { out.loans++; return; }
      t = /virement|transfer|تحويل/.test(ty) ? "vir" : /depense|debit|expense|مصروف/.test(ty) ? "dep" : /revenu|credit|income|دخل/.test(ty) ? "rev" : sens === "sign" ? (v < 0 ? "dep" : "rev") : sens;
    }
    const an = g("acc"); let a = findAcc(an); if (!a) { if (an) out.unknownAcc.add(an); a = defAcc; }
    if (!a) { out.bad++; return; }
    const tx = {id: uid() + out.ready.length, t, amt, acc: a.id, cat: "", date, note: g("note")};
    if (t === "vir") {
      const b = findAcc(g("dest")); if (!b || b.id === a.id) { out.bad++; return; }
      tx.to = b.id; if (b.cur !== a.cur) { const r = parseLoose(g("amtTo")); tx.amtTo = isNaN(r) ? conv(amt, a.cur, b.cur) : Math.abs(r); }
    } else {
      const lab = g("cat"), c = lab ? findCat(lab, t) : null;
      if (c) tx.cat = c.id;
      else if (lab && create) { tx.cat = "new:" + t + ":" + lab; out.newCats.add(lab); }
      else { const fb = cats(t).find(x => /divers|autres/i.test(x.name)) || cats(t)[0]; tx.cat = fb ? fb.id : ""; }
    }
    if (have.has([date, t, amt, a.id, norm(tx.note)].join("|"))) { out.dup++; return; }
    out.ready.push(tx);
  });
  return out;
}
function impSummaryHtml() {
  const r = computeImport(), n = r.ready.length;
  const extra = [r.dup ? plur(r.dup, L("doublon déjà présent ignoré"), L("doublons déjà présents ignorés")) : "", r.bad ? plur(r.bad, L("ligne illisible ignorée"), L("lignes illisibles ignorées")) : "", r.loans ? plur(r.loans, L("ligne de prêt ignorée"), L("lignes de prêt ignorées")) : "",
    r.newCats.size ? plur(r.newCats.size, L("catégorie à créer"), L("catégories à créer")) : "", r.unknownAcc.size ? plur(r.unknownAcc.size, L("compte inconnu remplacé par le compte choisi"), L("comptes inconnus remplacés par le compte choisi")) : ""].filter(Boolean);
  const ex = r.ready.slice(0, 3).map(t => { const a = acc(t.acc); return `<li><span>${dm(t.date)} · ${esc(t.note || (t.t === "vir" ? L("Virement") : t.cat.startsWith("new:") ? t.cat.split(":").slice(2).join(":") : catLabel(t.cat)))}</span><b class="num">${t.t === "rev" ? "+" : t.t === "dep" ? "−" : ""}${fmt(t.amt, a.cur)}</b></li>`; }).join("");
  return `<b>${n ? plur(n, L("opération prête à importer"), L("opérations prêtes à importer")) : L("Aucune opération lisible avec ces réglages.")}</b>${extra.length ? `<span>${esc(extra.join(", "))}.</span>` : ""}${ex ? `<span class="hint" style="margin:0">${L("Aperçu :")}</span><ul class="plain imp-prev">${ex}</ul>` : ""}`;
}
function doImport() {
  readImport(); const r = computeImport();
  if (!r.ready.length) return err(L("Aucune opération à importer. Vérifiez la colonne de la date et celle du montant."), "imp-date");
  const made = {}, ch = new Set();
  for (const t of r.ready) {
    if (t.cat.startsWith("new:")) {
      const [, kind, ...rest] = t.cat.split(":"), lab = rest.join(":");
      if (!made[t.cat]) {
        const parts = lab.split(/\s*[›>\/:]\s*/).filter(Boolean); let parent = "";
        if (parts.length > 1) { let p = cats(kind).find(c => !c.parent && norm(c.name) === norm(parts[0])); if (!p) { p = {id: (kind === "dep" ? "c-" : "r-") + uid(), kind, name: parts[0], parent: "", icon: "📦", color: COLORS[S.meta.categories.length % COLORS.length][0]}; S.meta.categories.push(p); } parent = p.id; }
        const nc = {id: (kind === "dep" ? "c-" : "r-") + uid(), kind, name: parts[parts.length - 1], parent, icon: "📦", color: parent ? cat(parent).color : COLORS[S.meta.categories.length % COLORS.length][0]};
        S.meta.categories.push(nc); made[t.cat] = nc.id; ch.add("meta");
      }
      t.cat = made[t.cat];
    }
    putTx(t).forEach(i => ch.add(i));
  }
  touch(...ch); closeSheet(); render();
  toast(plur(r.ready.length, L("opération importée"), L("opérations importées")) + (r.dup ? ", " + plur(r.dup, L("doublon ignoré"), L("doublons ignorés")) : ""));
}
