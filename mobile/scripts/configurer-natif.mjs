// Floussi : réglages natifs ajoutés après « npx cap add android » ou « npx cap add ios ».
// Le script peut être relancé sans risque : il n'ajoute rien qui soit déjà présent.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let done = 0;

// ----- Android -----
const manifest = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  let x = readFileSync(manifest, "utf8");
  // Copie quotidienne dans Documents › Floussi : nécessaire seulement jusqu'à Android 10.
  const perms = [
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
    // Déverrouillage par empreinte ou visage.
    '<uses-permission android:name="android.permission.USE_BIOMETRIC" />'
  ];
  for (const p of perms) {
    const name = p.match(/android:name="([^"]+)"/)[1];
    if (!x.includes(`android:name="${name}"`)) x = x.replace(/(\s*)<\/manifest>/, `$1    ${p}$1</manifest>`);
  }
  if (!x.includes("requestLegacyExternalStorage")) x = x.replace("<application", '<application\n        android:requestLegacyExternalStorage="true"');
  writeFileSync(manifest, x); done++;
  console.log("Android : réglages ajoutés dans", manifest);
}

// ----- iOS -----
const plist = "ios/App/App/Info.plist";
if (existsSync(plist)) {
  let x = readFileSync(plist, "utf8");
  const keys = [
    // Rend le dossier Floussi visible dans l'app Fichiers (Sur mon iPhone › Floussi).
    ["UIFileSharingEnabled", "<true/>"],
    ["LSSupportsOpeningDocumentsInPlace", "<true/>"],
    // Photos des tickets.
    ["NSCameraUsageDescription", "<string>Floussi utilise l'appareil photo uniquement pour photographier un ticket de caisse que vous joignez à une opération.</string>"],
    ["NSPhotoLibraryUsageDescription", "<string>Floussi accède à vos photos uniquement pour joindre l'image d'un ticket à une opération.</string>"],
    // Déverrouillage par Face ID (sans ce texte, l'appli se fermerait à la première demande).
    ["NSFaceIDUsageDescription", "<string>Floussi utilise Face ID uniquement pour déverrouiller l'appli à la place de votre code.</string>"],
    ["ITSAppUsesNonExemptEncryption", "<false/>"]
  ];
  for (const [k, v] of keys) if (!x.includes(`<key>${k}</key>`)) x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${k}</key>\n\t${v}\n</dict>\n</plist>\n`);
  writeFileSync(plist, x); done++;
  console.log("iOS : réglages ajoutés dans", plist);
}

if (!done) console.log("Rien à configurer : lancez d'abord « npx cap add android » ou « npx cap add ios ».");
