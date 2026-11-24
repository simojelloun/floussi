"use strict";
/* ================= solde prévisionnel ================= */
let fcH = "eom";
function forecast(hz) {
  const t = today(), bal = {}; S.meta.accounts.forEach(a => bal[a.id] = a.initial);
  const apply = x => { if (bal[x.acc] != null) bal[x.acc] += isIn(x) ? x.amt : -x.amt; if (x.t === "vir" && bal[x.to] != null) bal[x.to] += (x.amtTo ?? x.amt); };
  const ev = [], have = new Set();
  for (const x of allTx()) { have.add(x.id); if (x.date <= t) apply(x); else if (x.date <= hz) ev.push({date: x.date, x}); }
  for (const r of S.meta.recurring) {
    if (r.paused || !acc(r.acc)) continue;
    for (let k = r.k, n = 0; n < 400; k++, n++) {
      const d = occ(r, k); if (d > hz || (r.end && d > r.end)) break;
      if (r.mode === "auto" && d <= t) continue;
      const x = recTx(r, d); if (have.has(x.id)) continue;
      ev.push({date: d < t ? t : d, x, rec: true, late: d < t});
    }
  }
  ev.sort((a, b) => a.date.localeCompare(b.date));
  const start = {...bal}, neg = {};
  for (const e of ev) { apply(e.x); for (const id in bal) if (bal[id] < 0 && start[id] >= 0 && !neg[id]) neg[id] = {date: e.date, v: bal[id]}; }
  for (const id in start) if (start[id] < 0) neg[id] = {date: t, v: start[id], now: true};
  return {start, end: bal, ev, neg};
}
function fcBlock() {
  if (!S.meta.accounts.length) return "";
  if (!isPro()) return proTeaser(L("Prévisions de solde"), L("Voyez votre solde prévu à la fin du mois, avec une alerte avant le découvert."), "fc");
  const t = today(), hz = fcH === "eom" ? lastDay(t.slice(0, 7)) : ymd(new Date(Date.now() + 30 * 864e5)), f = forecast(hz), curs = usedCurs();
  const tot = (b, c) => S.meta.accounts.filter(a => a.cur === c).reduce((x, a) => x + b[a.id], 0);
  const rows = curs.map(c => { const now = tot(f.start, c), end = tot(f.end, c), d = end - now;
    return `<div class="fc-row"><span>${esc(L("Solde estimé au") + " " + shortDate(hz))}${curs.length > 1 ? " · " + esc(L(curOf(c).name)) : ""}</span><b class="num${end < 0 ? " neg" : ""}">${fmt(end, c)}</b><small class="num ${d < 0 ? "neg" : "pos"}">${d < 0 ? "−" : "+"}${fmt(Math.abs(d), c)} ${L("d'ici là")}</small></div>`; }).join("");
  const negs = Object.entries(f.neg).map(([id, n]) => { const a = acc(id); return `<p class="fc-alert" role="note"><span class="state crit">${L("Attention")}</span> <span>${esc(a.name)} ${n.now ? L("est déjà en négatif") : L("passera en négatif le") + " " + esc(shortDate(n.date))} (${fmt(n.v, a.cur)})</span></p>`; }).join("");
  const up = f.ev.slice(0, 4).map(e => { const i = txInfo(e.x); return `<li class="row">${i.chip}<span class="t"><b>${esc(i.title)}${e.rec ? `<span class="rec-mark" aria-hidden="true">↻</span>` : ""}</b><small>${esc(shortDate(e.late ? e.x.date : e.date))}${e.late ? " · " + esc(L("à valider")) : e.rec ? " · " + esc(L("récurrente")) : ""}</small></span><span class="amt ${i.cls}">${esc(i.amt)}</span></li>`; }).join("");
  return `<div class="sec-h" style="align-items:center"><h2>${L("Prévisions")}</h2><div class="seg" role="group" aria-label="${esc(L("Horizon de la prévision"))}"><button type="button" data-act="fc" data-v="eom" aria-pressed="${fcH === "eom"}">${L("Fin du mois")}</button><button type="button" data-act="fc" data-v="30" aria-pressed="${fcH === "30"}">${L("30 jours")}</button></div></div>
    <div class="card fc">${rows}${negs}
      ${up ? `<details class="fold in" data-fold="upcoming" ${P.fold && P.fold.upcoming ? "open" : ""}><summary><span class="ft">${L("À venir")}</span><span class="fx">${plur(f.ev.length, L("opération"), L("opérations"))}</span><span class="chev" aria-hidden="true">›</span></summary><ul class="rows">${up}</ul></details>` : `<p class="hint">${L("Aucune opération prévue d'ici là.")}</p>`}
      <p class="hint">${L("Calculé à partir de vos soldes, des opérations datées dans le futur et des opérations récurrentes.")}</p></div>`;
}
