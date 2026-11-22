"use strict";
/* ================= opérations récurrentes ================= */
const FREQS = [["d1", L("Chaque jour")], ["w1", L("Chaque semaine")], ["w2", L("Toutes les deux semaines")], ["m1", L("Chaque mois")], ["m2", L("Tous les deux mois")], ["m3", L("Chaque trimestre")], ["m6", L("Chaque semestre")], ["y1", L("Chaque année")]];
const freqKey = r => r.unit + r.every;
const freqLabel = r => (FREQS.find(f => f[0] === freqKey(r)) || [0, L("Tous les ") + r.every + " " + ({d: L("jours"), w: L("semaines"), m: L("mois"), y: L("ans")})[r.unit]])[1];
function occ(r, k) {
  const [y, m, d] = r.start.split("-").map(Number), n = k * r.every;
  if (r.unit === "d") return ymd(new Date(y, m - 1, d + n));
  if (r.unit === "w") return ymd(new Date(y, m - 1, d + 7 * n));
  const mm = r.unit === "m" ? m - 1 + n : m - 1 + 12 * n, last = new Date(y, mm + 1, 0).getDate();
  return ymd(new Date(y, mm, Math.min(d, last)));
}
function dues(r, limit) {
  const out = [], lim = limit || today();
  for (let k = r.k; out.length < 500; k++) { const d = occ(r, k); if (d > lim || (r.end && d > r.end)) break; out.push({k, date: d}); }
  return out;
}
const nextOcc = r => { const d = occ(r, r.k); return r.end && d > r.end ? "" : d; };
const recTitle = r => r.note || (r.t === "vir" ? L("Virement") : catName(r.cat));
const recTx = (r, date) => { const t = {id: "r-" + r.id + "-" + date, t: r.t, amt: r.amt, acc: r.acc, cat: r.t === "vir" ? "" : r.cat, note: r.note, date, rec: r.id}; if (r.tags && r.tags.length) t.tags = r.tags.slice(); if (r.t === "vir") { t.to = r.to; if (r.amtTo != null) t.amtTo = r.amtTo; } return t; };
function recSign(r) { const a = acc(r.acc), c = a ? a.cur : base(); return (r.t === "rev" ? "+" : r.t === "dep" ? "−" : "") + fmt(r.amt, c); }
let lastAuto = "";
function runAuto(quiet) {
  if (!S) return 0;
  lastAuto = today();
  const have = new Set(allTx().map(t => t.id)), ch = new Set(); let n = 0;
  for (const r of S.meta.recurring) {
    if (r.mode !== "auto" || r.paused || !acc(r.acc)) continue;
    const ds = dues(r); if (!ds.length) continue;
    for (const {k, date} of ds) { const t = recTx(r, date); if (!have.has(t.id)) { putTx(t).forEach(i => ch.add(i)); have.add(t.id); n++; } r.k = k + 1; }
    ch.add("meta");
  }
  if (ch.size) touch(...ch);
  if (n && !quiet) toast(plur(n, L("opération récurrente ajoutée"), L("opérations récurrentes ajoutées")));
  return n;
}
/* Une échéance n'est comptée dans les dépenses que lorsqu'elle est marquée « Payée » (sauf mode automatique choisi exprès).
   payée = l'opération r-<récurrence>-<date> existe ; ignorée = r.skip ; avant r.k = déjà réglée, sauf si rouverte (r.open). */
const txIds = () => new Set(allTx().map(t => t.id));
const recTxId = (r, d) => "r-" + r.id + "-" + d;
const paidW = r => r && r.t === "rev" ? L("Reçue") : L("Payée");
function recState(r, d, have) {
  if ((have || txIds()).has(recTxId(r, d))) return "paid";
  if ((r.skip || []).includes(d)) return "skip";
  if (d < occ(r, r.k) && !(r.open || []).includes(d)) return "done";
  return "due";
}
function recOccs(r, from, to) { const out = []; for (let k = 0; k < 4000; k++) { const d = occ(r, k); if (d > to || (r.end && d > r.end)) break; if (d >= from) out.push(d); } return out; }
function recAdvance(r) {
  const have = txIds(), t0 = today();
  for (let n = 0; n < 2000; n++) { const d = occ(r, r.k); if (d > t0 || (r.end && d > r.end)) break; if (have.has(recTxId(r, d)) || (r.skip || []).includes(d)) { r.k++; r.open = (r.open || []).filter(x => x !== d); } else break; }
}
function recPay(r, d) {
  const t = recTx(r, d), ids = ["meta"]; if (!allTx().some(x => x.id === t.id)) ids.push(...putTx(t));
  r.skip = (r.skip || []).filter(x => x !== d); r.open = (r.open || []).filter(x => x !== d); recAdvance(r); touch(...ids);
}
function recUnpay(r, d, txId) {
  const m = removeTx(txId || recTxId(r, d)); r.skip = (r.skip || []).filter(x => x !== d);
  if (d < occ(r, r.k)) r.open = [...new Set([...(r.open || []), d])];
  touch("meta", ...(m ? ["tx-" + m] : []));
}
function recSkip(r, d) { r.skip = [...new Set([...(r.skip || []), d])]; r.open = (r.open || []).filter(x => x !== d); recAdvance(r); touch("meta"); }
const recDateOf = t => t && t.rec && t.id.startsWith("r-" + t.rec + "-") ? t.id.slice(-10) : "";
const pendingRecs = () => { const have = txIds(), t0 = today();
  return S.meta.recurring.filter(r => !r.paused && acc(r.acc)).map(r => { const set = new Set(r.open || []); dues(r).forEach(x => set.add(x.date));
    return {r, ds: [...set].filter(d => d <= t0 && recState(r, d, have) === "due").sort().map(date => ({date}))}; }).filter(x => x.ds.length).sort((a, b) => a.ds[0].date.localeCompare(b.ds[0].date)); };
