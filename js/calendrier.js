"use strict";
/* ================= calendrier de l'appli (remplace celui du téléphone) ================= */
const CAL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
const shortDate = v => { const [y, m, d] = v.split("-").map(Number); return new Intl.DateTimeFormat(LOCALE, {day: "numeric", month: "short", year: "numeric"}).format(new Date(y, m - 1, d)); };
function dateInput(id, val, o) {
  o = o || {};
  const ph = o.placeholder || (o.opt ? L("Aucune date") : L("Choisir une date"));
  return `<input type="hidden" id="${id}" value="${esc(val || "")}"${o.min ? ` data-min="${esc(o.min)}"` : ""}${o.max ? ` data-max="${esc(o.max)}"` : ""}${o.opt ? ' data-opt="1"' : ""} data-ph="${esc(ph)}">`
    + `<button type="button" class="datebtn${val ? "" : " empty"}" id="${id}-btn" data-act="cal" data-for="${id}" aria-haspopup="dialog" aria-labelledby="${id}-lab ${id}-val"><span id="${id}-val">${esc(val ? shortDate(val) : ph)}</span>${CAL_ICON}</button>`;
}
let calCtx = null;
function openCal(id) {
  const inp = document.getElementById(id); if (!inp) return;
  const v = inp.value || "", t = today();
  let f = v || t; if (inp.dataset.min && f < inp.dataset.min) f = inp.dataset.min; if (inp.dataset.max && f > inp.dataset.max) f = inp.dataset.max;
  calCtx = {id, sel: v, focus: f, view: f.slice(0, 7), min: inp.dataset.min || "", max: inp.dataset.max || "", opt: !!inp.dataset.opt, label: ($("#" + CSS.escape(id) + "-lab") || {}).textContent || ""};
  $("#app").inert = true; $("#wrap").inert = true; $("#cal").hidden = false;
  renderCal(true);
}
function closeCal() {
  if (!calCtx) return; const id = calCtx.id; calCtx = null;
  $("#cal").hidden = true; $("#cal").innerHTML = ""; $("#wrap").inert = false; $("#app").inert = !$("#wrap").hidden;
  const b = document.getElementById(id + "-btn"); if (b) b.focus();
}
function pickDate(v) {
  const c = calCtx, inp = document.getElementById(c.id); if (!inp) return closeCal();
  inp.value = v; const b = document.getElementById(c.id + "-btn"), sp = document.getElementById(c.id + "-val");
  if (sp) sp.textContent = v ? shortDate(v) : inp.dataset.ph; if (b) b.classList.toggle("empty", !v);
  closeCal(); inp.dispatchEvent(new Event("change", {bubbles: true}));
  if (v) announce(longDate(v));
}
const okDay = d => (!calCtx.min || d >= calCtx.min) && (!calCtx.max || d <= calCtx.max);
function renderCal(focus) {
  const c = calCtx, [y, m] = c.view.split("-").map(Number), first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7, nd = new Date(y, m, 0).getDate(), t = today();
  const wd = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "short"}).format(new Date(2024, 0, 1 + i)));
  const wdl = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOCALE, {weekday: "long"}).format(new Date(2024, 0, 1 + i)));
  if (c.focus.slice(0, 7) !== c.view) c.focus = c.view + "-" + pad(Math.min(+c.focus.slice(8) || 1, nd));
  let cells = ""; for (let i = 0; i < lead; i++) cells += `<span class="cal-x" aria-hidden="true"></span>`;
  for (let d = 1; d <= nd; d++) {
    const v = c.view + "-" + pad(d), ok = okDay(v);
    cells += `<button type="button" class="cal-d${v === c.sel ? " sel" : ""}${v === t ? " today" : ""}" data-act="cal-pick" data-d="${v}" tabindex="${v === c.focus ? 0 : -1}"${ok ? "" : " disabled"}${v === c.sel ? ' aria-pressed="true"' : ""}${v === t ? ' aria-current="date"' : ""} aria-label="${esc(cap1(dayName(v)) + " " + y + (v === t ? ", " + L("aujourd'hui") : ""))}">${d}</button>`;
  }
  $("#cal").innerHTML = `<div class="cal" role="dialog" aria-modal="true" aria-labelledby="cal-q">
    <p class="cal-q" id="cal-q">${esc(c.label || L("Choisir une date"))}</p>
    <div class="cal-h"><button type="button" class="cal-n" data-act="cal-nav" data-n="-12" aria-label="${esc(L("Année précédente"))}">«</button><button type="button" class="cal-n" data-act="cal-nav" data-n="-1" aria-label="${esc(L("Mois précédent"))}">‹</button>
      <h2 aria-live="polite">${esc(cap1(monthName(c.view)))}</h2>
      <button type="button" class="cal-n" data-act="cal-nav" data-n="1" aria-label="${esc(L("Mois suivant"))}">›</button><button type="button" class="cal-n" data-act="cal-nav" data-n="12" aria-label="${esc(L("Année suivante"))}">»</button></div>
    <div class="cal-g" role="group" aria-label="${esc(cap1(monthName(c.view)))}">${wd.map((w, i) => `<abbr class="cal-w" title="${esc(wdl[i])}" aria-hidden="true">${esc(w.replace(".", ""))}</abbr>`).join("")}${cells}</div>
    <div class="cal-f">${okDay(t) ? `<button type="button" class="btn ghost sm" data-act="cal-pick" data-d="${t}">${L("Aujourd'hui")}</button>` : ""}${c.opt ? `<button type="button" class="btn ghost sm" data-act="cal-pick" data-d="">${L("Effacer la date")}</button>` : ""}<button type="button" class="btn ghost sm" data-act="cal-close">${L("Annuler")}</button></div>
  </div>`;
  if (focus) { const b = $("#cal").querySelector(`[data-d="${c.focus}"]`) || $("#cal").querySelector(".cal-d:not([disabled])"); if (b) b.focus(); }
}
function calMove(days, months) {
  const c = calCtx, [y, m, d] = c.focus.split("-").map(Number);
  const n = months ? new Date(y, m - 1 + months, Math.min(d, new Date(y, m + months, 0).getDate())) : new Date(y, m - 1, d + days);
  c.focus = ymd(n); c.view = c.focus.slice(0, 7); renderCal(true);
}
document.addEventListener("keydown", e => {
  if (!calCtx) return;
  const rtl = document.documentElement.dir === "rtl", k = e.key;
  if (k === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); return closeCal(); }
  if (!e.target.classList || !e.target.classList.contains("cal-d")) return;
  const map = {ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7};
  if (k in map) { e.preventDefault(); calMove(map[k], 0); }
  else if (k === "PageUp" || k === "PageDown") { e.preventDefault(); calMove(0, (k === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1)); }
  else if (k === "Home" || k === "End") { e.preventDefault(); const [y, m] = calCtx.view.split("-").map(Number); calCtx.focus = calCtx.view + "-" + (k === "Home" ? "01" : pad(new Date(y, m, 0).getDate())); renderCal(true); }
}, true);
