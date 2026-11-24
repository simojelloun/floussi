"use strict";
/* ================= préférences de l'appareil ================= */
const PK = "carnet-prefs";
let P = {style: "classic", mode: "auto", accent: "ocean", zoom: false, lastBackup: ""};
try { Object.assign(P, JSON.parse(localStorage.getItem(PK)) || {}); } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} };
const THEMES = {
  sapin:   {name: L("Sapin"),   l: ["#0E5F57", "#12302D", "#EDF1EE"], d: ["#56BDB1", "#1C2D2A", "#0E1514", "#172120"]},
  ocean:   {name: L("Océan"),   l: ["#1D5FA6", "#132A44", "#ECF0F5"], d: ["#6EA8EC", "#1A2840", "#0D1219", "#151D28"]},
  prune:   {name: L("Prune"),   l: ["#6A3D9E", "#2B1F3D", "#F1EEF5"], d: ["#B699E8", "#2A2240", "#120F18", "#1C1826"]},
  grenat:  {name: L("Grenat"),  l: ["#A1303E", "#3A1B21", "#F5EEEF"], d: ["#EE8C96", "#3A2328", "#170E10", "#221719"]},
  ambre:   {name: L("Ambre"),   l: ["#8F5300", "#33271A", "#F5F1EA"], d: ["#F0B45C", "#30281E", "#15110C", "#211C15"]},
  ardoise: {name: L("Ardoise"), l: ["#3C4B59", "#1D252D", "#EEF0F2"], d: ["#A8B8C8", "#242C35", "#101317", "#191E24"]}
};
function applyPrefs() {
  const pro = typeof isPro !== "function" || isPro(), root = document.documentElement, t = (pro && THEMES[P.accent]) || THEMES.sapin;
  if (P.mode === "light" || P.mode === "dark") root.setAttribute("data-mode", P.mode); else root.removeAttribute("data-mode");
  const dk = `--accent:${t.d[0]};--hero:${t.d[1]};--bg:${t.d[2]};--surface:${t.d[3]};--accent-ink:#0B1210`;
  $("#theme-style").textContent = `:root{--accent:${t.l[0]};--hero:${t.l[1]};--bg:${t.l[2]};--accent-ink:#FFFFFF}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-mode="light"]){${dk}}}
:root[data-theme="dark"]:not([data-mode="light"]),:root[data-mode="dark"]{${dk}}`;
  if (pro && P.style === "glass") root.setAttribute("data-style", "glass"); else root.removeAttribute("data-style");
  root.classList.toggle("nozoom", !P.zoom);
  $("#vp").setAttribute("content", P.zoom ? "width=device-width, initial-scale=1" : "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
}
applyPrefs();
