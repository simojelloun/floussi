"use strict";
/* ================= zakat =================
   Calcul indicatif de la zakat al-mal : 2,5 % des biens soumis, s'ils atteignent le nisab
   (valeur de 85 g d'or ou de 595 g d'argent) et sont détenus une année lunaire (hawl).
   Les réglages sont gardés dans S.meta.zakat (voir migrate()) ; les montants sont en centimes. */
const ZK_RATE = 0.025, ZK_GOLD_G = 85, ZK_SILVER_G = 595;
const zkDef = () => ({cur: base(), basis: "gold", gPrice: 0, sPrice: 0, goldG: 0, jewelG: 0, jcount: false, silverG: 0, inv: 0, goods: 0, other: 0, debts: 0, recv: true, owe: true, excl: [], date: ""});
const ZK = () => { const z = S.meta.zakat = Object.assign(zkDef(), S.meta.zakat || {}); if (!S.meta.currencies.some(c => c.code === z.cur)) z.cur = base(); return z; };
const zkNum = s => { const v = parseFloat(String(s || "").replace(/[\s  ]/g, "").replace(",", ".")); return isFinite(v) && v > 0 ? v : 0; };
const zkShowNum = v => v ? String(v).replace(".", DEC) : "";
const zkShowAmt = v => v ? plain(v) : "";

function zakatCalc(z) {
  const cur = z.cur, accs = S.meta.accounts.map(a => ({a, v: Math.max(0, conv(balance(a), a.cur, cur)), on: !z.excl.includes(a.id)}));
  const cash = accs.filter(x => x.on).reduce((s, x) => s + x.v, 0);
  const lent = sumBase(loanTotals("lent"), cur), borrowed = sumBase(loanTotals("borrowed"), cur);
  const gold = Math.round((z.goldG + (z.jcount ? z.jewelG : 0)) * z.gPrice), silver = Math.round(z.silverG * z.sPrice);
  const total = cash + (z.recv ? lent : 0) + gold + silver + z.inv + z.goods + z.other;
  const ded = (z.owe ? borrowed : 0) + z.debts, net = Math.max(0, total - ded);
  const price = z.basis === "gold" ? z.gPrice : z.sPrice, nisab = Math.round((z.basis === "gold" ? ZK_GOLD_G : ZK_SILVER_G) * price);
  const due = nisab > 0 && net >= nisab ? Math.round(net * ZK_RATE) : 0;
  return {accs, cash, lent, borrowed, gold, silver, total, ded, net, nisab, due, noPrice: !price};
}
/* dates de l'hégire (calendrier Umm al-Qura du navigateur) */
function hijri(d, opts) { try { return new Intl.DateTimeFormat(LOCALE + "-u-ca-islamic-umalqura", opts || {day: "numeric", month: "long", year: "numeric"}).format(new Date(d + "T12:00:00")); } catch (e) { return ""; } }
function hijriMD(d) { try { const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {day: "numeric", month: "numeric"}).formatToParts(new Date(d + "T12:00:00")); return +p.find(x => x.type === "month").value * 100 + +p.find(x => x.type === "day").value; } catch (e) { return null; } }
/* prochaine date, à partir d'aujourd'hui, qui tombe le même jour du même mois de l'hégire que la date choisie */
function zakatNext(d) {
  const want = hijriMD(d); if (want == null) return "";
  const t0 = today(), start = d > t0 ? d : t0;
  for (let i = 0; i < 400; i++) { const x = addDays(start, i), md = hijriMD(x); if (md === want || (md === want - 1 && want % 100 === 30 && hijriMD(addDays(x, 1)) % 100 === 1)) return x; }
  return "";
}

function zakatResult(z, r) {
  const c = z.cur;
  if (r.noPrice) return `<p class="zk-big">—</p><p>${z.basis === "gold" ? L("Indiquez le cours d'un gramme d'or pour connaître le nisab.") : L("Indiquez le cours d'un gramme d'argent pour connaître le nisab.")}</p>`;
  const ok = r.due > 0;
  return `<p class="zk-lab">${ok ? L("Zakat à verser") : L("Pas de zakat due")}</p>
    <p class="zk-big num">${ok ? fmt(r.due, c) : fmt(0, c)}</p>
    <p>${ok ? L("Vos biens soumis dépassent le nisab : 2,5 % de ") + fmt(r.net, c) + "." : L("Vos biens soumis (") + fmt(r.net, c) + L(") sont en dessous du nisab.")}</p>
    <dl class="kv"><div><dt>${L("Biens soumis, après déductions")}</dt><dd>${fmt(r.net, c)}</dd></div><div><dt>${L("Nisab")} (${z.basis === "gold" ? "85 g " + L("d'or") : "595 g " + L("d'argent")})</dt><dd>${fmt(r.nisab, c)}</dd></div></dl>`;
}

function vZakat() {
  const z = ZK(), r = zakatCalc(z), c = z.cur, s = esc(sym(c)), nx = z.date ? zakatNext(z.date) : "", t0 = today();
  const days = nx ? Math.round((new Date(nx + "T12:00:00") - new Date(t0 + "T12:00:00")) / 864e5) : null;
  const amt = (id, label, v, hint) => `<label class="frow"><span class="fl">${label}</span><input class="fin" type="text" inputmode="decimal" id="${id}" value="${esc(zkShowAmt(v))}" placeholder="0,00" autocomplete="off"${hint ? ` aria-describedby="${id}-h"` : ""}><span class="unit" aria-hidden="true">${s}</span></label>${hint ? `<small class="hint zk-h" id="${id}-h">${hint}</small>` : ""}`;
  const grams = (id, label, v) => `<label class="frow"><span class="fl">${label}</span><input class="fin" type="text" inputmode="decimal" id="${id}" value="${esc(zkShowNum(v))}" placeholder="0" autocomplete="off"><span class="unit" aria-hidden="true">g</span></label>`;
  return backLink("reglages") + `<div id="zakat" class="zk">
    <div class="card zk-res${r.due ? " due" : ""}" id="z-res" role="status">${zakatResult(z, r)}</div>
    ${r.due ? `<button type="button" class="btn" data-act="zakat-pay">${L("Enregistrer le versement de la zakat")}</button>` : ""}

    <h2 class="sec-h">${L("Base du calcul")}</h2>
    <div class="fgrp">
      <label class="frow"><span class="fl">${L("Devise")}</span><select id="z-cur">${curOpts(c)}</select></label>
      <div class="frow"><span class="fl" id="z-basis-l">${L("Nisab")}</span><div class="seg" role="radiogroup" aria-labelledby="z-basis-l"><label><input type="radio" name="z-basis" value="gold" ${z.basis === "gold" ? "checked" : ""}><span>${L("Or")} · 85 g</span></label><label><input type="radio" name="z-basis" value="silver" ${z.basis === "silver" ? "checked" : ""}><span>${L("Argent (métal)")} · 595 g</span></label></div></div>
      ${amt("z-gp", L("1 g d'or"), z.gPrice)}${amt("z-sp", L("1 g d'argent"), z.sPrice)}
    </div>
    <small class="hint zk-h">${L("Cours du jour d'un gramme de métal pur, auprès de votre banque ou d'un bijoutier. Le nisab sur l'argent, plus bas, est retenu par certains savants comme plus favorable aux pauvres.")}</small>

    <h2 class="sec-h">${L("Ce que vous possédez")}</h2>
    <div class="fgrp">
      ${r.accs.map(({a, v, on}) => `<label class="frow"><span class="fl wide">${accChip(a)} ${esc(a.name)}</span><span class="num zk-v">${fmt(v, c)}</span><input type="checkbox" name="z-acc" value="${esc(a.id)}" ${on ? "checked" : ""} aria-label="${esc(L("Compter le compte") + " " + a.name + ", " + fmt(v, c))}"></label>`).join("")}
      ${r.lent ? `<label class="frow"><span class="fl wide">${L("Argent qu'on vous doit")}</span><span class="num zk-v">${fmt(r.lent, c)}</span><input type="checkbox" id="z-recv" ${z.recv ? "checked" : ""} aria-label="${esc(L("Compter l'argent qu'on vous doit") + ", " + fmt(r.lent, c))}"></label>` : ""}
      ${grams("z-gold", L("Or d'épargne"), z.goldG)}
      ${grams("z-jewel", L("Bijoux en or portés"), z.jewelG)}
      <label class="frow"><span class="fl wide">${L("Compter les bijoux portés")}</span><input type="checkbox" id="z-jcount" ${z.jcount ? "checked" : ""} aria-describedby="z-jcount-h"></label>
      ${grams("z-silver", L("Argent (métal)"), z.silverG)}
      ${amt("z-inv", L("Placements, épargne hors appli"), z.inv)}
      ${amt("z-goods", L("Marchandises à vendre"), z.goods)}
      ${amt("z-other", L("Autres biens"), z.other)}
    </div>
    <small class="hint zk-h" id="z-jcount-h">${L("Poids d'or pur (un bijou 18 carats contient 75 % d'or). Les écoles malikite, chaféite et hanbalite exemptent les bijoux portés de façon habituelle ; l'école hanafite les compte.")}</small>

    <h2 class="sec-h">${L("À déduire")}</h2>
    <div class="fgrp">
      ${r.borrowed ? `<label class="frow"><span class="fl wide">${L("Vos emprunts restant à rembourser")}</span><span class="num zk-v">${fmt(r.borrowed, c)}</span><input type="checkbox" id="z-owe" ${z.owe ? "checked" : ""} aria-label="${esc(L("Déduire vos emprunts restant à rembourser") + ", " + fmt(r.borrowed, c))}"></label>` : ""}
      ${amt("z-debts", L("Autres dettes à payer"), z.debts)}
    </div>

    <h2 class="sec-h">${L("Date de votre zakat")}</h2>
    <div class="fgrp">
      <div class="frow"><span class="fl" id="z-date-lab">${L("Date")}</span>${dateInput("z-date", esc(z.date), {opt: true, placeholder: L("Choisir")})}</div>
    </div>
    <p class="hint zk-h">${L("Aujourd'hui : ")}${esc(hijri(t0))}.${nx ? " " + L("Prochaine zakat le ") + esc(longDate(nx)) + " (" + esc(hijri(nx)) + ")" + (days ? ", " + L("dans ") + days + L(" jours") : ", " + L("aujourd'hui")) + "." : " " + L("Choisissez le jour où vos biens ont atteint le nisab (ou votre date habituelle, par exemple en Ramadan) : l'appli vous indiquera la date de l'année lunaire suivante.")}</p>
    <p class="hint">${L("Calcul indicatif : la zakat n'est due que si vos biens sont restés au-dessus du nisab pendant une année lunaire complète. Pour un cas particulier (entreprise, dettes, biens en commun), demandez conseil à un savant ou au conseil des oulémas.")}</p>
  </div>`;
}

/* saisie : lire les champs, recalculer sans redessiner (le focus reste en place) */
function zakatRead() {
  const z = ZK(), v = id => { const e = document.getElementById(id); return e ? e.value : null; }, ck = id => { const e = document.getElementById(id); return e ? e.checked : null; };
  const A = id => { const x = v(id); return x == null ? null : Math.max(0, parseAmt(x) || 0); }, G = id => { const x = v(id); return x == null ? null : zkNum(x); };
  for (const [k, id] of [["gPrice", "z-gp"], ["sPrice", "z-sp"], ["inv", "z-inv"], ["goods", "z-goods"], ["other", "z-other"], ["debts", "z-debts"]]) { const x = A(id); if (x != null) z[k] = x; }
  for (const [k, id] of [["goldG", "z-gold"], ["jewelG", "z-jewel"], ["silverG", "z-silver"]]) { const x = G(id); if (x != null) z[k] = x; }
  for (const [k, id] of [["recv", "z-recv"], ["owe", "z-owe"], ["jcount", "z-jcount"]]) { const x = ck(id); if (x != null) z[k] = x; }
  const b = document.querySelector('input[name="z-basis"]:checked'); if (b) z.basis = b.value;
  const boxes = [...document.querySelectorAll('input[name="z-acc"]')]; if (boxes.length) z.excl = boxes.filter(x => !x.checked).map(x => x.value);
  const d = v("z-date"); if (d != null) z.date = d;
  return z;
}
function zakatRefresh(speak) {
  const z = zakatRead(), r = zakatCalc(z), box = $("#z-res"); if (!box) return;
  box.innerHTML = zakatResult(z, r); box.classList.toggle("due", r.due > 0);
  const has = !!$("#view [data-act=zakat-pay]");
  if (has !== r.due > 0) { const k = focusKey(document.activeElement); render(); const el = k && document.querySelector(k); if (el) el.focus(); }
  if (speak) announce(r.noPrice ? "" : r.due ? L("Zakat à verser") + " : " + say(r.due, z.cur) : L("Pas de zakat due"));
}
document.addEventListener("input", e => { if (e.target.closest && e.target.closest("#zakat") && e.target.matches("input[type=text]")) zakatRefresh(false); });
document.addEventListener("change", e => {
  if (!(e.target.closest && e.target.closest("#zakat"))) return;
  zakatRead(); touch("meta");
  if (e.target.id === "z-cur" || e.target.id === "z-date") { ZK().cur = $("#z-cur").value; const k = focusKey(e.target.id === "z-cur" ? e.target._pk || e.target : document.getElementById("z-date-btn")); render(); const el = k && document.querySelector(k); if (el) el.focus(); announce(e.target.id === "z-cur" ? plural(ZK().cur) : ""); return; }
  zakatRefresh(true);
});
/* « Enregistrer le versement » : ouvre une dépense pré-remplie */
function zakatPay() {
  const z = ZK(), r = zakatCalc(z); if (!r.due) return;
  openTx(null, "dep");
  const a = accSorted().find(x => x.cur === z.cur && !z.excl.includes(x.id)) || accSorted().find(x => x.cur === z.cur);
  const c = cats("dep").find(x => /zak|زكا/i.test(x.name)) || cats("dep").find(x => x.icon === "❤️" || /don|charit|صدق|تبرع/i.test(x.name));
  draft.amtS = plain(a ? r.due : conv(r.due, z.cur, acc(draft.acc).cur)); draft.note = L("Zakat"); if (a) draft.acc = a.id; if (c) { draft.cat = c.id; draft.catTouched = true; }
  renderTx("f-amt");
}
