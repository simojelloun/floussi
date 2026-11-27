// Floussi : contrôle avant d'envoyer l'appli à l'App Store et à Google Play.
// À lancer à la main :  node outils/verifier-stores.mjs
// (Ce contrôle n'est pas lancé par les tests GitHub : il signale ce qu'il VOUS reste à remplir.)
import { existsSync, readFileSync, readdirSync } from "node:fs";

const bloquant = [], conseil = [], ok = [];
const lire = f => existsSync(f) ? readFileSync(f, "utf8") : null;

// 1. Pages publiques demandées par les deux magasins
for (const [f, role] of [["confidentialite.html", "politique de confidentialité"], ["support.html", "page d'aide (URL d'assistance)"], ["conditions.html", "conditions d'utilisation"]]) {
  const t = lire(f);
  if (!t) { bloquant.push(`${f} manque (${role}).`); continue; }
  const trous = [...new Set(t.match(/\[(?:NOM DE L'ÉDITEUR|ADRESSE E-MAIL DE CONTACT|PUBLISHER NAME|CONTACT EMAIL|NOMBRE DEL EDITOR|CORREO DE CONTACTO|اسم الناشر|البريد الإلكتروني للتواصل)\]/g) || [])];
  if (trous.length) bloquant.push(`${f} : à remplir → ${trous.join(", ")}`); else ok.push(`${f} : complet.`);
}

// 2. Adresse de contact dans l'appli
const pro = lire("js/pro.js") || "";
if (/const SUPPORT_MAIL = "";/.test(pro)) conseil.push('js/pro.js : SUPPORT_MAIL est vide (adresse montrée dans « Changer de téléphone »).'); else ok.push("Adresse de contact présente dans l'appli.");

// 3. Aucun nom d'une plateforme concurrente affiché sans condition (règle Apple 2.3.10)
const src = readdirSync("js").filter(f => f.endsWith(".js") && f !== "traductions.js").map(f => [f, readFileSync("js/" + f, "utf8")]);
for (const [f, t] of src) t.split("\n").forEach((l, i) => {
  if (/^\s*(\/\/|\/\*|\*)/.test(l)) return;
  const m = l.match(/L\("[^"]*(Android|Google Play|Google Drive|Play Store)[^"]*"\)/);
  if (m && !/PLATFORM === "android"|IS_APPLE|!IS_APPLE/.test(l)) bloquant.push(`js/${f}:${i + 1} : « ${m[1]} » affiché aussi sur iPhone (Apple le refuse).`);
  if (/L\("[^"]*(site web|version web)[^"]*gratuit/.test(l)) bloquant.push(`js/${f}:${i + 1} : ne pas dire dans l'appli que la version web est gratuite (Apple le refuse).`);
});
ok.push("Textes de l'appli : aucune mention d'une plateforme concurrente sans condition.");

// 4. Achats : tout ce qu'Apple vérifie sur l'écran d'abonnement
for (const [motif, nom] of [[/pro-restore/, "bouton « Restaurer mes achats »"], [/PRO_TERMS/, "lien Conditions d'utilisation"], [/PRO_PRIVACY/, "lien Confidentialité"], [/renouvelé automatiquement/, "mention du renouvellement automatique"]])
  (motif.test(pro) ? ok : bloquant).push(`Écran Floussi Pro : ${nom}${motif.test(pro) ? " présent." : " MANQUE."}`);

// 5. Réglages de la version installée
const cap = JSON.parse(lire("mobile/capacitor.config.json") || "{}"), pkg = JSON.parse(lire("mobile/package.json") || "{}");
if (cap.server && cap.server.url) bloquant.push("mobile/capacitor.config.json : « server.url » doit être absent (l'appli doit fonctionner sans Internet).");
else ok.push(`Identifiant de l'appli : ${cap.appId} · version ${pkg.version} (identifiant définitif après la première publication).`);
const nat = lire("mobile/scripts/configurer-natif.mjs") || "";
for (const k of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSFaceIDUsageDescription", "ITSAppUsesNonExemptEncryption", "TARGETED_DEVICE_FAMILY", "targetSdkVersion"]) if (!nat.includes(k)) bloquant.push(`mobile/scripts/configurer-natif.mjs : réglage ${k} manquant.`);
if (!existsSync("mobile/ios-extras/PrivacyInfo.xcprivacy")) bloquant.push("mobile/ios-extras/PrivacyInfo.xcprivacy manque.");

console.log("\n✓ En ordre\n" + ok.map(x => "  · " + x).join("\n"));
if (conseil.length) console.log("\n• Conseillé\n" + conseil.map(x => "  · " + x).join("\n"));
if (bloquant.length) { console.log("\n✗ À corriger avant d'envoyer aux magasins\n" + bloquant.map(x => "  · " + x).join("\n") + "\n"); process.exit(1); }
console.log("\nTout est prêt côté fichiers. Suivez maintenant mobile/PUBLICATION.md.\n");
