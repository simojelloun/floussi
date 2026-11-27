// Floussi : réglages natifs ajoutés après « npx cap add android » ou « npx cap add ios ».
// Le script peut être relancé sans risque : il n'ajoute rien qui soit déjà présent.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

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
  // Google Play refuse les nouvelles applis qui ne ciblent pas Android 16 (niveau d'API 36) ou plus.
  const vg = "android/variables.gradle", MIN = 36;
  if (existsSync(vg)) {
    let v = readFileSync(vg, "utf8"), ch = false;
    for (const k of ["compileSdkVersion", "targetSdkVersion"]) v = v.replace(new RegExp("(" + k + "\\s*=\\s*)(\\d+)"), (m, a, n) => { if (+n >= MIN) return m; ch = true; return a + MIN; });
    if (ch) { writeFileSync(vg, v); console.log("Android : niveau d'API cible porté à " + MIN + " (exigé par Google Play)."); }
  }
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
    ["NSCameraUsageDescription", "<string>Floussi uses the camera only to photograph a receipt you attach to a transaction. / Floussi utilise l'appareil photo uniquement pour photographier un ticket de caisse que vous joignez à une opération.</string>"],
    ["NSPhotoLibraryUsageDescription", "<string>Floussi accesses your photos only to attach a receipt image to a transaction. / Floussi accède à vos photos uniquement pour joindre l'image d'un ticket à une opération.</string>"],
    // Déverrouillage par Face ID (sans ce texte, l'appli se fermerait à la première demande).
    ["NSFaceIDUsageDescription", "<string>Floussi uses Face ID only to unlock the app instead of your passcode. / Floussi utilise Face ID uniquement pour déverrouiller l'appli à la place de votre code.</string>"],
    ["ITSAppUsesNonExemptEncryption", "<false/>"],
    // Langues de l'appli (affichées sur la fiche App Store).
    ["CFBundleLocalizations", "<array>\n\t\t<string>fr</string>\n\t\t<string>en</string>\n\t\t<string>es</string>\n\t\t<string>ar</string>\n\t</array>"]
  ];
  for (const [k, v] of keys) if (!x.includes(`<key>${k}</key>`)) x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${k}</key>\n\t${v}\n</dict>\n</plist>\n`);
  // iPhone tenu droit uniquement : l'appli est pensée pour le portrait (un écran couché mal rendu est un motif de refus).
  x = x.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/, "$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2");
  writeFileSync(plist, x); done++;
  console.log("iOS : réglages ajoutés dans", plist);
  // iPhone seulement : sans cela Apple teste aussi l'appli sur iPad et exige des captures d'écran iPad.
  const pbx = "ios/App/App.xcodeproj/project.pbxproj";
  if (existsSync(pbx)) { const y = readFileSync(pbx, "utf8"), z = y.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = "1";'); if (z !== y) { writeFileSync(pbx, z); console.log("iOS : appli limitée à l'iPhone (pas d'iPad)."); } }
  // Déclaration de confidentialité d'Apple (aucune donnée collectée, aucun suivi).
  const pm = "ios/App/App/PrivacyInfo.xcprivacy";
  if (!existsSync(pm) && existsSync("ios-extras/PrivacyInfo.xcprivacy")) { copyFileSync("ios-extras/PrivacyInfo.xcprivacy", pm); console.log("iOS : PrivacyInfo.xcprivacy copié. À FAIRE UNE FOIS dans Xcode : glissez ce fichier depuis le Finder sur le dossier « App » (cochez la cible App)."); }
}

if (!done) console.log("Rien à configurer : lancez d'abord « npx cap add android » ou « npx cap add ios ».");
