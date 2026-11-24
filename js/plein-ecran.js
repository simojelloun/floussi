"use strict";
/* ================= graphiques en plein écran =================
   Le bloc marqué data-fs="clé" est déplacé dans #fs (au-dessus de l'appli) ;
   à chaque rendu, la vue le recrée et fsSync() le replace dans #fs. */
let fsKey = "";
const FS_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const fsBtn = (k, title) => `<button type="button" class="fs-btn" data-act="fs" data-k="${k}" aria-label="${esc(L("Plein écran") + " : " + title)}">${FS_SVG}<span>${L("Plein écran")}</span></button>`;
/* hauteur du graphique (unités du dessin) : plus grand en plein écran, pour remplir l'écran */
function fsH(k, base) {
  if (fsKey !== k) return base;
  const w = Math.min(innerWidth, 1100), h = innerHeight;
  return Math.round(Math.max(base, Math.min(520, 340 * h * .48 / w)));
}
function fsSync() {
  const box = $("#fs"); if (!box) return;
  const w = fsKey && $("#view").querySelector(`[data-fs="${fsKey}"]`), others = [...$("#app").children].filter(x => x !== box);
  if (!w) { fsKey = ""; if (!box.hidden) { box.hidden = true; $("#fs-b").replaceChildren(); others.forEach(x => x.inert = false); } return; }
  $("#fs-t").textContent = w.dataset.fsT || ""; $("#fs-s").textContent = w.dataset.fsS || "";
  $("#fs-b").replaceChildren(w); box.hidden = false; others.forEach(x => x.inert = true);
}
function fsOpen(k) {
  fsKey = k; render(); if (!fsKey) return;
  $("#fs-b").scrollTop = 0; $("#fs-close").focus(); announce(L("Plein écran") + " : " + $("#fs-t").textContent);
}
function fsClose() {
  if (!fsKey) return; const k = fsKey; fsKey = ""; render();
  const b = $("#view").querySelector(`[data-act="fs"][data-k="${CSS.escape(k)}"]`); if (b) b.focus({preventScroll: true});
}
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !fsKey || !$("#wrap").hidden || !$("#pick").hidden || !$("#cal").hidden || !$("#phv").hidden) return;
  e.preventDefault(); fsClose();
});
let fsRz; addEventListener("resize", () => { if (!fsKey) return; clearTimeout(fsRz); fsRz = setTimeout(() => { if (fsKey) render(); }, 150); });
