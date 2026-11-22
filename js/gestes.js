"use strict";
/* ================= balayer pour supprimer ================= */
function askDelete(id) {
  const t = allTx().find(x => x.id === id); if (!t || t.t === "pret") return;
  const inG = t.grp && allTx().filter(x => x.grp === t.grp).length > 1;
  confirmSheet((inG ? L("Supprimer cette ligne de l'opération répartie ?") : L("Supprimer cette opération ? Les soldes seront recalculés.")) + " (" + txInfo(t).title + ", " + txInfo(t).amt + ")", L("Supprimer"), () => deleteTxUndo(id));
}
function deleteTxUndo(id, focusId) {
  const t = allTx().find(x => x.id === id); if (!t || t.t === "pret") return;
  const m = removeTx(id); if (m) touch("tx-" + m); render();
  const f = focusId && $("#view").querySelector(`[data-act="edit-tx"][data-id="${CSS.escape(focusId)}"]`); if (f) f.focus();
  toastUndo(L("Opération supprimée : ") + (txInfo(t).title), () => {
    touch(...putTx(t)); render(); announce(L("Suppression annulée"));
    const r = $("#view").querySelector(`[data-act="edit-tx"][data-id="${CSS.escape(t.id)}"]`); if (r) r.focus();
  });
}
let sw = null, swBlock = false;
document.addEventListener("pointerdown", e => {
  const row = e.target.closest && e.target.closest("#view li.sw > .row");
  if (!row || e.button > 0 || !$("#wrap").hidden) return;
  sw = {row, li: row.parentElement, x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId};
});
document.addEventListener("pointermove", e => {
  if (!sw || e.pointerId !== sw.pid) return;
  const RTL = document.documentElement.dir === "rtl", dx = (e.clientX - sw.x) * (RTL ? -1 : 1), dy = e.clientY - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.2) { sw.on = true; sw.li.classList.add("swiping"); try { sw.row.setPointerCapture(e.pointerId); } catch (x) {} }
    else return;
  }
  sw.dx = Math.min(0, dx); sw.row.style.transform = `translateX(${sw.dx * (RTL ? -1 : 1)}px)`;
  sw.li.classList.toggle("armed", sw.dx < -sw.row.offsetWidth * .35);
});
function swEnd(e) {
  if (!sw || e.pointerId !== sw.pid) return;
  const s = sw; sw = null; if (!s.on) return;
  swBlock = true; setTimeout(() => swBlock = false, 60);
  s.row.style.transition = "transform .18s ease-out";
  if (s.dx < -s.row.offsetWidth * .35) { s.row.style.transform = "translateX(" + (document.documentElement.dir === "rtl" ? 110 : -110) + "%)"; setTimeout(() => { const id = s.row.dataset.id; render(); askDelete(id); }, 170); }
  else { s.row.style.transform = ""; setTimeout(() => { s.row.style.transition = ""; s.li.classList.remove("swiping", "armed"); }, 200); }
}
document.addEventListener("pointerup", swEnd); document.addEventListener("pointercancel", swEnd);
document.addEventListener("click", e => { if (swBlock) { e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener("keydown", e => {
  if (e.key === "Delete" && $("#wrap").hidden) {
    const r = e.target.closest && e.target.closest("#view li.sw > .row");
    if (r) { e.preventDefault(); const all = [...$("#view").querySelectorAll("li.sw > .row")], i = all.indexOf(r), n = all[i + 1] || all[i - 1]; askDelete(r.dataset.id); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && undoFn && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) { e.preventDefault(); runUndo(); }
});

/* ================= tri des catégories au doigt ================= */
function openCatOrder(id) {
  const c = cat(id); if (!c) return;
  const sib = S.meta.categories.filter(x => x.kind === c.kind && (x.parent || "") === (c.parent || "")), i = sib.indexOf(c), n = sib.length;
  const b = (v, label, dis) => `<button type="button" class="btn ghost" data-act="mv-cat" data-id="${esc(id)}" data-v="${v}" ${dis ? "disabled" : ""}>${esc(label)}</button>`;
  openSheet(head(esc(L("Ordre de") + " « " + c.name + " »")) + `<p class="hint">${esc(L("Position") + " " + (i + 1) + " / " + n)}. ${esc(L("Glissez la poignée, ou utilisez les boutons ci-dessous."))}</p>
    <div class="actions vert">${b("up", L("Monter d'un rang"), i === 0)}${b("down", L("Descendre d'un rang"), i === n - 1)}${b("first", L("Mettre en premier"), i === 0)}${b("last", L("Mettre en dernier"), i === n - 1)}</div>`, null, "#sheet-title");
}
function openAccOrder(id) {
  const a = acc(id); if (!a) return;
  const ids = accSorted().map(x => x.id), i = ids.indexOf(id), n = ids.length;
  const b = (v, label, dis) => `<button type="button" class="btn ghost" data-act="mv-acc" data-id="${esc(id)}" data-v="${v}" ${dis ? "disabled" : ""}>${esc(label)}</button>`;
  openSheet(head(esc(L("Ordre de") + " « " + a.name + " »")) + `<p class="hint">${esc(L("Position") + " " + (i + 1) + " / " + n)}. ${esc(L("Glissez la poignée, ou utilisez les boutons ci-dessous."))}</p>
    <div class="actions vert">${b("up", L("Monter d'un rang"), i === 0)}${b("down", L("Descendre d'un rang"), i === n - 1)}${b("first", L("Mettre en premier"), i === 0)}${b("last", L("Mettre en dernier"), i === n - 1)}</div>`, null, "#sheet-title");
}
function reorderAccs(ids) {
  const objs = ids.map(id => acc(id)).filter(Boolean); S.meta.accounts = objs.concat(S.meta.accounts.filter(a => !ids.includes(a.id)));
  const got = accSorted().map(a => a.id); return got.join() === ids.join();
}
function afterAccReorder(id, ok) {
  touch("meta"); render();
  const h = $("#view").querySelector(`.drag[data-drag="${CSS.escape(id)}"]`); if (h) h.focus({preventScroll: true});
  const ids = accSorted().map(a => a.id);
  if (!ok) toast(L("Les comptes en évidence sur l'Accueil restent en tête des listes."));
  announce(acc(id).name + L(" en position ") + (ids.indexOf(id) + 1) + L(" sur ") + ids.length);
}
function reorderCats(ids) {
  const set = new Set(ids), objs = ids.map(id => cat(id)).filter(Boolean); let k = 0;
  S.meta.categories = S.meta.categories.map(c => set.has(c.id) ? objs[k++] : c);
}
function afterReorder(id, ids) {
  touch("meta"); render();
  const h = $("#view").querySelector(`.drag[data-drag="${CSS.escape(id)}"]`); if (h) h.focus({preventScroll: true});
  announce(catName(id) + L(" en position ") + (ids.indexOf(id) + 1) + L(" sur ") + ids.length);
}
let dg = null, dgBlock = false;
document.addEventListener("pointerdown", e => {
  const h = e.target.closest && e.target.closest("#view .drag"); if (!h) return;
  const li = h.closest("li[data-cat],li[data-acc]"); if (!li) return; e.preventDefault();
  dg = {li, ul: li.parentElement, y: e.clientY, pid: e.pointerId, moved: false, id: li.dataset.cat || li.dataset.acc, isAcc: !!li.dataset.acc};
  li.classList.add("dragging"); try { h.setPointerCapture(e.pointerId); } catch (x) {}
});
document.addEventListener("pointermove", e => {
  if (!dg || e.pointerId !== dg.pid) return;
  const v = $("#view"), r = v.getBoundingClientRect(), b0 = v.scrollTop;
  if (e.clientY > r.bottom - 50) v.scrollTop += 10; else if (e.clientY < r.top + 50) v.scrollTop -= 10;
  dg.y -= v.scrollTop - b0;
  let dy = e.clientY - dg.y;
  const nx = dg.li.nextElementSibling, pv = dg.li.previousElementSibling;
  if (nx && dy > nx.offsetHeight / 2) { dg.ul.insertBefore(nx, dg.li); dg.y += nx.offsetHeight; dy -= nx.offsetHeight; dg.moved = true; }
  else if (pv && dy < -pv.offsetHeight / 2) { dg.ul.insertBefore(dg.li, pv); dg.y -= pv.offsetHeight; dy += pv.offsetHeight; dg.moved = true; }
  dg.li.style.transform = `translateY(${dy}px)`;
});
function dgEnd(e) {
  if (!dg || e.pointerId !== dg.pid) return;
  const d = dg; dg = null; d.li.style.transform = ""; d.li.classList.remove("dragging");
  if (!d.moved) return;
  dgBlock = true; setTimeout(() => dgBlock = false, 80);
  if (d.isAcc) { const ids = [...d.ul.children].map(li => li.dataset.acc).filter(Boolean); return afterAccReorder(d.id, reorderAccs(ids)); }
  const ids = [...d.ul.children].map(li => li.dataset.cat).filter(Boolean); reorderCats(ids); afterReorder(d.id, ids);
}
document.addEventListener("pointerup", dgEnd); document.addEventListener("pointercancel", dgEnd);
document.addEventListener("keydown", e => {
  const h = e.target.closest && e.target.closest("#view .drag"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown") || !h.closest("li[data-cat],li[data-acc]")) return;
  e.preventDefault(); const la = h.closest("li[data-acc]");
  if (la) { const ids = [...la.parentElement.children].map(x => x.dataset.acc), i = ids.indexOf(la.dataset.acc), j = e.key === "ArrowUp" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return announce(e.key === "ArrowUp" ? L("Déjà en première position") : L("Déjà en dernière position"));
    [ids[i], ids[j]] = [ids[j], ids[i]]; return afterAccReorder(la.dataset.acc, reorderAccs(ids)); }
  const li = h.closest("li[data-cat]"), ids = [...li.parentElement.children].map(x => x.dataset.cat).filter(Boolean);
  const i = ids.indexOf(li.dataset.cat), j = e.key === "ArrowUp" ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return announce(e.key === "ArrowUp" ? L("Déjà en première position") : L("Déjà en dernière position"));
  [ids[i], ids[j]] = [ids[j], ids[i]]; reorderCats(ids); afterReorder(li.dataset.cat, ids);
});
