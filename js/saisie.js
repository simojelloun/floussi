"use strict";
/* ================= fenêtres de saisie ================= */
let onSubmit = null, draft = null, opener = null, moveCtx = null, catDraft = null, impCtx = null;
function openSheet(html, submit, focusSel) {
  const w = $("#wrap");
  if (w.hidden) opener = focusKey(document.activeElement);
  $("#sheet").innerHTML = html; enhanceSelects($("#sheet")); w.hidden = false; $("#app").inert = true; onSubmit = submit; $("#sheet").scrollTop = 0;
  const t0 = (focusSel && $("#sheet").querySelector(focusSel)) || $("#sheet").querySelector("input:not([type=radio]):not([type=checkbox]):not([type=file]),select") || $("#sheet-title");
  const t = t0.tagName === "SELECT" && t0._pk ? t0._pk : t0;
  t.focus();
}
function closeSheet() {
  if ($("#wrap").hidden) return;
  if (typeof proRestoreSheet === "function" && proRestoreSheet()) return;
  $("#wrap").hidden = true; $("#sheet").innerHTML = ""; $("#app").inert = false; onSubmit = null; draft = null; moveCtx = null; catDraft = null; impCtx = null;
  const el = opener && document.querySelector(opener); (el || $("#title")).focus(); opener = null;
}
const head = t => `<h2 id="sheet-title" tabindex="-1">${t}<button type="button" data-act="close" aria-label="${L("Fermer")}">×</button></h2>`;
function err(m, fieldId) {
  const e = $("#f-err"); if (e) e.textContent = m;
  $("#sheet").querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
  const f00 = fieldId && document.getElementById(fieldId), f0 = f00 && f00.hasAttribute("data-nopk") ? (document.getElementById(fieldId + "-btn") || $("#f-amt")) : f00, f = f0 && f0._pk ? f0._pk : f0;
  if (f) { f.setAttribute("aria-invalid", "true"); const d = (f.getAttribute("aria-describedby") || "").split(" ").filter(x => x && x !== "f-err"); d.push("f-err"); f.setAttribute("aria-describedby", d.join(" ")); f.focus(); }
  else if (e) announce(m);
}
function confirmSheet(msg, label, fn) {
  openSheet(head(L("Confirmer")) + `<p style="margin:0;color:var(--ink-2)">${esc(msg)}</p><form><div class="actions"><button type="button" class="btn ghost" data-act="close">${L("Annuler")}</button><button type="submit" class="btn danger">${esc(label)}</button></div></form>`, () => { closeSheet(); undoSnap = clone(S); fn(); }, "#sheet-title");
}
let undoSnap = null;
function toastDel(m) {
  const snap = undoSnap; undoSnap = null; if (!snap) return toast(m);
  toastUndo(m, () => { S = snap; if (!demo) touch(...docIds()); render(); announce(L("Suppression annulée")); });
}
const accSorted = () => [...S.meta.accounts].sort((a, b) => (b.pin !== false) - (a.pin !== false));
const accOpts = (sel, list) => (list || accSorted()).map(a => `<option value="${esc(a.id)}" ${a.id === sel ? "selected" : ""}>${esc(a.name)} (${esc(sym(a.cur))})</option>`).join("");
/* devises du monde proposées à la création d'un compte ou d'une devise (nom et symbole donnés par le téléphone, dans la langue de l'appli) */
const hasCur = c => S.meta.currencies.some(x => x.code === c);
const WORLD_CUR = "MAD EUR USD GBP CHF CAD AUD NZD JPY CNY INR PKR BDT IDR MYR SGD HKD KRW THB PHP VND TRY RUB UAH PLN CZK HUF RON BGN SEK NOK DKK ISK DZD TND EGP LYD MRU SDG SAR AED QAR KWD BHD OMR JOD LBP SYP IQD YER ILS IRR XOF XAF NGN GHS KES ZAR ETB MXN BRL ARS CLP COP PEN".split(" ");
function curInfo(code) {
  let name = code, sym = code;
  try { name = new Intl.DisplayNames([LOCALE], {type: "currency"}).of(code) || code; } catch (e) {}
  try { sym = (new Intl.NumberFormat(LOCALE, {style: "currency", currency: code, currencyDisplay: "narrowSymbol"}).formatToParts(1).find(p => p.type === "currency") || {}).value || code; } catch (e) {}
  return {code, name: name.charAt(0).toUpperCase() + name.slice(1), plural: name.toLowerCase(), sym: sym.slice(0, 4)};
}
const worldOthers = () => WORLD_CUR.filter(c => !hasCur(c)).map(curInfo).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
/* liste « mes devises » puis « autres devises » : en choisir une autre l'ajoute à l'enregistrement */
const curOptsAll = sel => `<optgroup label="${esc(L("Mes devises"))}">${curOpts(sel)}</optgroup><optgroup label="${esc(L("Autres devises"))}">${worldOthers().map(c => `<option value="${c.code}">${esc(c.name)} (${esc(c.code)})</option>`).join("")}</optgroup>`;
document.addEventListener("change", e => {
  if (e.target.id === "f-cur") { const w = document.getElementById("f-newrate-w"); if (w) { w.hidden = hasCur(e.target.value); if (!w.hidden) { const i = curInfo(e.target.value); document.getElementById("f-newrate-l").textContent = L("Valeur de 1") + " " + i.plural + " " + L("en") + " " + plural(base()); } } }
  if (e.target.id === "f-pick" && e.target.value) { const i = curInfo(e.target.value); $("#f-code").value = i.code; $("#f-name").value = i.name; $("#f-plural").value = i.plural; $("#f-sym").value = i.sym; $("#f-rate").focus(); }
});
const curOpts = sel => S.meta.currencies.map(c => `<option value="${esc(c.code)}" ${c.code === sel ? "selected" : ""}>${esc(c.name)} (${esc(c.sym)})</option>`).join("");
const radios = (name, legend, opts, sel, vis) => `<fieldset class="f"><legend class="${vis ? "" : "sr"}">${legend}</legend><div class="seg">${opts.map(([k, l]) => `<label><input type="radio" name="${name}" id="f-${name}-${k}" value="${k}" ${sel === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>`;
const freqSelect = (sel, withNone) => `<select id="f-rep">${withNone ? `<option value="none" ${sel === "none" ? "selected" : ""}>${L("Jamais")}</option>` : ""}${FREQS.map(([k, l]) => `<option value="${k}" ${sel === k ? "selected" : ""}>${l}</option>`).join("")}</select>`;

/* ---------- opérations (et modèles de récurrence) ---------- */
function catTiles(d) {
  const tops = cats(d.t).filter(c => !c.parent), selTop = topOf(d.cat), sc = cat(d.cat);
  return `<div class="ctiles" role="radiogroup" aria-labelledby="f-cat-lab">${tops.map(c => { const k = kids(c.id).length, on = c.id === selTop, sub = on && sc && sc.parent ? sc.name : "";
    return `<button type="button" class="ctile" role="radio" aria-checked="${on}" data-act="cat-tile" data-id="${esc(c.id)}" tabindex="${on ? 0 : -1}" aria-label="${esc(c.name + (sub ? " : " + sub : "") + (k ? ", " + plur(k, L("sous-catégorie"), L("sous-catégories")) : ""))}">${chipHtml(c)}<span class="cn">${esc(c.name)}</span>${sub ? `<small>${esc(sub)}</small>` : k ? `<small aria-hidden="true">${k} ›</small>` : ""}</button>`; }).join("")}</div>`;
}
function accPills(d) {
  if (S.meta.accounts.length < 2) return "";
  return `<div class="f"><span id="f-acc-lab">${L("Compte")}</span><div class="apills" role="radiogroup" aria-labelledby="f-acc-lab">${accSorted().map(a => `<button type="button" class="apill" role="radio" aria-checked="${a.id === d.acc}" tabindex="${a.id === d.acc ? 0 : -1}" data-act="acc-pill" data-id="${esc(a.id)}" style="--ac:${esc(a.color || "var(--accent)")}" aria-label="${esc(a.name + ", " + L(curOf(a.cur).name))}"><span class="ad" aria-hidden="true"></span>${esc(a.name)}<small>${esc(sym(a.cur))}</small></button>`).join("")}</div></div>`;
}
function dateQuick(d) {
  const t0 = today(), y1 = addDays(t0, -1);
  return `<div class="dq" role="group" aria-labelledby="f-date-lab"><button type="button" class="pill-btn" data-act="date-q" data-d="${t0}" aria-pressed="${d.date === t0}">${L("Aujourd'hui")}</button><button type="button" class="pill-btn" data-act="date-q" data-d="${y1}" aria-pressed="${d.date === y1}">${L("Hier")}</button>${dateInput("f-date", esc(d.date), {})}</div>`;
}
function setDateField(id, v) {
  const inp = document.getElementById(id); if (!inp) return; inp.value = v;
  const sp = document.getElementById(id + "-val"); if (sp) sp.textContent = dateLbl(id, v);
  document.querySelectorAll(`[data-act="date-q"]`).forEach(b => b.setAttribute("aria-pressed", b.dataset.d === v));
}
/* ---------- opérations (et modèles de récurrence) ---------- */
function catBtn(d) {
  const c = cat(d.cat), p = c && c.parent && cat(c.parent);
  return `<button type="button" class="fv" id="f-cat-btn" data-act="cat-open" aria-haspopup="listbox" aria-label="${esc(L("Catégorie") + " : " + catLabel(d.cat) + ". " + L("Changer"))}">${c ? chipHtml(c) : ""}<span class="fvt">${p ? `<small>${esc(p.name)}</small>` : ""}${esc(c ? c.name : L("Choisir"))}</span><span class="chev" aria-hidden="true">›</span></button>`;
}
/* ---------- opérations (et modèles de récurrence) ---------- */
function renderTx(focusId) {
  const d = draft, isRec = d.kind === "rec", a = acc(d.acc), b = acc(d.to), cross = d.t === "vir" && a && b && a.cur !== b.cur;
  if (cross && d.autoTo !== false) { const v = parseAmt(d.amtS); d.amtToS = v > 0 ? plain(conv(v, a.cur, b.cur)) : ""; }
  const SPL = !isRec && d.split && d.t !== "vir";
  const showRep = (isRec || !d.rec) && !SPL, repOn = isRec || d.rep !== "none";
  const title = isRec ? (d.id ? L("Modifier la récurrence") : L("Nouvelle opération récurrente")) : d.id ? L("Modifier l'opération") : L("Nouvelle opération");
  const tplRow = !d.id && !isRec && TPL().length ? `<div class="filters scroll tpls" role="group" aria-label="${esc(L("Modèles"))}">${tplChips("tpl-use")}</div>` : "";
  const known = allTags().filter(g => !parseTags(d.tagsS).includes(g)).slice(0, 8);
  const rd = !isRec && recDateOf(d), rr = rd && recOf(d.rec);
  const moreOpen = !isRec && (SPL || !!parseTags(d.tagsS).length || !!d.photo || d.moreOpen);
  const repDetail = showRep && repOn ? `<div class="fgrp sub">
      ${radios("mode", L("Enregistrement des échéances"), [["manual", L("Je la marque payée")], ["auto", L("Prélèvement automatique")]], d.mode, true)}
      <small class="hint" style="margin:0">${d.mode === "auto" ? L("Chaque échéance est enregistrée d'elle-même le jour venu, comme un prélèvement.") : L("Chaque échéance apparaît dans le calendrier et sur l'Accueil ; elle n'est comptée qu'une fois marquée « Payée ».")}</small>
      ${!isRec && !d.id && d.mode !== "auto" ? `<label class="check switch"><input type="checkbox" id="f-paid" ${(d.paidNow ?? d.date <= today()) ? "checked" : ""}><span>${L("L'échéance de cette date est déjà payée")}</span></label>` : ""}
      <div class="frow"><span class="fl" id="f-end-lab">${L("Jusqu'au")}</span>${dateInput("f-end", esc(d.end), {opt: true, placeholder: L("Sans fin")})}</div>
      ${isRec && d.id ? `<label class="check switch"><input type="checkbox" id="f-pause" ${d.paused ? "checked" : ""}><span>${L("Mettre en pause")}</span></label>` : ""}
    </div>` : "";
  openSheet(head(title) + `<form novalidate class="txf">${tplRow}
    ${rr ? `<div class="paid-box"><span><b>✓ ${paidW(rr)}</b> · ${L("échéance du ")}${esc(dm(rd))} (${esc(freqLabel(rr).toLowerCase())})</span><button type="button" class="btn sm ghost" data-act="rec-unpay" data-id="${esc(rr.id)}" data-d="${rd}" data-tx="${esc(d.id)}">${rr.t === "rev" ? L("Marquer non reçue") : L("Marquer impayée")}</button></div>` : ""}
    <fieldset class="f tsel"><legend class="sr">${L("Type d'opération")}</legend><div class="seg big">${[["dep", L("Dépense")], ["rev", L("Revenu")], ["vir", L("Virement")]].map(([k, l]) => `<label><input type="radio" name="t" id="f-t-${k}" value="${k}" ${d.t === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    ${SPL ? splitHtml(d) : `<div class="amt-hero t-${d.t}"><label for="f-amt" class="sr">${L("Montant")}${a ? " (" + esc(L(curOf(a.cur).name)) + ")" : ""}</label><span class="sgn" aria-hidden="true">${d.t === "rev" ? "+" : d.t === "dep" ? "−" : ""}</span><input class="amount-in" type="text" inputmode="decimal" id="f-amt" placeholder="0,00" value="${esc(d.amtS)}" autocomplete="off" enterkeyhint="done"><span class="amt-cur" aria-hidden="true">${a ? esc(sym(a.cur)) : ""}</span></div>
      ${!isRec && d.t !== "vir" ? `<div class="amt-tools">${signBtn("f-amt")}<small>${L("Montant négatif pour un remboursement")}</small></div>` : ""}`}
    <div class="fgrp">
      ${SPL ? "" : d.t !== "vir" ? `<div class="frow"><span class="fl" id="f-cat-lab">${L("Catégorie")}</span>${catBtn(d)}<select id="f-cat" hidden data-nopk aria-hidden="true" tabindex="-1">${catOpts(d.t, d.cat)}</select></div>
      <label class="frow"><span class="fl">${L("Compte")}</span><select id="f-acc">${accOpts(d.acc)}</select></label>`
      : `<label class="frow"><span class="fl">${L("Depuis")}</span><select id="f-acc" aria-label="${esc(L("Depuis le compte"))}">${accOpts(d.acc)}</select></label><label class="frow"><span class="fl">${L("Vers")}</span><select id="f-to" aria-label="${esc(L("Vers le compte"))}">${accOpts(d.to)}</select></label>
      ${cross ? `<label class="frow"><span class="fl">${L("Reçu")} (${esc(sym(b.cur))})</span><input class="fin" type="text" inputmode="decimal" id="f-amt-to" placeholder="0,00" value="${esc(d.amtToS)}" autocomplete="off" aria-describedby="rate-hint"></label>` : ""}`}
      <div class="frow"><span class="fl" id="f-date-lab">${isRec ? (d.id ? L("Prochaine échéance") : L("Première échéance")) : L("Date")}</span>${dateInput("f-date", esc(d.date), isRec ? {} : {time: d.time || ""})}</div>
      <label class="frow"><span class="fl">${L("Note")}</span><input class="fin" type="text" id="f-note" maxlength="80" placeholder="${esc(L("Ajouter une note"))}" value="${esc(d.note)}" autocomplete="off" enterkeyhint="done" aria-describedby="${isRec ? "" : "f-sug"}"></label>
      ${showRep ? `<label class="frow"><span class="fl"><span class="ricon" aria-hidden="true">↻</span>${isRec ? L("Fréquence") : L("Répéter")}</span>${freqSelect(d.rep, !isRec)}</label>` : rr || (d.rec && recOf(d.rec)) ? `<div class="frow"><span class="fl"><span class="ricon" aria-hidden="true">↻</span>${L("Répéter")}</span><button type="button" class="fv" data-act="edit-rec" data-id="${esc(d.rec)}"><span class="fvt">${esc(freqLabel(recOf(d.rec)))}</span><span class="chev" aria-hidden="true">›</span></button></div>` : ""}
    </div>
    ${cross ? `<small class="hint" id="rate-hint" style="margin:-6px 4px 0">${L("Calculé au cours 1 ")}${esc(sym(a.cur))} = ${NF4.format(curOf(a.cur).rate / curOf(b.cur).rate)} ${esc(sym(b.cur))}${L(". Modifiez-le si votre banque a appliqué un autre cours.")}</small>` : ""}
    ${!isRec && d.t !== "vir" ? `<div class="sugs" id="f-sug" role="group" aria-label="${esc(L("Libellés déjà utilisés"))}" hidden></div>` : ""}
    ${repDetail}
    ${!isRec ? `<details class="more" id="f-more" ${moreOpen ? "open" : ""}><summary>${L("Plus d'options")}<small>${L("Étiquettes, photo du ticket, répartition, modèle")}</small></summary><div class="more-b">
      ${d.t !== "vir" ? (r => d.split ? r : proLock(r, L("Répartir sur plusieurs catégories ou comptes"), "split"))(`<label class="check switch"><input type="checkbox" id="f-split" ${d.split ? "checked" : ""}><span>${L("Répartir sur plusieurs catégories ou comptes")}</span></label>`) : ""}
      ${(r => (d.tagsS || "").trim() ? r : proLock(r, L("Étiquettes"), "tags"))(`<div class="f"><label for="f-tags">${L("Étiquettes")}</label><input type="text" id="f-tags" maxlength="120" placeholder="${esc(L("Facultatif, par ex. Vacances, Travaux"))}" value="${esc(d.tagsS || "")}" autocomplete="off" aria-describedby="tags-hint">
        <small class="hint" id="tags-hint" style="margin:0">${L("Séparez les étiquettes par des virgules. Elles regroupent des dépenses de catégories différentes, par exemple tout un voyage.")}</small>
        ${known.length ? `<div class="filters scroll" role="group" aria-label="${esc(L("Étiquettes existantes"))}">${known.map(g => `<button type="button" class="pill-btn" data-act="tag-add" data-v="${esc(g)}" aria-label="${esc(L("Ajouter l'étiquette") + " " + g)}">+ #${esc(g)}</button>`).join("")}</div>` : ""}</div>`)}
      ${(r => d.photo ? r : proLock(r, "📷 " + L("Ajouter une photo du ticket"), "photo"))(`<div class="f"><span>${L("Photo du ticket")}</span><div id="ph-box">${phBox(d)}</div></div>`)}
      ${!SPL ? `<button type="button" class="link tpl-save" id="f-tpl" data-act="tpl-save">☆ ${L("Enregistrer comme modèle")}</button>` : ""}
      ${!d.id ? `<small class="hint" style="margin:0">${L("Pour un prêt ou un emprunt, utilisez l'onglet ")}<a class="link" href="#prets">${L("Prêts")}</a>${L(" : les remboursements y sont suivis.")}</small>` : ""}
    </div></details>` : ""}
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions sticky">${d.id ? `<button type="button" class="btn danger" data-act="${isRec ? "del-rec" : "del-tx"}">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, saveTx, focusId ? (focusId.startsWith("[") || focusId.startsWith(".") ? focusId : "#" + focusId) : null);
  if (!isRec && d.t !== "vir" && d.note && !d.id) updateSugs();
}
function readTx() {
  const d = draft, g = id => { const e = document.getElementById(id); return e ? e.value : undefined; };
  const t = document.querySelector('input[name="t"]:checked'); if (t) d.t = t.value;
  const md = document.querySelector('input[name="mode"]:checked'); if (md) d.mode = md.value;
  d.amtS = g("f-amt") ?? d.amtS; d.acc = g("f-acc") ?? d.acc; d.to = g("f-to") ?? d.to; d.amtToS = g("f-amt-to") ?? d.amtToS;
  d.cat = g("f-cat") ?? d.cat; d.date = g("f-date") ?? d.date; d.time = g("f-date-tm") ?? d.time; d.note = g("f-note") ?? d.note; d.tagsS = g("f-tags") ?? d.tagsS; d.rep = g("f-rep") ?? d.rep; d.end = g("f-end") ?? d.end;
  const rp = document.getElementById("f-repeat"); if (rp) { if (!rp.checked) { if (d.rep !== "none") d.lastRep = d.rep; d.rep = "none"; } else if (d.rep === "none") d.rep = d.lastRep || "m1"; }
  const p = document.getElementById("f-pause"); if (p) d.paused = p.checked;
  const pd = document.getElementById("f-paid"); if (pd) d.paidNow = pd.checked;
  const mo = document.getElementById("f-more"); if (mo) d.moreOpen = mo.open;
  if (d.t === "vir" && (!d.to || d.to === d.acc)) d.to = (S.meta.accounts.find(a => a.id !== d.acc) || {}).id || "";
  if (d.t !== "vir" && !cats(d.t).some(c => c.id === d.cat)) d.cat = (cats(d.t)[0] || {}).id || "";
  if (d.parts && document.getElementById("p-amt-0")) d.parts.forEach((pt, i) => { pt.amtS = g("p-amt-" + i) ?? pt.amtS; pt.cat = g("p-cat-" + i) ?? pt.cat; pt.acc = g("p-acc-" + i) ?? pt.acc; pt.pn = g("p-note-" + i) ?? pt.pn; });
  const sp = document.getElementById("f-split");
  if (sp && sp.checked && !d.split) { d.split = true; if (!d.parts || !d.parts.length) d.parts = [{amtS: d.amtS, cat: d.cat, acc: d.acc}]; }
  else if (sp && !sp.checked && d.split) { d.split = false; const p0 = d.parts[0]; d.amtS = p0.amtS; d.cat = p0.cat; d.acc = p0.acc; }
  if (d.parts && d.t !== "vir") d.parts.forEach(pt => { if (!cats(d.t).some(c => c.id === pt.cat)) pt.cat = (cats(d.t)[0] || {}).id || ""; });
}
function openTx(t, kind) {
  if (t && t.t === "pret" && t.dar) { darSel = t.dar; location.hash = "daret"; return; }
  if (t && t.t === "pret") { const l = loan(t.loan); if (l) return openMove(l, t.mv, t); }
  if (!S.meta.accounts.length) { toast(L("Créez d'abord un compte dans l'onglet Comptes.")); return; }
  draft = t ? {...t, kind: "tx", amtS: plain(t.amt), amtToS: t.amtTo != null ? plain(t.amtTo) : "", autoTo: t.amtTo != null ? false : undefined, rep: "none", mode: "manual", end: "", tagsS: tagsOf(t).join(", "), catTouched: true}
    : {kind: "tx", t: kind || "dep", amtS: "", acc: accSorted()[0].id, to: "", cat: (cats(kind || "dep")[0] || {}).id || "", date: today(), time: "", note: "", amtToS: "", rep: "none", mode: "manual", end: "", tagsS: ""};
  draft.photo = null; draft.photoOld = null; draft.phKey = "";
  if (t && t.ph) { const k = phKeyOf(t); draft.phKey = k; if (PHOTOS[k]) draft.photo = draft.photoOld = PHOTOS[k];
    else IDB.get("ph-" + k).then(v => { if (v && draft && draft.phKey === k && !draft.photo) { PHOTOS[k] = v; draft.photo = draft.photoOld = v; const b = $("#ph-box"); if (b) b.innerHTML = phBox(draft); } }); }
  if (t && t.grp) { const g = allTx().filter(x => x.grp === t.grp); if (g.length > 1) { draft.split = true; draft.parts = g.map(x => ({amtS: plain(x.amt), cat: x.cat, acc: x.acc, pn: x.pn || ""})); } }
  renderTx();
}
function openRec(r) {
  if (!S.meta.accounts.length) { toast(L("Créez d'abord un compte dans l'onglet Comptes.")); return; }
  draft = r ? {kind: "rec", id: r.id, t: r.t, amtS: plain(r.amt), acc: r.acc, to: r.to || "", cat: r.cat, date: nextOcc(r) || occ(r, r.k), note: r.note, amtToS: r.amtTo != null ? plain(r.amtTo) : "", autoTo: r.amtTo != null ? false : undefined, rep: freqKey(r), mode: r.mode, end: r.end || "", paused: !!r.paused, tagsS: tagsOf(r).join(", "), catTouched: true}
    : {kind: "rec", t: "dep", amtS: "", acc: accSorted()[0].id, to: "", cat: (cats("dep")[0] || {}).id || "", date: today(), note: "", amtToS: "", rep: "m1", mode: "manual", end: "", tagsS: ""};
  renderTx();
}
function removeTx(id) { for (const m of Object.keys(S.months)) { const i = S.months[m].items.findIndex(x => x.id === id); if (i >= 0) { S.months[m].items.splice(i, 1); return m; } } return null; }
function putTx(t, oldId) {
  const ids = new Set(), old = oldId ? removeTx(oldId) : null; if (old) ids.add("tx-" + old);
  const ym = t.date.slice(0, 7); (S.months[ym] = S.months[ym] || {items: [], updatedAt: 0}).items.push(t); ids.add("tx-" + ym);
  return [...ids];
}
function saveTx() {
  readTx(); if (draft.kind !== "rec" && draft.split && draft.t !== "vir") return saveSplit(draft);
  const d = draft, isRec = d.kind === "rec", a = acc(d.acc), b = acc(d.to), amt = parseAmt(d.amtS);
  if (!(amt > 0) && !(amt < 0 && !isRec && d.t !== "vir")) return err(L("Saisissez un montant supérieur à zéro, par exemple 125,50."), "f-amt");
  if (!a) return err(L("Choisissez un compte."), "f-acc");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return err(L("Choisissez une date."), "f-date");
  const base0 = {t: d.t, amt, acc: d.acc, cat: "", note: d.note.trim()}, tg = parseTags(d.tagsS); if (tg.length) base0.tags = tg;
  const hm = !isRec && okHM(d.time) ? {time: d.time} : {};
  const bud0 = budSnap(d.date.slice(0, 7));
  if (d.t === "vir") {
    if (!b || b.id === a.id) return err(L("Choisissez deux comptes différents pour le virement."), "f-to");
    base0.to = b.id;
    if (a.cur !== b.cur) { const r = parseAmt(d.amtToS); if (!(r > 0)) return err(L("Indiquez le montant reçu en ") + sym(b.cur) + L(" : les deux comptes n'ont pas la même devise."), "f-amt-to"); base0.amtTo = r; }
  } else base0.cat = d.cat;
  const repOn = isRec || d.rep !== "none";
  if (repOn && d.end && d.end < d.date) return err(L("La dernière échéance doit être après la première."), "f-end");
  const mkRec = (id, start, k) => ({id, ...base0, unit: d.rep[0], every: +d.rep.slice(1), start, end: d.end || "", k, mode: d.mode, paused: !!d.paused});
  if (isRec) {
    const r = mkRec(d.id || "rc-" + uid(), d.date, 0);
    if (d.id) { const i = S.meta.recurring.findIndex(x => x.id === d.id), o = S.meta.recurring[i]; if (o.skip) r.skip = o.skip; if (o.open) r.open = o.open; S.meta.recurring[i] = r; } else S.meta.recurring.push(r);
    recAdvance(r);
    touch("meta"); genie(closeSheet); const n = runAuto(true); render();
    return toast((d.id ? L("Récurrence modifiée") : L("Récurrence créée")) + (n ? ". " + plur(n, L("échéance ajoutée"), L("échéances ajoutées")) : ""));
  }
  const ids = [], ph = d.photo ? {ph: 1} : {}; let sid;
  /* opération répartie ramenée à une seule ligne (case « Répartir » décochée, ou passage en virement) :
     les autres lignes du groupe sont retirées, sinon elles resteraient comptées en plus */
  if (d.id && d.grp) allTx().filter(t => t.grp === d.grp && t.id !== d.id).map(t => t.id).forEach(id => { const m = removeTx(id); if (m) ids.push("tx-" + m); });
  if (d.id && repOn && !d.rec) {
    const r = mkRec("rc-" + uid(), d.date, 1); S.meta.recurring.push(r);
    sid = d.id; ids.push("meta", ...putTx({...base0, ...ph, ...hm, id: d.id, date: d.date, rec: r.id}, d.id));
  }
  else if (d.id) { const t = {...base0, ...ph, ...hm, id: d.id, date: d.date}; if (d.rec) t.rec = d.rec; sid = d.id; ids.push(...putTx(t, d.id)); }
  else if (repOn) {
    const paid = d.paidNow ?? (d.date <= today()), r = mkRec("rc-" + uid(), d.date, paid ? 1 : 0); S.meta.recurring.push(r);
    if (paid) { const t = {...recTx(r, d.date), ...ph, ...hm}; sid = t.id; ids.push("meta", ...putTx(t)); } else ids.push("meta");
  } else { sid = uid(); ids.push(...putTx({...base0, ...ph, ...hm, id: sid, date: d.date})); }
  if (sid) phSave(d, sid);
  touch(...ids); genie(closeSheet); month = d.date.slice(0, 7); showInOps(d.date); const n = repOn ? runAuto(true) : 0; render();
  const ba = budAlert(bud0, d.date.slice(0, 7));
  if (repOn && !sid) return toast(L("Récurrence créée : l'échéance du ") + longDate(d.date) + L(" est à marquer « Payée » le moment venu."));
  toast((d.id && !repOn ? L("Opération modifiée") : repOn ? L("Opération ajoutée et répétée ") + freqLabel({unit: d.rep[0], every: +d.rep.slice(1)}).toLowerCase() + (n ? ". " + plur(n, L("échéance passée ajoutée"), L("échéances passées ajoutées")) : "") : L("Opération ajoutée")) + ba);
}

/* ---------- prêts ---------- */
function openNewLoan() {
  if (!S.meta.accounts.length) return toast(L("Créez d'abord un compte dans l'onglet Comptes."));
  openSheet(head(L("Nouveau prêt ou emprunt")) + `<form novalidate>
    ${radios("k", L("Type"), [["lent", L("J'ai prêté")], ["borrowed", L("J'ai emprunté")]], "lent")}
    <label class="f"><span>${L("Personne ou organisme")}</span><input type="text" id="f-person" maxlength="40" autocomplete="off" placeholder="${L("Par exemple : Youssef, banque")}"></label>
    <label class="f"><span>${L("Montant")}</span><input class="amount-in" type="text" inputmode="decimal" id="f-amt" placeholder="0,00" autocomplete="off"></label>
    <label class="f"><span id="f-acc-lab">${L("Compte d'où sort l'argent")}</span><select id="f-acc">${accOpts(accSorted()[0].id)}</select></label>
    <div class="f2"><div class="f"><span id="f-date-lab">${L("Date")}</span>${dateInput("f-date", today(), {})}</div>
    <div class="f"><span id="f-due-lab">${L("Échéance (facultative)")}</span>${dateInput("f-due", "", {opt: true})}</div></div>
    <label class="f"><span>${L("Note")}</span><input type="text" id="f-note" maxlength="80" placeholder="${L("Facultatif")}"></label>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const kind = document.querySelector('input[name="k"]:checked').value, person = $("#f-person").value.trim(), amt = parseAmt($("#f-amt").value), a = acc($("#f-acc").value), date = $("#f-date").value;
    if (!person) return err(L("Indiquez à qui vous avez prêté ou auprès de qui vous avez emprunté."), "f-person");
    if (!(amt > 0)) return err(L("Saisissez un montant supérieur à zéro."), "f-amt");
    if (!a) return err(L("Choisissez un compte."), "f-acc");
    if (!date) return err(L("Choisissez une date."), "f-date");
    const l = {id: "l-" + uid(), kind, person, cur: a.cur, due: $("#f-due").value || "", note: $("#f-note").value.trim()};
    S.meta.loans.push(l);
    touch("meta", ...putTx({id: uid(), t: "pret", loan: l.id, mv: "base", dir: kind === "lent" ? "out" : "in", amt, acc: a.id, cat: "", date, note: ""}));
    closeSheet(); loanFilter = "open"; if (tab !== "prets") location.hash = "prets"; else render();
    toast(kind === "lent" ? L("Prêt à ") + person + L(" enregistré") : L("Emprunt auprès de ") + person + L(" enregistré"));
  }, "#f-person");
}
function openLoanDetail(id) {
  const l = loan(id); if (!l) return;
  const s = loanState(l), lent = l.kind === "lent", items = s.items.slice().sort((a, b) => b.date.localeCompare(a.date));
  openSheet(head(esc(l.person)) + `<p style="margin:0;color:var(--ink-2)">${lent ? L("Vous avez prêté de l'argent") : L("Vous avez emprunté de l'argent")}${l.note ? " · " + esc(l.note) : ""}</p>
    <div class="card"><dl class="kv">
      <div><dt>${lent ? L("Montant prêté") : L("Montant emprunté")}</dt><dd>${fmt(s.principal, l.cur)}</dd></div>
      <div><dt>${L("Déjà remboursé")}</dt><dd>${fmt(s.repaid, l.cur)}</dd></div>
      <div class="strong"><dt>${L("Reste à rembourser")}</dt><dd>${fmt(Math.max(0, s.rest), l.cur)}</dd></div>
      ${l.due ? `<div><dt>${L("Échéance")}</dt><dd>${longDate(l.due)}${!s.done && l.due < today() ? L(" (en retard)") : ""}</dd></div>` : ""}</dl>
      <div class="track" style="margin-top:10px" aria-hidden="true"><i style="width:${s.principal ? Math.min(100, s.repaid / s.principal * 100) : 0}%;background:var(--accent)"></i></div></div>
    <div class="actions">${s.done ? "" : `<button type="button" class="btn" data-act="move" data-id="${esc(l.id)}" data-mv="remb">${lent ? L("Enregistrer un remboursement reçu") : L("Enregistrer un remboursement")}</button>`}
      <button type="button" class="btn ghost" data-act="move" data-id="${esc(l.id)}" data-mv="base">${lent ? L("Prêter un montant de plus") : L("Emprunter un montant de plus")}</button></div>
    <h3 class="day" style="padding-top:2px"><span>${L("Historique")}</span></h3>
    <div class="card"><ul class="rows">${items.map(t => txRow(t, true)).join("")}</ul></div>
    <button type="button" class="btn ghost" data-act="edit-loan" data-id="${esc(l.id)}">${L("Modifier ou supprimer ")}${lent ? L("ce prêt") : L("cet emprunt")}</button>`, null, "#sheet-title");
}
function openMove(l, mv, t) {
  const lent = l.kind === "lent", s = loanState(l), accs = S.meta.accounts.filter(a => a.cur === l.cur);
  if (!accs.length) return toast(`${L("Aucun compte en ")}${plural(l.cur)}${L(". Créez-en un dans l'onglet Comptes.")}`);
  const dir = (mv === "base") === lent ? "out" : "in";
  const title = mv === "remb" ? (lent ? L("Remboursement reçu de ") : L("Remboursement à ")) + l.person : (lent ? L("Nouveau prêt à ") : L("Nouvel emprunt auprès de ")) + l.person;
  const restBefore = s.rest + (t && t.mv === "remb" ? t.amt : 0);
  moveCtx = {l, mv, t, dir};
  const pre = t ? plain(t.amt) : (mv === "remb" && s.rest > 0 ? plain(s.rest) : "");
  openSheet(head(esc(title)) + `<form novalidate>
    ${mv === "remb" ? `<p class="hint" id="rest-hint">${L("Reste à rembourser : ")}${fmt(Math.max(0, restBefore), l.cur)}${L(". Le montant est prérempli avec ce reste ; modifiez-le pour un remboursement partiel.")}</p>` : ""}
    <label class="f"><span>${L("Montant en ")}${esc(sym(l.cur))}</span><input class="amount-in" type="text" inputmode="decimal" id="f-amt" placeholder="0,00" value="${pre}" autocomplete="off" ${mv === "remb" ? `aria-describedby="rest-hint"` : ""}></label>
    <label class="f"><span>${dir === "out" ? L("Payé depuis le compte") : L("Reçu sur le compte")}</span><select id="f-acc">${accOpts(t ? t.acc : accs[0].id, accs)}</select></label>
    <div class="f2"><div class="f"><span id="f-date-lab">${L("Date")}</span>${dateInput("f-date", t ? t.date : today(), {})}</div>
    <label class="f"><span>${L("Note")}</span><input type="text" id="f-note" maxlength="80" placeholder="${L("Facultatif")}" value="${esc(t ? t.note : "")}"></label></div>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions">${t ? `<button type="button" class="btn danger" data-act="del-move">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const amt = parseAmt($("#f-amt").value), date = $("#f-date").value;
    if (!(amt > 0)) return err(L("Saisissez un montant supérieur à zéro."), "f-amt");
    if (!date) return err(L("Choisissez une date."), "f-date");
    const old = t ? t.amt : 0, principal = s.principal - (t && t.mv === "base" ? old : 0) + (mv === "base" ? amt : 0), repaid = s.repaid - (t && t.mv === "remb" ? old : 0) + (mv === "remb" ? amt : 0);
    if (repaid > principal) return err(mv === "remb" ? `${L("Ce remboursement dépasse le reste dû (")}${fmt(Math.max(0, restBefore), l.cur)}).` : L("Le montant total ne peut pas être inférieur à ce qui a déjà été remboursé."), "f-amt");
    touch(...putTx({id: t ? t.id : uid(), t: "pret", loan: l.id, mv, dir, amt, acc: $("#f-acc").value, cat: "", date, note: $("#f-note").value.trim()}, t && t.id));
    closeSheet(); render();
    const ns = loanState(l);
    toast(ns.done ? (lent ? l.person + L(" vous a tout remboursé") : L("Emprunt auprès de ") + l.person + L(" entièrement remboursé")) : L("Enregistré. Reste ") + say(ns.rest, l.cur) + L(" à rembourser"));
  }, "#f-amt");
}
function openLoanEdit(l) {
  openSheet(head(l.kind === "lent" ? L("Modifier le prêt") : L("Modifier l'emprunt")) + `<form novalidate>
    <label class="f"><span>${L("Personne ou organisme")}</span><input type="text" id="f-person" maxlength="40" value="${esc(l.person)}"></label>
    <div class="f"><span id="f-due-lab">${L("Échéance (facultative)")}</span>${dateInput("f-due", esc(l.due), {opt: true})}</div>
    <label class="f"><span>${L("Note")}</span><input type="text" id="f-note" maxlength="80" value="${esc(l.note)}"></label>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="button" class="btn danger" data-act="del-loan" data-id="${esc(l.id)}">${L("Supprimer")}</button><button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const p = $("#f-person").value.trim(); if (!p) return err(L("Indiquez un nom."), "f-person");
    l.person = p; l.due = $("#f-due").value || ""; l.note = $("#f-note").value.trim(); touch("meta"); closeSheet(); render(); toast(L("Modifications enregistrées"));
  });
}

/* ---------- comptes, budgets, devises ---------- */
function openAcc(a) {
  const used = a && allTx().some(t => t.acc === a.id || t.to === a.id);
  openSheet(head(a ? L("Modifier le compte") : L("Nouveau compte")) + `<form novalidate>
    <label class="f"><span>${L("Nom du compte")}</span><input type="text" id="f-name" maxlength="40" value="${esc(a ? a.name : "")}" placeholder="${L("Par exemple : Livret, CIH, Espèces")}"></label>
    <div class="f2"><label class="f"><span>${L("Devise")}</span><select id="f-cur" ${used ? `disabled aria-describedby="cur-lock"` : ""}>${used ? curOpts(a.cur) : curOptsAll(a ? a.cur : base())}</select></label>
    <label class="f"><span>${L("Solde de départ")}</span><input type="text" inputmode="decimal" id="f-init" value="${a ? plain(a.initial) : ""}" placeholder="0,00"></label></div>
    <div id="f-newrate-w" hidden><label class="f"><span id="f-newrate-l"></span><input type="text" inputmode="decimal" id="f-newrate" placeholder="${L("Par exemple : 12,45")}" aria-describedby="f-newrate-h"></label><small class="hint" id="f-newrate-h" style="margin:0">${L("Cette devise sera ajoutée à vos devises. Son cours reste modifiable dans Réglages › Devises.")}</small></div>
    ${used ? `<small class="hint" id="cur-lock" style="margin:0">${L("La devise ne peut plus changer : ce compte contient déjà des opérations.")}</small>` : ""}
    <fieldset><legend>${L("Couleur du compte")}</legend><div class="swatches">${COLORS.map(([h, n]) => `<label><input type="radio" name="acolor" value="${h}" ${(a ? a.color : COLORS[(S.meta.accounts.length * 3) % COLORS.length][0]) === h ? "checked" : ""}><span class="dot" style="--c:${h}" aria-hidden="true"></span><span class="sr">${n}</span></label>`).join("")}</div></fieldset>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions">${a ? `<button type="button" class="btn danger" data-act="del-acc" data-id="${esc(a.id)}">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const name = $("#f-name").value.trim(), init = $("#f-init").value.trim() === "" ? 0 : parseAmt($("#f-init").value);
    if (!name) return err(L("Donnez un nom au compte."), "f-name");
    if (isNaN(init)) return err(L("Le solde de départ doit être un nombre, par exemple 1500,00."), "f-init");
    const color = (document.querySelector('input[name="acolor"]:checked') || {}).value || COLORS[0][0];
    const cc = used ? a.cur : $("#f-cur").value;
    if (!hasCur(cc)) { /* devise pas encore dans l'appli : on l'ajoute avec le cours saisi */
      const rate = parseNum($("#f-newrate").value); if (!(rate > 0)) return err(L("Saisissez un cours supérieur à zéro, par exemple 12,45."), "f-newrate");
      if (overLimit("cur", S.meta.currencies.length)) return;
      S.meta.currencies.push({...curInfo(cc), rate}); S.meta.ratesDate = today();
    }
    if (a) { a.name = name; a.initial = init; a.color = color; if (!used) a.cur = $("#f-cur").value; }
    else S.meta.accounts.push({id: "a-" + uid(), name, cur: $("#f-cur").value, initial: init, color});
    touch("meta"); closeSheet(); render(); toast(a ? L("Compte modifié") : L("Compte ajouté"));
  });
}
function openBudget(b) {
  const bc = b ? b.cur : cur;
  openSheet(head(b ? L("Modifier le budget") : L("Nouveau budget")) + `<form novalidate>
    <label class="f"><span>${L("Catégorie")}</span><select id="f-cat">${catOpts("dep", b ? b.cat : "")}</select></label>
    <div class="f2"><label class="f"><span>${L("Plafond par mois")}</span><input type="text" inputmode="decimal" id="f-lim" value="${b ? plain(b.limit) : ""}" placeholder="0,00"></label>
    <label class="f"><span>${L("Devise")}</span><select id="f-cur">${curOpts(bc)}</select></label></div>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions">${b ? `<button type="button" class="btn danger" data-act="del-budget" data-id="${esc(b.id)}">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const lim = parseAmt($("#f-lim").value), c = $("#f-cat").value, k = $("#f-cur").value;
    if (!(lim > 0)) return err(L("Saisissez un plafond supérieur à zéro."), "f-lim");
    if (S.meta.budgets.some(x => x !== b && x.cat === c && x.cur === k)) return err(L("Un budget existe déjà pour cette catégorie dans cette devise. Modifiez-le plutôt."), "f-cat");
    if (b) Object.assign(b, {cat: c, cur: k, limit: lim}); else S.meta.budgets.push({id: "b-" + uid(), cat: c, cur: k, limit: lim});
    cur = k; touch("meta"); closeSheet(); render(); toast(b ? L("Budget modifié") : L("Budget ajouté"));
  });
}
const curUsed = code => S.meta.accounts.some(a => a.cur === code) || S.meta.budgets.some(b => b.cur === code) || S.meta.loans.some(l => l.cur === code);
function openCur(c) {
  const b = base(), isB = c && c.code === b;
  openSheet(head(c ? L("Modifier la devise ") + esc(c.name) : L("Nouvelle devise")) + `<form novalidate>
    ${c ? "" : `<label class="f"><span>${L("Choisir dans la liste")}</span><select id="f-pick"><option value="">${L("Autre devise (saisie libre)")}</option>${worldOthers().map(x => `<option value="${x.code}">${esc(x.name)} (${esc(x.code)})</option>`).join("")}</select></label>
    <label class="f"><span>${L("Code à trois lettres")}</span><input type="text" id="f-code" maxlength="3" autocomplete="off" placeholder="${L("Par exemple : GBP")}" style="text-transform:uppercase"></label>`}
    <div class="f2"><label class="f"><span>${L("Nom")}</span><input type="text" id="f-name" maxlength="30" value="${esc(c ? c.name : "")}" placeholder="${L("Livre sterling")}"></label>
    <label class="f"><span>${L("Nom au pluriel")}</span><input type="text" id="f-plural" maxlength="30" value="${esc(c ? c.plural : "")}" placeholder="${L("livres sterling")}" aria-describedby="plural-hint"></label></div>
    <small class="hint" id="plural-hint" style="margin:0">${L("Le pluriel sert à la lecture des montants par la synthèse vocale.")}</small>
    <label class="f"><span>${L("Symbole")}</span><input type="text" id="f-sym" maxlength="4" value="${esc(c ? c.sym : "")}" placeholder="£"></label>
    ${isB ? `<p class="hint">${L("C'est la devise de référence : les cours des autres devises sont exprimés en ")}${esc(plural(b))}.</p>` : `<label class="f"><span>${L("Valeur de 1 unité en ")}${esc(plural(b))}</span><input type="text" inputmode="decimal" id="f-rate" value="${c ? String(c.rate).replace(".", ",") : ""}" placeholder="${L("Par exemple : 12,45")}"></label>
    <label class="check"><input type="checkbox" id="f-base"> <span>${L("En faire la devise de référence")}</span></label>`}
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions">${c && !isB ? `<button type="button" class="btn danger" data-act="del-cur" data-c="${esc(c.code)}">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const code = c ? c.code : $("#f-code").value.trim().toUpperCase(), name = $("#f-name").value.trim(), pl = $("#f-plural").value.trim() || name.toLowerCase(), sy = $("#f-sym").value.trim() || code;
    if (!c) {
      if (!/^[A-Z]{3}$/.test(code)) return err(L("Le code doit contenir trois lettres, par exemple GBP."), "f-code");
      if (S.meta.currencies.some(x => x.code === code)) return err(L("Cette devise existe déjà."), "f-code");
    }
    if (!name) return err(L("Donnez un nom à la devise."), "f-name");
    let rate = 1;
    if (!isB) { rate = parseNum($("#f-rate").value); if (!(rate > 0)) return err(L("Saisissez un cours supérieur à zéro, par exemple 12,45."), "f-rate"); }
    const obj = c || {code}; Object.assign(obj, {name, plural: pl, sym: sy, rate: isB ? 1 : rate});
    if (!c) S.meta.currencies.push(obj);
    if (!isB && $("#f-base").checked) { const r = obj.rate; S.meta.currencies.forEach(x => x.rate = x.rate / r); obj.rate = 1; S.meta.base = obj.code; }
    S.meta.ratesDate = today(); touch("meta"); closeSheet(); render(); toast(c ? L("Devise modifiée") : L("Devise ajoutée"));
  });
}

/* ---------- catégories ---------- */
function openCat(c, kind, parentId) {
  kind = c ? c.kind : kind;
  catDraft = {img: c && c.img || "", icon: c ? c.icon : "📦", color: c ? c.color : (parentId && cat(parentId) ? cat(parentId).color : COLORS[S.meta.categories.length % COLORS.length][0])};
  const hasKids = c && kids(c.id).length, par = c ? c.parent : (parentId || "");
  const tops = cats(kind).filter(x => !x.parent && (!c || x.id !== c.id));
  let ici = 0; const icons = ICON_GROUPS.map(g => `<p class="ig" data-g="1">${esc(L(g[0]))}</p>` + g[1].map(([e, n]) => `<label data-n="${esc(norm(L(n) + " " + L(g[0])))}"><input type="radio" name="cicon" id="cicon-${ici++}" value="${e}" ${catDraft.icon === e ? "checked" : ""}><span aria-hidden="true">${ICON_SVG[e] ? svgIcon(e) : e}</span><span class="sr">${esc(L(n))}</span></label>`).join("")).join("");
  const title = c ? L("Modifier « ") + esc(c.name) + " »" : par ? L("Nouvelle sous-catégorie de ") + esc(cat(par).name) : kind === "dep" ? L("Nouvelle catégorie de dépense") : L("Nouvelle catégorie de revenu");
  openSheet(head(title) + `<form novalidate>
    <label class="f"><span>${L("Nom")}</span><input type="text" id="f-name" maxlength="30" value="${esc(c ? c.name : "")}"></label>
    <label class="f"><span>${L("Catégorie parente")}</span><select id="f-parent" ${hasKids ? `disabled aria-describedby="par-hint"` : ""}><option value="">${L("Aucune, c'est une catégorie principale")}</option>${tops.map(x => `<option value="${esc(x.id)}" ${x.id === par ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
    ${hasKids ? `<small class="hint" id="par-hint" style="margin:0">${L("Cette catégorie a des sous-catégories : elle reste une catégorie principale.")}</small>` : ""}
    <fieldset><legend>${L("Couleur dans les graphiques")}</legend><div class="swatches">${COLORS.map(([h, n]) => `<label><input type="radio" name="ccolor" value="${h}" ${catDraft.color === h ? "checked" : ""}><span class="dot" style="--c:${h}" aria-hidden="true"></span><span class="sr">${n}</span></label>`).join("")}</div></fieldset>
    <fieldset><legend>${L("Icône")}</legend><label class="f" style="margin-bottom:6px"><span class="sr">${L("Rechercher une icône")}</span><input type="search" id="icon-q" placeholder="${esc(L("Rechercher une icône"))}" autocomplete="off"></label><p class="sr" id="icon-n" aria-live="polite"></p><div class="icons" id="icons">${icons}<label data-n="image"><input type="radio" name="cicon" id="cicon-img" value="img" ${catDraft.icon === "img" ? "checked" : ""} ${catDraft.img ? "" : "disabled"}><span aria-hidden="true" id="img-prev">${catDraft.img ? `<img src="${esc(catDraft.img)}" alt="">` : "🖼️"}</span><span class="sr">${L("Image personnelle")}</span></label></div></fieldset>
    ${(r => catDraft.img ? r : proLock(r, L("Choisir une image (photo, logo)…"), "img"))(`<label class="filebtn"><input type="file" id="c-img" accept="image/*"><span class="btn ghost">${L("Choisir une image (photo, logo)…")}</span></label>`)}
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions">${c ? `<button type="button" class="btn danger" data-act="del-cat" data-id="${esc(c.id)}">${L("Supprimer")}</button>` : ""}<button type="submit" class="btn">${L("Enregistrer")}</button></div>
    ${c && !c.parent ? `<button type="button" class="btn ghost" data-act="new-subcat" data-id="${esc(c.id)}">${L("Ajouter une sous-catégorie à ")}${esc(c.name)}</button>` : ""}</form>`, () => {
    const name = $("#f-name").value.trim(); if (!name) return err(L("Donnez un nom à la catégorie."), "f-name");
    const ic = (document.querySelector('input[name="cicon"]:checked') || {}).value || "📦", co = (document.querySelector('input[name="ccolor"]:checked') || {}).value || catDraft.color;
    const parent = hasKids ? "" : $("#f-parent").value;
    const obj = c || {id: (kind === "dep" ? "c-" : "r-") + uid(), kind};
    Object.assign(obj, {name, parent, icon: ic, color: co});
    if (ic === "img" && catDraft.img) obj.img = catDraft.img; else delete obj.img;
    if (!c) S.meta.categories.push(obj);
    if (JSON.stringify(S.meta).length > 230000) { if (!c) S.meta.categories.pop(); else { obj.icon = "📦"; delete obj.img; } return err(L("Trop d'images enregistrées : choisissez plutôt une icône pour cette catégorie.")); }
    touch("meta"); closeSheet(); catKind = kind; render(); toast(c ? L("Catégorie modifiée") : L("Catégorie ajoutée"));
  });
}
async function toThumb(file) {
  const url = URL.createObjectURL(file), img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const s = 64, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d"), r = Math.max(s / img.width, s / img.height), w = img.width * r, h = img.height * r;
  g.drawImage(img, (s - w) / 2, (s - h) / 2, w, h); URL.revokeObjectURL(url);
  let d = cv.toDataURL("image/webp", .8); if (!d.startsWith("data:image/webp")) d = cv.toDataURL("image/jpeg", .82);
  return d;
}
function catUse(id) {
  const ops = allTx().filter(t => t.cat === id).length, recs = S.meta.recurring.filter(r => r.cat === id).length, buds = S.meta.budgets.filter(b => b.cat === id).length;
  return {ops, recs, buds, any: ops + recs + buds > 0};
}
function openCatDelete(c) {
  if (kids(c.id).length) return err(L("Supprimez ou déplacez d'abord ses sous-catégories (changez leur catégorie parente)."));
  const u = catUse(c.id);
  if (!u.any) return confirmSheet(`${L("Supprimer la catégorie « ")}${c.name} » ?`, L("Supprimer"), () => { S.meta.categories = S.meta.categories.filter(x => x.id !== c.id); touch("meta"); render(); toastDel(L("Catégorie supprimée")); });
  const others = cats(c.kind).filter(x => x.id !== c.id);
  if (!others.length) return err(L("C'est la seule catégorie de ce type : renommez-la plutôt."));
  const parts = [u.ops ? plur(u.ops, L("opération"), L("opérations")) : "", u.recs ? plur(u.recs, L("récurrence"), L("récurrences")) : "", u.buds ? plur(u.buds, L("budget"), L("budgets")) : ""].filter(Boolean).join(", ");
  openSheet(head(L("Supprimer « ") + esc(c.name) + " »") + `<form novalidate>
    <p style="margin:0;color:var(--ink-2)">${L("Cette catégorie est utilisée par ")}${esc(parts)}${L(". Choisissez la catégorie qui les recevra : c'est une fusion.")}</p>
    <label class="f"><span>${L("Déplacer vers")}</span><select id="f-target">${catOpts(c.kind, c.parent || "").replace(new RegExp(`<option value="${c.id}"[^<]*</option>`), "")}</select></label>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="button" class="btn ghost" data-act="close">${L("Annuler")}</button><button type="submit" class="btn danger">${L("Fusionner et supprimer")}</button></div></form>`, () => {
    const to = $("#f-target").value; if (!to || to === c.id) return err(L("Choisissez une autre catégorie."), "f-target"); undoSnap = clone(S);
    const ch = new Set(["meta"]);
    Object.entries(S.months).forEach(([m, d]) => d.items.forEach(t => { if (t.cat === c.id) { t.cat = to; ch.add("tx-" + m); } }));
    S.meta.recurring.forEach(r => { if (r.cat === c.id) r.cat = to; });
    S.meta.budgets = S.meta.budgets.filter(b => { if (b.cat !== c.id) return true; if (S.meta.budgets.some(x => x.cat === to && x.cur === b.cur)) return false; b.cat = to; return true; });
    S.meta.categories = S.meta.categories.filter(x => x.id !== c.id);
    touch(...ch); closeSheet(); render(); toastDel(`« ${c.name}${L(" » fusionnée dans « ")}${catLabel(to)} »`);
  }, "#f-target");
}

/* ---------- statistiques : fenêtres ---------- */
function openPeriod(target) {
  periodTarget = target === "ops" ? "ops" : "stats";
  const ops = periodTarget === "ops", R = ops ? opRange : range, PR = ops ? opPreset : preset;
  openSheet(head(ops ? L("Période des opérations") : L("Période des statistiques")) + `<div class="filters" role="group" aria-label="${L("Périodes prédéfinies")}">${PRESETS.map(([k, l]) => `<button type="button" class="pill-btn" data-act="preset" data-p="${k}" aria-pressed="${PR === k}">${l}</button>`).join("")}</div>
    <form novalidate><fieldset><legend>${L("Ou choisissez des dates")}</legend><div class="f2"><div class="f"><span id="s-from-lab">${L("Du")}</span>${dateInput("s-from", R.from, {})}</div><div class="f"><span id="s-to-lab">${L("Au")}</span>${dateInput("s-to", R.to, {})}</div></div></fieldset>
    <div class="err" id="f-err" role="alert"></div><div class="actions"><button type="submit" class="btn">${L("Appliquer ces dates")}</button></div></form>`, () => {
    let a = $("#s-from").value, b = $("#s-to").value; if (!a || !b) return err(L("Choisissez une date de début et une date de fin."), a ? "s-to" : "s-from");
    if (a > b) [a, b] = [b, a];
    if (periodTarget === "ops") { opRange = {from: a, to: b}; opPreset = "custom"; } else { range = {from: a, to: b}; preset = "custom"; }
    closeSheet(); render(); announce(L("Période du ") + longDate(a) + L(" au ") + longDate(b));
  }, "#sheet-title");
}
function openStatAccs() {
  const F = statF(), uc = usedCurs();
  openSheet(head(L("Comptes inclus dans les statistiques")) + `<div class="filters" role="group" aria-label="${L("Sélections rapides")}"><button type="button" class="pill-btn" data-act="sa-pick" data-c="ALL">${L("Tous les comptes")}</button>${uc.length > 1 ? uc.map(c => `<button type="button" class="pill-btn" data-act="sa-pick" data-c="${esc(c)}">${L("Seulement en ")}${esc(plural(c))}</button>`).join("") : ""}</div>
    <form novalidate><fieldset><legend>${L("Cochez un ou plusieurs comptes")}</legend>${accSorted().map(a => `<label class="check"><input type="checkbox" name="sa" value="${esc(a.id)}" ${F.ids.includes(a.id) ? "checked" : ""}><span class="chip acc" style="--ac:${esc(a.color)};width:28px;height:28px;font-size:12px;border-radius:8px" aria-hidden="true">${esc(sym(a.cur))}<i style="left:4px;top:5px;bottom:5px;width:3px"></i></span><span>${esc(a.name)}</span></label>`).join("")}</fieldset>
    <label class="f"><span>${L("Devise d'affichage")}</span><select id="sa-cur"><option value="">${L("Automatique")}</option>${curOpts(statCur || "")}</select></label>
    <p class="hint">${L("Automatique : la devise des comptes cochés, ou la devise de référence s'ils en mélangent plusieurs.")}</p>
    <div class="err" id="f-err" role="alert"></div><div class="actions"><button type="submit" class="btn">${L("Appliquer")}</button></div></form>`, () => {
    const ids = [...document.querySelectorAll('input[name="sa"]:checked')].map(x => x.value);
    if (!ids.length) return err(L("Cochez au moins un compte."), document.querySelector('input[name="sa"]').id);
    statCur = $("#sa-cur").value || null;
    statAccs = ids.length === S.meta.accounts.length ? null : ids; closeSheet(); render(); announce(L("Comptes : ") + statAccLabel(statF()));
  }, "#sheet-title");
}
function openCatDetail(id) {
  const F = statF(), dc = F.out, c = cat(id), ks = kids(id);
  const list = allTx().filter(t => t.t === statKind && topOf(t.cat) === id && t.date >= range.from && t.date <= range.to && F.has(acc(t.acc)));
  const v = t => conv(t.amt, acc(t.acc).cur, dc), total = list.reduce((s, t) => s + v(t), 0);
  let subs = "";
  if (ks.length) {
    const by = {}; list.forEach(t => by[t.cat] = (by[t.cat] || 0) + v(t));
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    subs = `<h3 class="day" style="padding-top:0"><span>${L("Par sous-catégorie")}</span></h3><ul class="card rows">${rows.map(([k, x]) => `<li class="row">${chipHtml(cat(k))}<span class="t"><b>${esc(k === id ? L("Sans sous-catégorie") : catName(k))}</b><small>${Math.round(x / total * 100)} %</small></span><span class="amt">${fmt(x, dc)}</span></li>`).join("")}</ul>`;
  }
  openSheet(head(esc(c ? c.name : L("Sans catégorie"))) + `<div class="cap" style="margin:0"><span>${plur(list.length, L("opération"), L("opérations"))} · ${dm(range.from)} – ${dm(range.to)}</span><b class="num">${fmt(total, dc)}</b></div>
    ${(ce => ce ? proLock(ce, L("Évolution sur 12 mois"), "stats") : "")(catEvolution(id, statKind, F))}
    ${subs}<h3 class="day" style="padding-top:0"><span>${L("Opérations")}</span></h3>
    <div class="card">${list.length ? txByDay(list) : `<p class="empty">${L("Aucune opération.")}</p>`}</div>`, null, "#sheet-title");
}
