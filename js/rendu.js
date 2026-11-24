"use strict";
/* ================= rendu et focus ================= */
function focusKey(el) {
  if (!el || el === document.body || !el.getAttribute) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  const a = el.getAttribute("data-act"); if (!a) return el.getAttribute("href") ? `[href="${CSS.escape(el.getAttribute("href"))}"]` : null;
  let s = `[data-act="${a}"]`;
  for (const k of ["id", "n", "c", "v", "p", "f", "m", "mv", "k", "z"]) { const v = el.dataset[k]; if (v != null) s += `[data-${k}="${CSS.escape(v)}"]`; }
  return s;
}
function render() {
  const navTab = PARENT[tab] || tab;
  document.querySelectorAll("nav.tabs a").forEach(a => a.getAttribute("href") === "#" + navTab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  IN_SETTINGS.includes(tab) ? $("#gear").setAttribute("aria-current", "page") : $("#gear").removeAttribute("aria-current");
  $("#title").textContent = TITLES[tab];
  document.title = (tab === "accueil" ? "" : TITLES[tab] + " – ") + "Floussi";
  const v = $("#view");
  if (loading) { v.innerHTML = `<p class="empty">${L("Chargement de vos comptes…")}</p>`; return; }
  const fb = $("#fs-b"), inFs = !!fsKey && $("#fs").contains(document.activeElement), ftop = fb ? fb.scrollTop : 0;
  const k = v.contains(document.activeElement) || inFs ? focusKey(document.activeElement) : null, top = v.scrollTop;
  v.innerHTML = VIEWS[tab](); enhanceSelects(v); fsSync();
  v.scrollTop = top; if (fsKey) fb.scrollTop = ftop;
  if (k) { const el = (fsKey && $("#fs").querySelector(k)) || v.querySelector(k); if (el) el.focus({preventScroll: true}); else (fsKey ? $("#fs-close") : $("#title")).focus({preventScroll: true}); }
}
let first = true;
function route() {
  const h = location.hash.slice(1), next = TITLES[h] ? h : "accueil", changed = next !== tab;
  if (changed) { tab = next; fsKey = ""; const v = $("#view"); v.scrollTop = 0; v.classList.add("enter"); clearTimeout(route.t); route.t = setTimeout(() => v.classList.remove("enter"), 700); }
  render();
  if (changed && !first) $("#title").focus();
  first = false;
}

function applyStatic() {
  const lab = {accueil: L("Accueil"), operations: L("Opérations"), prets: L("Prêts"), budgets: L("Budgets"), stats: L("Stats"), comptes: L("Comptes")};
  document.querySelectorAll("nav.tabs a").forEach(a => { const k = a.getAttribute("href").slice(1), tn = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (tn) tn.textContent = lab[k]; });
  $("nav.tabs").setAttribute("aria-label", L("Sections")); $(".skip").textContent = L("Aller au contenu"); $("#fab .sr").textContent = L("Ajouter une opération");
  $("#gear").setAttribute("aria-label", L("Réglages")); $("#fs-close").setAttribute("aria-label", L("Quitter le plein écran")); $("#sync").setAttribute("aria-label", L("État de la sauvegarde"));
}

/* ================= effet « génie » (comme la réduction d'une fenêtre sur Mac) ================= */
function genie(done) {
  const sh = $("#sheet"), wrap = $("#wrap"), tgt = document.querySelector('nav.tabs a[href="#operations"] .ti');
  if (!sh.animate || !tgt || matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
  const r = sh.getBoundingClientRect(), t = tgt.getBoundingClientRect();
  const tx = Math.max(4, Math.min(96, (t.left + t.width / 2 - r.left) / r.width * 100)), dy = (t.top + t.height / 2) - r.bottom;
  const P = (a, b, c, d) => `polygon(${a}% 0%, ${b}% 0%, ${c}% 100%, ${d}% 100%)`;
  sh.style.pointerEvents = "none"; sh.style.transformOrigin = `${tx}% 100%`;
  const an = sh.animate([
    {clipPath: P(0, 100, 100, 0), transform: "translateY(0) scale(1, 1)", opacity: 1, offset: 0},
    {clipPath: P(0, 100, tx + 14, tx - 14), transform: "translateY(0) scale(1, .94)", opacity: 1, offset: .32},
    {clipPath: P(tx - 22, tx + 22, tx + 5, tx - 5), transform: `translateY(${dy * .4}px) scale(1, .55)`, opacity: .95, offset: .68},
    {clipPath: P(tx - 2, tx + 2, tx + 1, tx - 1), transform: `translateY(${dy}px) scale(1, .03)`, opacity: .2, offset: 1}
  ], {duration: 620, easing: "cubic-bezier(.5,0,.75,.45)", fill: "forwards"});
  const fade = wrap.animate([{backgroundColor: getComputedStyle(wrap).backgroundColor}, {backgroundColor: "rgba(0,0,0,0)"}], {duration: 620, easing: "ease-in", fill: "forwards"});
  an.onfinish = () => {
    done(); an.cancel(); fade.cancel(); sh.style.pointerEvents = ""; sh.style.transformOrigin = "";
    tgt.animate([{transform: "scale(1)"}, {transform: "scale(1.28)"}, {transform: "scale(.94)"}, {transform: "scale(1)"}], {duration: 420, easing: "ease-out"});
  };
}
