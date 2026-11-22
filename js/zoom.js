"use strict";
/* ================= zoom des graphiques ================= */
const ptrs = new Map(); let zs = null, zpan = null;
function zGet(el) { return {s: +el.dataset.s || 1, x: +el.dataset.x || 0, y: +el.dataset.y || 0}; }
function zSet(el, s, x, y) {
  const r = el.getBoundingClientRect(); s = Math.min(4, Math.max(1, s));
  x = Math.min(0, Math.max(r.width - r.width * s, x)); y = Math.min(0, Math.max(r.height - r.height * s, y));
  if (s === 1) { x = 0; y = 0; }
  el.dataset.s = s; el.dataset.x = x; el.dataset.y = y;
  el.firstElementChild.style.transform = s === 1 ? "" : `translate(${x}px,${y}px) scale(${s})`; el.classList.toggle("zoomed", s > 1);
}
function zAround(el, ns, cx, cy) { const z = zGet(el), px = (cx - z.x) / z.s, py = (cy - z.y) / z.s; zSet(el, ns, cx - px * Math.min(4, Math.max(1, ns)), cy - py * Math.min(4, Math.max(1, ns))); }
document.addEventListener("pointerdown", e => {
  const el = e.target.closest && e.target.closest(".zoomable"); if (!el) return;
  ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY, el});
  const ps = [...ptrs.values()].filter(p => p.el === el);
  if (ps.length >= 2) { const [a, b] = ps, r = el.getBoundingClientRect(); zs = {el, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, ...zGet(el)}; zpan = null; }
  else if (zGet(el).s > 1) zpan = {el, x: e.clientX, y: e.clientY};
});
document.addEventListener("pointermove", e => {
  if (e.target.closest && e.target.closest("#bal") && !zs) balHover(e);
  if (!ptrs.has(e.pointerId)) return;
  const p = ptrs.get(e.pointerId); p.x = e.clientX; p.y = e.clientY;
  if (zs) {
    const ps = [...ptrs.values()].filter(q => q.el === zs.el); if (ps.length < 2) return;
    const [a, b] = ps, r = zs.el.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y), ns = Math.min(4, Math.max(1, zs.s * d / zs.d));
    const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top, px = (zs.cx - zs.x) / zs.s, py = (zs.cy - zs.y) / zs.s;
    zSet(zs.el, ns, cx - px * ns, cy - py * ns);
  } else if (zpan) { const z = zGet(zpan.el); zSet(zpan.el, z.s, z.x + e.clientX - zpan.x, z.y + e.clientY - zpan.y); zpan.x = e.clientX; zpan.y = e.clientY; }
});
["pointerup", "pointercancel"].forEach(ev => document.addEventListener(ev, e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) zs = null; if (!ptrs.size) zpan = null; }));
document.addEventListener("dblclick", e => { const el = e.target.closest && e.target.closest(".zoomable"); if (el) zSet(el, 1, 0, 0); });
document.addEventListener("wheel", e => {
  const el = e.target.closest && e.target.closest(".zoomable");
  if (el && e.ctrlKey) { e.preventDefault(); const r = el.getBoundingClientRect(); zAround(el, zGet(el).s * Math.exp(-e.deltaY / 200), e.clientX - r.left, e.clientY - r.top); }
  else if (e.ctrlKey && !P.zoom) e.preventDefault();
}, {passive: false});
document.addEventListener("gesturestart", e => { if (!P.zoom) e.preventDefault(); });
document.addEventListener("keydown", e => { if (!P.zoom && (e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key) && !e.target.closest(".sheet")) e.preventDefault(); });
