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
  const opts = [...sel.options], tree = opts.some(o => o.dataset.p);
  pkCtx = {id, tree, sub: tree ? (sub || "") : "", q: ""}; $("#app").inert = true; $("#wrap").inert = true; $("#pick").hidden = false;
  if (tree) return renderPickTree(true);
  const pk = $("#pick");
  pk.innerHTML = `<div class="pk" role="dialog" aria-modal="true" aria-labelledby="pk-t"><h2 id="pk-t" tabindex="-1">${esc(sel._lab || L("Choisir"))}<button type="button" data-act="pick-close" aria-label="${esc(L("Fermer"))}">×</button></h2>
    ${opts.length > 10 ? `<input type="search" id="pk-q" placeholder="${esc(L("Rechercher"))}" aria-label="${esc(L("Rechercher"))}" autocomplete="off">` : ""}
    <ul class="pk-l plain" role="listbox" aria-labelledby="pk-t">${opts.map((o, i) => `<li role="none" data-n="${esc(norm(o.textContent))}"><button type="button" role="option" aria-selected="${o.selected}" data-act="pick-opt" data-i="${i}"${o.disabled ? " disabled" : ""}>${optChip(o.value)}<span>${esc(o.textContent)}</span><span class="pk-c" aria-hidden="true">${o.selected ? "✓" : ""}</span></button></li>`).join("")}</ul></div>`;
  const cur = pk.querySelector('[aria-selected="true"]') || pk.querySelector("[role=option]"); if (cur) { cur.focus(); cur.scrollIntoView({block: "center"}); }
}
/* catégories : d'abord les catégories principales, puis un sous-menu pour leurs sous-catégories */
function renderPickTree(focus) {
  const c = pkCtx, sel = document.getElementById(c.id); if (!sel) return closePick(true);
  const opts = [...sel.options], cur = sel.value, kidsOf = v => opts.filter(o => o.dataset.p === v), short = o => { const pc = cat(o.dataset.p); return pc && o.textContent.startsWith(pc.name + " : ") ? o.textContent.slice(pc.name.length + 3) : o.textContent; };
  const optBtn = (o, label) => `<li role="none"><button type="button" role="option" aria-selected="${o.value === cur}" data-act="pick-opt" data-i="${opts.indexOf(o)}">${optChip(o.value)}<span>${esc(label)}</span><span class="pk-c" aria-hidden="true">${o.value === cur ? "✓" : ""}</span></button></li>`;
  let body, title = sel._lab || L("Catégorie");
  if (c.q) { const q = norm(c.q); body = opts.filter(o => norm(o.textContent).includes(q)).map(o => optBtn(o, o.textContent)).join("") || `<li class="empty">${L("Aucun résultat")}</li>`; }
  else if (c.sub) {
    const po = opts.find(o => o.value === c.sub); title = po ? po.textContent : title;
    body = `<li role="none"><button type="button" class="pk-back" data-act="pick-back"><span aria-hidden="true">‹</span><span>${L("Toutes les catégories")}</span></button></li>` + (po ? optBtn(po, po.textContent + " " + L("(sans précision)")) : "") + kidsOf(c.sub).map(o => optBtn(o, short(o))).join("");
  } else body = opts.filter(o => !o.dataset.p).map(o => { const k = kidsOf(o.value); if (!k.length) return optBtn(o, o.textContent);
      const inSub = k.find(x => x.value === cur), on = o.value === cur || inSub;
      return `<li role="none"><button type="button" role="option" aria-selected="${!!on}" aria-haspopup="true" data-act="pick-sub" data-v="${esc(o.value)}" aria-label="${esc(o.textContent + ", " + plur(k.length, L("sous-catégorie"), L("sous-catégories")) + (inSub ? ", " + L("choisie : ") + short(inSub) : o.value === cur ? ", " + L("choisie") : ""))}">${optChip(o.value)}<span>${esc(o.textContent)}<small>${inSub ? esc(short(inSub)) : plur(k.length, L("sous-catégorie"), L("sous-catégories"))}</small></span><span class="pk-c" aria-hidden="true">${on ? "✓ " : ""}›</span></button></li>`; }).join("");
  const keepQ = document.activeElement && document.activeElement.id === "pk-q";
  $("#pick").innerHTML = `<div class="pk" role="dialog" aria-modal="true" aria-labelledby="pk-t"><h2 id="pk-t" tabindex="-1">${esc(title)}<button type="button" data-act="pick-close" aria-label="${esc(L("Fermer"))}">×</button></h2>
    ${opts.length > 10 ? `<input type="search" id="pk-q" placeholder="${esc(L("Rechercher"))}" aria-label="${esc(L("Rechercher une catégorie"))}" autocomplete="off" value="${esc(c.q)}">` : ""}
    <ul class="pk-l plain" role="listbox" aria-labelledby="pk-t">${body}</ul></div>`;
  if (keepQ) { const q = $("#pk-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); return; }
  if (focus) { const t = $("#pick").querySelector('[aria-selected="true"]:not(.pk-back)') || $("#pick").querySelector("[role=option]"); if (t) { t.focus(); t.scrollIntoView({block: "center"}); } }
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
