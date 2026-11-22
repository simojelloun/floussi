"use strict";
/* ================= langues ================= */
const LANG = (() => { try { const p = JSON.parse(localStorage.getItem("carnet-prefs")); if (p && p.lang) return p.lang; } catch (e) {} const n = (navigator.language || "fr").slice(0, 2); return n === "ar" || n === "en" ? n : "fr"; })();
const LOCALE = {fr: "fr-FR", en: "en-GB", ar: "ar-MA"}[LANG] || "fr-FR";
const DEC = LANG === "en" ? "." : ",";
const DICT = DICTS[LANG] || {};
function L(s) { if (LANG === "fr" || s == null) return s; const m = String(s).match(/^(\s*)([\s\S]*?)(\s*)$/); const t = DICT[m[2]]; return t == null ? s : m[1] + t + m[3]; }
document.documentElement.lang = LANG; document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
