// Contrôles rapides, sans navigateur :
//  1. chaque texte écrit L("…") dans js/ a sa traduction anglaise et arabe dans js/traductions.js ;
//  2. sw.js garde hors connexion tous les fichiers chargés par index.html ;
//  3. les emplacements des données sur le téléphone n'ont pas changé (sinon les données existantes seraient « perdues »).
// Usage : node outils/verifier-textes.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(root, f), "utf8");
let errors = 0;
const fail = m => { errors++; console.error("✗ " + m); };

// 1. traductions
const ctx = {}; vm.createContext(ctx); vm.runInContext(read("js/traductions.js").replace('"use strict";', "") + ";this.DICTS = DICTS;", ctx);
const D = ctx.DICTS;
const jsFiles = readdirSync(join(root, "js")).filter(f => f.endsWith(".js") && f !== "traductions.js" && f !== "icones.js");
const missing = new Map();
for (const f of jsFiles) {
  const src = read("js/" + f);
  for (const m of src.matchAll(/\bL\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) {
    const fr = JSON.parse('"' + m[1] + '"').trim(); if (!fr) continue;
    for (const lang of ["en", "es", "ar"]) if (!(fr in D[lang])) missing.set(lang + ":" + fr, f);
  }
}
for (const [k, f] of missing) fail(`traduction manquante (${k.slice(0, 2)}) dans ${f} : « ${k.slice(3)} »`);

// 2. fichiers gardés hors connexion
const html = read("index.html"), sw = read("sw.js");
const refs = [...html.matchAll(/(?:src|href)="((?:js|css|fonts)\/[^"]+)"/g)].map(m => m[1]);
const css = read("css/polices.css"); for (const m of css.matchAll(/url\(\.\.\/(fonts\/[^)]+)\)/g)) refs.push(m[1]);
const listed = new Set([...sw.matchAll(/"([^"]+)"/g)].map(m => m[1]));
for (const r of new Set(refs)) { if (!listed.has(r)) fail(`sw.js ne garde pas « ${r} » hors connexion (à ajouter dans FILES)`); if (!existsSync(join(root, r))) fail(`index.html charge « ${r} », qui n'existe pas`); }

// 3. emplacements des données : ne jamais les changer
const all = jsFiles.map(f => read("js/" + f)).join("\n");
for (const [what, re] of [["localStorage carnet-comptes-v1", /["']carnet-comptes-v1["']/], ["préférences carnet-prefs", /["']carnet-prefs["']/], ["base IndexedDB « flousi »", /indexedDB\.open\(\s*["']flousi["']/], ["fichier natif floussi/donnees.json", /["']floussi\/donnees\.json["']/]])
  if (!re.test(all)) fail(`l'emplacement des données « ${what} » a disparu du code : les données existantes ne seraient plus retrouvées`);

if (errors) { console.error(`\n${errors} problème(s).`); process.exitCode = 1; }
else console.log(`✓ Traductions complètes, fichiers hors connexion à jour, emplacements des données inchangés.`);
