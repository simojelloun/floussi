"use strict";
/* ================= calculs ================= */
const acc = id => S.meta.accounts.find(a => a.id === id);
const cat = id => S.meta.categories.find(c => c.id === id);
const loan = id => S.meta.loans.find(l => l.id === id);
const recOf = id => S.meta.recurring.find(r => r.id === id);
const allTx = () => Object.values(S.months).flatMap(m => m.items);
const monthTx = ym => (S.months[ym] ? S.months[ym].items : []);
const isIn = t => t.t === "rev" || (t.t === "pret" && t.dir === "in");
const cats = kind => S.meta.categories.filter(c => c.kind === kind);
const kids = id => S.meta.categories.filter(c => c.parent === id);
const topOf = id => { const c = cat(id); return c && c.parent && cat(c.parent) ? c.parent : id; };
const catName = id => { const c = cat(id); return c ? c.name : L("Sans catégorie"); };
const catLabel = id => { const c = cat(id); if (!c) return L("Sans catégorie"); const p = c.parent && cat(c.parent); return p ? p.name + " : " + c.name : c.name; };
function chipHtml(c, fallback) {
  if (!c) return ICON_SVG[fallback] ? `<span class="chip ic" style="--cc:#2a78d6" aria-hidden="true">${svgIcon(fallback)}</span>` : `<span class="chip" aria-hidden="true">${esc(fallback || "?")}</span>`;
  if (c.icon && c.icon !== "img" && ICON_SVG[c.icon]) return `<span class="chip ic" style="--cc:${esc(c.color || "#6b7a86")}" aria-hidden="true">${svgIcon(c.icon)}</span>`;
  const st = `style="--cc:${esc(c.color || "#6b7a86")}"`;
  if (c.icon === "img" && c.img) return `<span class="chip" ${st} aria-hidden="true"><img src="${esc(c.img)}" alt=""></span>`;
  return `<span class="chip emo" ${st} aria-hidden="true"><span class="e">${esc(c.icon && c.icon !== "img" ? c.icon : c.name[0])}</span></span>`;
}
const accChip = a => `<span class="chip acc" style="--ac:${esc(a.color || "var(--muted)")}" aria-hidden="true">${esc(sym(a.cur))}<i></i></span>`;
function catOpts(kind, sel) {
  return cats(kind).filter(c => !c.parent).map(p => `<option value="${esc(p.id)}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>` +
    kids(p.id).map(c => `<option value="${esc(c.id)}" data-p="${esc(p.id)}" ${c.id === sel ? "selected" : ""}>${esc(p.name + " : " + c.name)}</option>`).join("")).join("");
}
function balance(a) {
  let b = a.initial;
  for (const t of allTx()) {
    if (t.acc === a.id) b += isIn(t) ? t.amt : -t.amt;
    if (t.t === "vir" && t.to === a.id) b += (t.amtTo ?? t.amt);
  }
  return b;
}
function usedCurs() {
  const used = new Set(S.meta.accounts.map(a => a.cur));
  const l = S.meta.currencies.map(c => c.code).filter(c => used.has(c));
  return l.length ? l : [base()];
}
/* un filtre = un ensemble de comptes + la devise d'affichage */
function mkF(ids, out) { const set = new Set(ids); return {has: a => !!a && set.has(a.id), out, ids: [...set]}; }
const curF = c => mkF(S.meta.accounts.filter(a => a.cur === c).map(a => a.id), c);
function flowsBetween(from, to, F) {
  let rev = 0, dep = 0; const byTop = {dep: {}, rev: {}}, byCat = {};
  for (const t of allTx()) {
    if (t.date < from || t.date > to || (t.t !== "rev" && t.t !== "dep")) continue;
    const a = acc(t.acc); if (!F.has(a)) continue;
    const v = conv(t.amt, a.cur, F.out), tp = topOf(t.cat);
    if (t.t === "rev") rev += v; else dep += v;
    byTop[t.t][tp] = (byTop[t.t][tp] || 0) + v; byCat[t.cat] = (byCat[t.cat] || 0) + v;
  }
  return {rev, dep, byTop, byCat};
}
const monthFlows = (ym, F) => flowsBetween(ym + "-01", lastDay(ym), F);
function budgetState(b, ym) {
  const f = monthFlows(ym, curF(b.cur)), c = cat(b.cat);
  const spent = (c && !c.parent ? f.byTop.dep[b.cat] : f.byCat[b.cat]) || 0, r = b.limit ? spent / b.limit : 0;
  return {spent, r, cls: r > 1 ? "crit" : r >= .8 ? "warn" : "", label: r > 1 ? L("Dépassé") : r >= .8 ? L("Bientôt atteint") : L("Dans le budget")};
}
function delta(t, F) {
  let d = 0; const a = acc(t.acc);
  if (F.has(a)) d += conv(isIn(t) ? t.amt : -t.amt, a.cur, F.out);
  if (t.t === "vir") { const b = acc(t.to); if (F.has(b)) d += conv(t.amtTo ?? t.amt, b.cur, F.out); }
  return d;
}
function loanState(l) {
  let principal = 0, repaid = 0; const items = allTx().filter(t => t.t === "pret" && t.loan === l.id);
  for (const t of items) t.mv === "base" ? principal += t.amt : repaid += t.amt;
  return {principal, repaid, rest: principal - repaid, items, done: principal > 0 && repaid >= principal};
}
function loanTotals(kind) {
  const m = {};
  for (const l of S.meta.loans) { if (l.kind !== kind) continue; const s = loanState(l); if (s.rest > 0) m[l.cur] = (m[l.cur] || 0) + s.rest; }
  return m;
}
const listAmounts = m => Object.keys(m).length ? Object.entries(m).map(([c, v]) => fmt(v, c)).join(" · ") : L("Rien");
const sumBase = (m, to) => Object.entries(m).reduce((s, [c, v]) => s + conv(v, c, to || base()), 0);
