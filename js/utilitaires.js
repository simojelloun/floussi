"use strict";
/* ================= utilitaires ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => ymd(new Date());
/* heure facultative d'une opération (« 14:32 ») ; les anciennes opérations n'en ont pas */
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const okHM = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || "");
const txCmp = (a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "");
/* en espagnol, Intl ne groupe pas les milliers à 4 chiffres (« 1234,56 ») : on force le séparateur pour que les montants restent alignés */
const GRP = LANG === "es" ? "always" : true;
const NF = new Intl.NumberFormat(LOCALE, {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: GRP});
const NF4 = new Intl.NumberFormat(LOCALE, {minimumFractionDigits: 2, maximumFractionDigits: 4, useGrouping: GRP});
function parseNum(s) { const v = parseFloat(String(s).replace(/[\s  ]/g, "").replace(",", ".")); return isFinite(v) ? v : NaN; }
const parseAmt = s => parseLoose(s);
const plain = c => (c / 100).toFixed(2).replace(".", DEC);
const shiftMonth = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
const monthName = (ym, short) => { const [y, m] = ym.split("-").map(Number); return new Intl.DateTimeFormat(LOCALE, short ? {month: "short"} : {month: "long", year: "numeric"}).format(new Date(y, m - 1, 1)); };
const dayName = s => { const [y, m, d] = s.split("-").map(Number); return new Intl.DateTimeFormat(LOCALE, {weekday: "long", day: "numeric", month: "long"}).format(new Date(y, m - 1, d)); };
const longDate = s => { const [y, m, d] = s.split("-").map(Number); return new Intl.DateTimeFormat(LOCALE, {day: "numeric", month: "long", year: "numeric"}).format(new Date(y, m - 1, d)); };
const lastDay = ym => { const [y, m] = ym.split("-").map(Number); return ym + "-" + pad(new Date(y, m, 0).getDate()); };
const dm = s => s.slice(8) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4);
const nextDay = s => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + 1)); };
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const plur = (n, one, many) => n + " " + (n > 1 ? many : one);
