// Copie l'application web (dossier parent) dans www/, le dossier que Capacitor met dans l'appli installée.
// Lancé automatiquement par « npm run preparer-android », « preparer-ios » et « mettre-a-jour ».
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(here, ".."), www = join(here, "www");
const KEEP = ["index.html", "manifest.webmanifest", "confidentialite.html", "icon.svg", "css", "js", "fonts"];
rmSync(www, { recursive: true, force: true }); mkdirSync(www);
for (const f of KEEP) { if (!existsSync(join(src, f))) throw new Error("Fichier manquant dans l'appli web : " + f); cpSync(join(src, f), join(www, f), { recursive: true }); }
for (const f of readdirSync(src)) if (f.endsWith(".png")) cpSync(join(src, f), join(www, f));
console.log("Appli web copiée dans www/ (sw.js n'est pas utile dans la version installée).");
