"use strict";
/* ================= sauvegarde, export ================= */
async function offerFile(filename, data, okMsg) {
  if (NATIVE) return nativeShare(filename, data, okMsg);
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
    if (dl) { await dl.save({filename, data}); toast(okMsg); return true; }
  } catch (e) { if (e && e.code === "declined") return false; }
  try {
    const url = URL.createObjectURL(new Blob([data], {type: filename.endsWith(".json") ? "application/json" : "text/csv;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast(okMsg); return true;
  } catch (e) {}
  try { await navigator.clipboard.writeText(data); toast(L("Téléchargement indisponible ici : le contenu est copié dans le presse-papiers.")); return true; }
  catch (e) { toast(L("L'enregistrement de fichier n'est pas disponible dans cette vue.")); return false; }
}
/* sauvegarde vers iCloud Drive (ou Fichiers) par la feuille de partage du téléphone */
function backupJSON() {
  const keys = new Set(allTx().filter(t => t.ph).map(phKeyOf)), photos = {}; keys.forEach(k => { if (PHOTOS[k]) photos[k] = PHOTOS[k]; });
  return JSON.stringify({app: "carnet-comptes", version: 3, exportedAt: new Date().toISOString(), data: S, photos});
}
function backupFile() {
  const data = backupJSON();
  try { return new File([data], "floussi-sauvegarde-" + today() + ".json", {type: "application/json"}); } catch (e) { return null; }
}
const canCloud = () => { if (NATIVE) return !!NP("Share"); try { const f = new File(["{}"], "test.json", {type: "application/json"}); return !!(f && navigator.canShare && navigator.canShare({files: [f]})); } catch (e) { return false; } };
const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const cloudName = () => IS_APPLE ? "iCloud" : NATIVE ? "Drive" : L("Fichiers");
async function doCloudBackup() {
  if (NATIVE) { await loadPhotos(); if (await nativeShare("floussi-sauvegarde-" + today() + ".json", backupJSON(), L("Sauvegarde du jour faite"))) { P.lastBackup = today(); savePrefs(); render(); } return; }
  if (!canCloud()) return doBackup();
  try {
    await navigator.share({files: [backupFile()], title: "Floussi"});
    P.lastBackup = today(); savePrefs(); render(); toast(L("Sauvegarde du jour faite"));
  } catch (e) { if (!e || e.name !== "AbortError") doBackup(); }
}
function dailyBlock() {
  if (!P.daily || demo || P.lastBackup === today() || P.skipDay === today() || !allTx().length) return "";
  const cloud = canCloud();
  return `<div class="banner" role="note"><span><b>${L("Sauvegarde du jour")}</b> ${P.lastBackup ? L("Dernière sauvegarde :") + " " + longDate(P.lastBackup) + "." : L("Aucune sauvegarde pour l'instant.")}</span>
    <div class="actions"><button type="button" class="btn ghost" data-act="daily-skip">${L("Plus tard")}</button><button type="button" class="btn" data-act="${cloud ? "cloud-backup" : "backup"}">${cloud ? L("Enregistrer dans") + " " + cloudName() : L("Enregistrer la sauvegarde")}</button></div></div>`;
}
async function doBackup() {
  await loadPhotos(); const data = backupJSON();
  if (await offerFile("floussi-sauvegarde-" + today() + ".json", data, L("Sauvegarde enregistrée sur l'appareil"))) { P.lastBackup = today(); savePrefs(); render(); }
}
function restoreBackup(obj) {
  const d = obj && obj.data;
  if (!d || !d.meta || !d.months || !Array.isArray(d.meta.accounts)) return toast(L("Ce fichier n'est pas une sauvegarde de Floussi."));
  const when = obj.exportedAt ? longDate(obj.exportedAt.slice(0, 10)) : L("date inconnue"), n = Object.values(d.months).reduce((s, m) => s + (m.items || []).length, 0);
  confirmSheet(`${L("Remplacer toutes vos données actuelles par la sauvegarde du ")}${when} (${plur(d.meta.accounts.length, L("compte"), L("comptes"))}, ${plur(n, L("opération"), L("opérations"))}) ?`, L("Restaurer"), () => {
    const old = Object.keys(S.months);
    demo = false; S = {meta: migrate(d.meta), months: d.months};
    old.forEach(m => { if (!S.months[m]) S.months[m] = {items: [], updatedAt: 0}; });
    if (obj.photos && typeof obj.photos === "object") Object.entries(obj.photos).forEach(([k, v]) => { if (typeof v === "string" && v.startsWith("data:image/")) { PHOTOS[k] = v; IDB.set("ph-" + k, v); NFS.write("floussi/photos/" + k + ".txt", v); } });
    touch(...docIds()); setSync(col ? "cloud" : "local"); runAuto(true); render(); toast(L("Sauvegarde restaurée"));
  });
}
function csv() {
  const q = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
  const typ = t => t.t === "dep" ? L("Dépense") : t.t === "rev" ? L("Revenu") : t.t === "vir" ? L("Virement") : t.dar ? L("Daret") : (loan(t.loan)?.kind === "lent" ? (t.mv === "base" ? L("Prêt accordé") : L("Remboursement reçu")) : (t.mv === "base" ? L("Emprunt") : L("Remboursement versé")));
  const rows = [[L("Date"), L("Type"), L("Montant"), L("Devise"), L("Compte"), L("Catégorie"), L("Tiers"), L("Note"), L("Compte de destination"), L("Montant reçu"), L("Devise reçue"), L("Heure")]];
  allTx().sort((a, b) => txCmp(b, a)).forEach(t => {
    const a = acc(t.acc), b = acc(t.to);
    rows.push([dm(t.date), typ(t), plain(isIn(t) ? t.amt : -t.amt), a ? a.cur : "", a ? a.name : "", t.cat ? catLabel(t.cat) : "", t.t === "pret" ? (t.dar ? daret(t.dar)?.name : loan(t.loan)?.person) || "" : "", t.note, b ? b.name : "", t.t === "vir" ? plain(t.amtTo ?? t.amt) : "", b ? b.cur : "", t.time || ""]);
  });
  return "﻿" + rows.map(r => r.map(q).join(";")).join("\r\n");
}
