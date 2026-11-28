"use strict";
/* ================= listes déroulantes de l'appli (remplacent celles du téléphone) ================= */
const CHEV = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
let selN = 0, pkCtx = null;
function selLabel(sel) { const w = sel.closest("label,.f"), sp = w && w.querySelector("span"); return (sel.getAttribute("aria-label") || (sp ? sp.textContent : "")).trim(); }
function enhanceSelects(root) {
  root.querySelectorAll("select").forEach(sel => {
    if (sel._pk || sel.hasAttribute("data-nopk")) return; if (!sel.id) sel.id = "sel-" + (++selN);
    const lab = selLabel(sel), o = sel.selectedOptions[0], txt = o ? o.textContent : "", b = document.createElement("button");
    b.type = "button"; b.className = "selbtn"; b.id = sel.id + "-pk"; b.dataset.act = "pick"; b.dataset.for = sel.id; b.disabled = sel.disabled;
    b.setAttribute("aria-haspopup", "listbox"); b.setAttribute("aria-label", (lab ? lab + " : " : "") + txt);
    const d = sel.getAttribute("aria-describedby"); if (d) b.setAttribute("aria-describedby", d);
    b.innerHTML = "<span></span>" + CHEV; b.firstChild.textContent = txt;
    sel.hidden = true; sel.after(b); sel._pk = b; sel._lab = lab;
  });
}
function optChip(v) { const a = acc(v); if (a) return accChip(a); const c = cat(v); if (c) return chipHtml(c); const cu = S.meta.currencies.find(x => x.code === v); return cu ? `<span class="chip" aria-hidden="true">${esc(cu.sym)}</span>` : ""; }
function openPick(id, sub) {
  const sel = document.getElementById(id); if (!sel || sel.disabled) return;
  const opts = [...sel.options], tree = opts.some(o => o.dataset.p) || (!!draft && (id === "f-cat" || /^p-cat-\d+$/.test(id)));
  pkCtx = {id, tree, sub: tree ? (sub || "") : "", q: ""}; $("#app").inert = true; $("#wrap").inert = true; $("#pick").hidden = false;
  if (tree) return renderPickTree(true);
  const pk = $("#pick");
  pk.innerHTML = `<div class="pk" role="dialog" aria-modal="true" aria-labelledby="pk-t"><h2 id="pk-t" tabindex="-1">${esc(sel._lab || L("Choisir"))}<button type="button" data-act="pick-close" aria-label="${esc(L("Fermer"))}">×</button></h2>
    ${opts.length > 10 ? `<input type="search" id="pk-q" placeholder="${esc(L("Rechercher"))}" aria-label="${esc(L("Rechercher"))}" autocomplete="off">` : ""}
    <ul class="pk-l plain" role="listbox" aria-labelledby="pk-t">${opts.map((o, i) => pkGrp(o) + `<li role="none" data-n="${esc(norm(o.textContent))}"><button type="button" role="option" aria-selected="${o.selected}" data-act="pick-opt" data-i="${i}"${o.disabled ? " disabled" : ""}>${optChip(o.value)}<span>${esc(o.textContent)}</span><span class="pk-c" aria-hidden="true">${o.selected ? "✓" : ""}</span></button></li>`).join("")}</ul></div>`;
  const cur = pk.querySelector('[aria-selected="true"]') || pk.querySelector("[role=option]"); if (cur) { cur.focus(); cur.scrollIntoView({block: "center"}); }
}
/* catégories : d'abord les catégories principales, puis un sous-menu pour leurs sous-catégories */
/* titre d'un groupe d'options (<optgroup>) dans la liste */
const pkGrp = o => o.parentElement.tagName === "OPTGROUP" && o === o.parentElement.firstElementChild ? `<li class="pk-g" role="presentation" data-n="">${esc(o.parentElement.label)}</li>` : "";
function renderPickTree(focus) {
  const c = pkCtx, sel = document.getElementById(c.id); if (!sel) return closePick(true);
  const opts = [...sel.options], cur = sel.value, kidsOf = v => opts.filter(o => o.dataset.p === v), short = o => { const pc = cat(o.dataset.p); return pc && o.textContent.startsWith(pc.name + " : ") ? o.textContent.slice(pc.name.length + 3) : o.textContent; };
  const optBtn = (o, label) => `<li role="none"><button type="button" role="option" aria-selected="${o.value === cur}" data-act="pick-opt" data-i="${opts.indexOf(o)}">${optChip(o.value)}<span>${esc(label)}</span><span class="pk-c" aria-hidden="true">${o.value === cur ? "✓" : ""}</span></button></li>`;
  let body, title = sel._lab || L("Catégorie");
  if (c.q) { const q = norm(c.q); body = opts.filter(o => norm(o.textContent).includes(q)).map(o => optBtn(o, o.textContent)).join("") || `<li class="empty">${L("Aucun résultat")}</li>`; }
  else if (c.sub) {
    const po = opts.find(o => o.value === c.sub); title = po ? po.textContent : title;
    body = `<li role="none"><button type="button" class="pk-back" data-act="pick-back"><span aria-hidden="true">‹</span><span>${L("Toutes les catégories")}</span></button></li>` + (po ? optBtn(po, po.textContent + " " + L("(sans précision)")) : "") + kidsOf(c.sub).map(o => optBtn(o, short(o))).join("");
  } else body = opts.filter(o => !o.dataset.p).map(o => { const k = kidsOf(o.value); if (!k.length) return pkGrp(o) + optBtn(o, o.textContent);
      const inSub = k.find(x => x.value === cur), on = o.value === cur || inSub;
      return `<li role="none"><button type="button" role="option" aria-selected="${!!on}" aria-haspopup="true" data-act="pick-sub" data-v="${esc(o.value)}" aria-label="${esc(o.textContent + ", " + plur(k.length, L("sous-catégorie"), L("sous-catégories")) + (inSub ? ", " + L("choisie : ") + short(inSub) : o.value === cur ? ", " + L("choisie") : ""))}">${optChip(o.value)}<span>${esc(o.textContent)}<small>${inSub ? esc(short(inSub)) : plur(k.length, L("sous-catégorie"), L("sous-catégories"))}</small></span><span class="pk-c" aria-hidden="true">${on ? "✓ " : ""}›</span></button></li>`; }).join("");
  if (c.add) return renderPickAdd();
  let addB = ""; if (pkCanAdd()) { const sp = c.sub && cat(c.sub);
    addB = `<button type="button" class="pk-add" data-act="pick-add" data-par="${esc(c.q ? "" : c.sub)}" data-name="${esc(c.q.trim())}"><span class="pk-plus" aria-hidden="true">+</span><span>${c.q.trim() ? L("Créer la catégorie") + " « " + esc(c.q.trim()) + " »" : sp ? L("Nouvelle sous-catégorie de ") + esc(sp.name) : L("Nouvelle catégorie")}</span></button>`; }
  const keepQ = document.activeElement && document.activeElement.id === "pk-q";
  $("#pick").innerHTML = `<div class="pk" role="dialog" aria-modal="true" aria-labelledby="pk-t"><h2 id="pk-t" tabindex="-1">${esc(title)}<button type="button" data-act="pick-close" aria-label="${esc(L("Fermer"))}">×</button></h2>
    ${opts.length > 10 ? `<input type="search" id="pk-q" placeholder="${esc(L("Rechercher"))}" aria-label="${esc(L("Rechercher une catégorie"))}" autocomplete="off" value="${esc(c.q)}">` : ""}
    <ul class="pk-l plain" role="listbox" aria-labelledby="pk-t">${body}</ul>${addB}</div>`;
  if (keepQ) { const q = $("#pk-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); return; }
  if (focus) { const t = $("#pick").querySelector('[aria-selected="true"]:not(.pk-back)') || $("#pick").querySelector("[role=option]"); if (t) { t.focus(); t.scrollIntoView({block: "center"}); } }
}
/* créer une catégorie ou une sous-catégorie sans quitter la saisie d'une opération */
const pkCanAdd = () => !!(pkCtx && draft && draft.t !== "vir" && (pkCtx.id === "f-cat" || /^p-cat-\d+$/.test(pkCtx.id)));
function renderPickAdd() {
  const a = pkCtx.add, kind = draft.t, tops = cats(kind).filter(x => !x.parent), color = COLORS[S.meta.categories.length % COLORS.length][0];
  let ici = 0; const icons = ICON_GROUPS.map(g => g[1].map(([e, n]) => `<label data-n="${esc(norm(L(n) + " " + L(g[0])))}"><input type="radio" name="pk-icon" id="pk-icon-${ici++}" value="${e}" ${e === "📦" ? "checked" : ""}><span aria-hidden="true">${ICON_SVG[e] ? svgIcon(e) : e}</span><span class="sr">${esc(L(n))}</span></label>`).join("")).join("");
  $("#pick").innerHTML = `<div class="pk" role="dialog" aria-modal="true" aria-labelledby="pk-t"><h2 id="pk-t" tabindex="-1">${kind === "dep" ? L("Nouvelle catégorie de dépense") : L("Nouvelle catégorie de revenu")}<button type="button" data-act="pick-close" aria-label="${esc(L("Fermer"))}">×</button></h2>
    <form id="pk-new" class="pk-new" novalidate style="--cc:${color}">
      <label class="f"><span>${L("Nom")}</span><input type="text" id="pk-name" maxlength="30" autocomplete="off" enterkeyhint="done" value="${esc(a.name || "")}"></label>
      <label class="f"><span>${L("Placer dans")}</span><select id="pk-par" data-nopk><option value="">${L("Aucune, c'est une catégorie principale")}</option>${tops.map(x => `<option value="${esc(x.id)}" ${x.id === a.par ? "selected" : ""}>${L("Sous-catégorie de ")}${esc(x.name)}</option>`).join("")}</select></label>
      <fieldset class="pk-ic" ${a.par ? "hidden" : ""}><legend>${L("Icône")}</legend><div class="icons" id="pk-icons">${icons}</div></fieldset>
      <small class="hint" id="pk-same" style="margin:0" ${a.par ? "" : "hidden"}>${L("Elle reprend l'icône et la couleur de sa catégorie principale.")}</small>
      <small class="hint" style="margin:0">${L("Vous pourrez la modifier plus tard dans Réglages › Catégories.")}</small>
      <div class="err" id="pk-err" role="alert"></div>
      <div class="actions"><button type="button" class="btn ghost" data-act="pick-add-cancel">${L("Retour")}</button><button type="submit" class="btn">${L("Ajouter et choisir")}</button></div>
    </form></div>`;
  const f = $("#pk-new"), nm = $("#pk-name");
  f.addEventListener("submit", e => { e.preventDefault(); e.stopPropagation(); pickAddSave(); });
  $("#pk-par").addEventListener("change", e => { e.stopPropagation(); const sub = !!e.target.value; f.querySelector(".pk-ic").hidden = sub; $("#pk-same").hidden = !sub; });
  f.addEventListener("change", e => { if (e.target.name === "pk-icon") { e.stopPropagation(); pkCtx.add.iconSet = true; } });
  nm.addEventListener("input", e => { e.stopPropagation(); pkIconGuess(); });
  if (a.name) pkIconGuess();
  nm.focus(); nm.setSelectionRange(nm.value.length, nm.value.length);
}
function pkIconGuess() {
  if (!pkCtx || !pkCtx.add || pkCtx.add.iconSet) return;
  const q = norm($("#pk-name").value); if (q.length < 3) return;
  const words = q.split(/\s+/).filter(w => w.length >= 3);
  const hit = [...document.querySelectorAll("#pk-icons label")].find(l => words.some(w => l.dataset.n.split(" ").some(x => x.length >= 3 && (x.startsWith(w) || w.startsWith(x)))));
  if (hit) { hit.querySelector("input").checked = true; const box = $("#pk-icons"); box.scrollTop = hit.offsetTop - 4; }
}
function pickAddSave() {
  const name = $("#pk-name").value.trim(), par = $("#pk-par").value, kind = draft.t, e = $("#pk-err");
  const bad = m => { e.textContent = m; $("#pk-name").setAttribute("aria-invalid", "true"); $("#pk-name").setAttribute("aria-describedby", "pk-err"); $("#pk-name").focus(); };
  if (!name) return bad(L("Donnez un nom à la catégorie."));
  if (cats(kind).some(x => (x.parent || "") === par && norm(x.name) === norm(name))) return bad(L("Cette catégorie existe déjà à cet endroit."));
  const p = par && cat(par), ic = (document.querySelector('input[name="pk-icon"]:checked') || {}).value || "📦";
  const obj = {id: (kind === "dep" ? "c-" : "r-") + uid(), kind, name, parent: par || "", icon: p ? (p.icon === "img" ? "📦" : p.icon) : ic, color: p ? p.color : COLORS[S.meta.categories.length % COLORS.length][0]};
  S.meta.categories.push(obj); touch("meta");
  const id = pkCtx.id; closePick(true); readTx();
  if (id === "f-cat") { draft.cat = obj.id; draft.catTouched = true; renderTx("f-cat-btn"); }
  else { const i = +id.slice(6); if (draft.parts && draft.parts[i]) draft.parts[i].cat = obj.id; renderTx(id + "-pk"); }
  toast(L("Catégorie ajoutée : ") + catLabel(obj.id));
}
function closePick(noFocus) {
  if (!pkCtx) return; const id = pkCtx.id; pkCtx = null;
  $("#pick").hidden = true; $("#pick").innerHTML = ""; $("#wrap").inert = false; $("#app").inert = !$("#wrap").hidden;
  const b = document.getElementById(id + "-pk") || document.getElementById(id + "-btn"); if (b && !noFocus) b.focus();
}
function pickOpt(i) {
  const id = pkCtx.id, sel = document.getElementById(id); closePick(true); if (!sel) return;
  const changed = sel.selectedIndex !== i; sel.selectedIndex = i;
  const b = sel._pk, o = sel.options[i]; if (b) { b.firstChild.textContent = o.textContent; b.setAttribute("aria-label", (sel._lab ? sel._lab + " : " : "") + o.textContent); }
  if (changed) sel.dispatchEvent(new Event("change", {bubbles: true}));
  const nb = document.getElementById(id + "-pk"); if (nb && $("#cal").hidden && !locked) nb.focus({preventScroll: true});
}
document.addEventListener("keydown", e => {
  if (!pkCtx) return;
  if (pkCtx.add) { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); pkCtx.add = null; renderPickTree(true); } return; }
  if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); return closePick(); }
  const items = [...document.querySelectorAll("#pick li:not([hidden]) [role=option]:not([disabled])")], i = items.indexOf(document.activeElement);
  const go = k => { if (items[k]) { e.preventDefault(); items[k].focus(); } };
  if (pkCtx.tree && !pkCtx.q) { const rtl = document.documentElement.dir === "rtl", fwd = rtl ? "ArrowLeft" : "ArrowRight", bwd = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === fwd && e.target.dataset.act === "pick-sub") { e.preventDefault(); pkCtx.sub = e.target.dataset.v; return renderPickTree(true); }
    if ((e.key === bwd || (e.key === "Backspace" && e.target.id !== "pk-q")) && pkCtx.sub) { e.preventDefault(); const v = pkCtx.sub; pkCtx.sub = ""; renderPickTree(false); const b = $("#pick").querySelector(`[data-v="${CSS.escape(v)}"]`); if (b) b.focus(); return; } }
  if (e.key === "ArrowDown") go(Math.min(items.length - 1, i + 1)); else if (e.key === "ArrowUp") go(Math.max(0, i - 1));
  else if (e.key === "Home" && e.target.id !== "pk-q") go(0); else if (e.key === "End" && e.target.id !== "pk-q") go(items.length - 1);
}, true);

/* ================= annonces ================= */
let liveT; function announce(m) { const l = $("#live"); l.textContent = ""; clearTimeout(liveT); liveT = setTimeout(() => l.textContent = m, 150); }
let toastT, undoFn = null;
function toast(m) { const t = $("#toast"); t.textContent = m; t.setAttribute("aria-hidden", "true"); t.hidden = false; undoFn = null; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3800); announce(m); }
function toastUndo(m, fn) {
  const t = $("#toast"); t.innerHTML = `<span>${esc(m)}</span><button type="button" id="toast-undo">${L("Annuler")}</button>`; t.removeAttribute("aria-hidden"); t.hidden = false; undoFn = fn;
  $("#toast-undo").onclick = runUndo;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; t.setAttribute("aria-hidden", "true"); undoFn = null; }, 10000);
  announce(m + ". " + L("Pour annuler, touchez le bouton Annuler en bas de l'écran."));
}
function runUndo() { const f = undoFn; undoFn = null; clearTimeout(toastT); $("#toast").hidden = true; if (f) f(); }
