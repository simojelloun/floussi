"use strict";
/* ================= verrouillage par code ou Face ID ================= */
const LOCK = () => !!(P.lock && P.lock.hash);
async function sha(x) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, "0")).join(""); }
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(v => v.toString(16).padStart(2, "0")).join("");
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
let locked = false, pinBuf = "", pinFails = 0, lockUntil = 0, hiddenAt = 0, bioAvail = false;
const afterUnlock = [];
/* Dans la version installée (App Store / Google Play), Face ID et l'empreinte passent par le module natif
   @capgo/capacitor-native-biometric ; dans le navigateur, par WebAuthn (passkey de l'appareil). */
const NBIO = () => NP("NativeBiometric");
let bioKind = "";
(async () => {
  try {
    if (NATIVE) { const nb = NBIO(); if (nb) { const r = await nb.isAvailable({useFallback: false}); bioAvail = !!(r && r.isAvailable); bioKind = r && (r.biometryType === 2 || r.biometryType === 4) ? "face" : r && (r.biometryType === 1 || r.biometryType === 3) ? "finger" : ""; } }
    else bioAvail = !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch (e) { bioAvail = false; }
  if (tab === "verrouillage") render(); if (locked) { renderLock(); bioAuto(); }
})();
const bioName = () => bioKind === "face" ? (IS_APPLE ? L("Face ID") : L("Reconnaissance du visage")) : bioKind === "finger" ? (IS_APPLE ? L("Touch ID") : L("Empreinte digitale")) : L("Face ID ou l'empreinte");
async function nativeVerify() {
  const nb = NBIO(); if (!nb) return false;
  try { await nb.verifyIdentity({reason: L("Déverrouiller Floussi"), title: L("Déverrouiller Floussi"), subtitle: "", description: "", negativeButtonText: L("Utiliser le code"), useFallback: false, maxAttempts: 3}); return true; }
  catch (e) { return false; }
}
/* propose Face ID tout de suite à l'ouverture (version installée seulement : le navigateur exige un geste) */
let bioTried = false;
function bioAuto() { if (NATIVE && locked && P.lock && P.lock.bio && bioAvail && !bioTried) { bioTried = true; setTimeout(bioUnlock, 250); } }
const FACE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5c1.4 1.1 3.6 1.1 5 0"/></svg>`;
function showLock() {
  if (!LOCK() || locked) return;
  if (calCtx) closeCal(); if (pkCtx) closePick(true);
  locked = true; pinBuf = "";
  const lk = $("#lock"); lk.hidden = false; $("#app").inert = true; $("#wrap").inert = true; $("#cal").inert = true;
  renderLock(); const h = $("#lock-t"); if (h) h.focus();
  bioTried = false; bioAuto();
}
function renderLock(mode, msg) {
  const lk = $("#lock"), logo = ($(".brand .logo") || {}).outerHTML || "";
  if (mode === "forgot") {
    lk.innerHTML = `<div class="lock-in"><div class="lock-logo">${logo}</div><h2 id="lock-t" tabindex="-1">${L("Code oublié ?")}</h2>
      <p class="lock-txt">${L("Sans le code, la seule solution est d'effacer les données de Floussi sur cet appareil. Vous pourrez ensuite restaurer un fichier de sauvegarde.")}</p>
      <div class="actions vert" style="width:100%;max-width:300px"><button type="button" class="btn danger" data-act="lock-erase">${L("Effacer les données et le code")}</button><button type="button" class="btn ghost" data-act="lock-back">${L("Retour")}</button></div></div>`;
    $("#lock-t").focus(); return;
  }
  const n = P.lock.len, bio = P.lock.bio && bioAvail;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", bio ? "bio" : "", "0", "del"];
  lk.innerHTML = `<div class="lock-in"><div class="lock-logo">${logo}</div><h2 id="lock-t" tabindex="-1">${L("Floussi est verrouillée")}</h2>
    <p class="lock-txt" id="lock-msg" aria-live="assertive">${esc(msg || L("Entrez votre code"))}</p>
    <div class="dots" id="dots" aria-hidden="true">${[...Array(n)].map((_, i) => `<i class="${i < pinBuf.length ? "on" : ""}"></i>`).join("")}</div>
    <p class="sr" id="lock-count" aria-live="polite"></p>
    <div class="pad">${keys.map(k => !k ? "<span></span>" : `<button type="button" data-act="pin" data-k="${k}" aria-label="${esc(k === "del" ? L("Effacer le dernier chiffre") : k === "bio" ? L("Déverrouiller avec") + " " + bioName() : k)}">${k === "del" ? "⌫" : k === "bio" ? FACE_SVG : k}</button>`).join("")}</div>
    <button type="button" class="lock-forgot" data-act="pin-forgot">${L("Code oublié ?")}</button></div>`;
}
function dotsUpdate() { document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i < pinBuf.length)); const c = $("#lock-count"); if (c) c.textContent = pinBuf.length + " / " + P.lock.len; }
async function pinPress(k) {
  if (Date.now() < lockUntil) { const m = $("#lock-msg"); if (m) m.textContent = L("Trop d'essais. Réessayez dans") + " " + Math.ceil((lockUntil - Date.now()) / 1000) + " s"; return; }
  if (k === "bio") return bioUnlock();
  if (k === "del") pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < P.lock.len) pinBuf += k;
  dotsUpdate();
  if (pinBuf.length === P.lock.len) {
    const ok = (await sha(P.lock.salt + pinBuf)) === P.lock.hash;
    if (ok) return unlock();
    pinFails++; pinBuf = "";
    const d = $("#dots"); if (d) { d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); }
    if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) {}
    if (pinFails % 5 === 0) lockUntil = Date.now() + 30000;
    setTimeout(() => { dotsUpdate(); const m = $("#lock-msg"); if (m) m.textContent = pinFails % 5 === 0 ? L("Trop d'essais. Réessayez dans") + " 30 s" : L("Code incorrect"); }, 380);
  }
}
function unlock() {
  locked = false; pinFails = 0; pinBuf = "";
  const lk = $("#lock"); lk.hidden = true; lk.innerHTML = ""; $("#wrap").inert = false; $("#cal").inert = false; $("#app").inert = !$("#wrap").hidden;
  const fns = afterUnlock.splice(0); if (fns.length) fns.forEach(f => f()); else $("#title").focus();
}
async function bioRegister() {
  if (NATIVE) { if (!(await nativeVerify())) return false; P.lock.bio = "natif"; savePrefs(); return true; }
  try {
    const cred = await navigator.credentials.create({publicKey: {challenge: crypto.getRandomValues(new Uint8Array(32)), rp: {name: "Floussi"},
      user: {id: crypto.getRandomValues(new Uint8Array(16)), name: "flousi", displayName: "Floussi"},
      pubKeyCredParams: [{type: "public-key", alg: -7}, {type: "public-key", alg: -257}],
      authenticatorSelection: {authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged"}, timeout: 60000}});
    P.lock.bio = b64(cred.rawId); savePrefs(); return true;
  } catch (e) { return false; }
}
async function bioUnlock() {
  if (NATIVE) { if (!locked) return; if (await nativeVerify()) unlock(); else { const m = $("#lock-msg"); if (m) m.textContent = bioName() + " " + L("n'a pas abouti. Entrez votre code."); } return; }
  try {
    await navigator.credentials.get({publicKey: {challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{type: "public-key", id: unb64(P.lock.bio)}], userVerification: "required", timeout: 60000}});
    unlock();
  } catch (e) { const m = $("#lock-msg"); if (m) m.textContent = L("Face ID n'a pas abouti. Entrez votre code."); }
}
async function setPin(pin) { const salt = rnd(16); P.lock = {salt, hash: await sha(salt + pin), len: pin.length, delay: (P.lock && P.lock.delay) || 0, bio: P.lock && P.lock.bio}; if (!P.lock.bio) delete P.lock.bio; savePrefs(); }
async function pinOk(pin) { return LOCK() && (await sha(P.lock.salt + pin)) === P.lock.hash; }
function openPin(mode) {
  const f = (id, lab) => `<label class="f"><span>${lab}</span><input type="password" id="${id}" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off"></label>`;
  const title = mode === "on" ? L("Activer le code") : mode === "change" ? L("Changer le code") : L("Désactiver le code");
  openSheet(head(esc(title)) + `<form novalidate>
    ${mode !== "on" ? f("pin-cur", L("Code actuel")) : ""}
    ${mode !== "off" ? f("pin-new", L("Nouveau code (4 à 6 chiffres)")) + f("pin-new2", L("Confirmez le nouveau code")) : ""}
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="submit" class="btn${mode === "off" ? " danger" : ""}">${esc(title)}</button></div></form>`, async () => {
    if (mode !== "on" && !(await pinOk($("#pin-cur").value))) return err(L("Code actuel incorrect."), "pin-cur");
    if (mode === "off") { delete P.lock; savePrefs(); closeSheet(); render(); return toast(L("Code désactivé")); }
    const a = $("#pin-new").value, b = $("#pin-new2").value;
    if (!/^\d{4,6}$/.test(a)) return err(L("Le code doit contenir 4 à 6 chiffres."), "pin-new");
    if (a !== b) return err(L("Les deux codes ne sont pas identiques."), "pin-new2");
    await setPin(a); closeSheet(); render(); toast(mode === "on" ? L("Code activé : Floussi le demandera à l'ouverture.") : L("Code modifié"));
  });
}
function vVerrouillage() {
  const on = LOCK(), delays = [[0, L("Immédiatement")], [1, L("Après 1 minute")], [5, L("Après 5 minutes")], [15, L("Après 15 minutes")]];
  return backLink("reglages") + `<div class="card" style="display:flex;flex-direction:column;gap:12px">
    <p style="margin:0;color:var(--ink-2)">${on ? L("Le code est activé : Floussi le demande à l'ouverture.") : L("Protégez l'accès à Floussi par un code de 4 à 6 chiffres.")}</p>
    ${on ? `<label class="f"><span>${L("Verrouiller quand l'appli passe en arrière-plan")}</span><select id="lock-delay">${delays.map(([v, l]) => `<option value="${v}" ${(P.lock.delay || 0) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      ${bioAvail ? `<label class="check"><input type="checkbox" id="lock-bio" ${P.lock.bio ? "checked" : ""}><span>${L("Déverrouiller avec")} ${esc(bioName())}</span></label>` : `<p class="hint">${NATIVE ? L("Face ID ou l'empreinte ne sont pas réglés sur ce téléphone. Activez-les dans les réglages du téléphone, puis revenez ici.") : L("Face ID ou l'empreinte ne sont pas disponibles ici. Ils fonctionnent dans la version installée depuis GitHub.")}</p>`}
      <div class="actions vert"><button type="button" class="btn" data-act="lock-now">${L("Verrouiller maintenant")}</button><button type="button" class="btn ghost" data-act="pin-change">${L("Changer le code")}</button><button type="button" class="btn danger" data-act="pin-off">${L("Désactiver le code")}</button></div>`
    : `<button type="button" class="btn" data-act="pin-on">${L("Activer le code")}</button>`}
    <p class="hint">${L("Le code protège l'accès à l'appli sur cet appareil. Il ne chiffre pas les données : gardez aussi votre téléphone verrouillé.")}</p></div>`;
}
document.addEventListener("keydown", e => {
  if (!locked) return;
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pinPress(e.key); }
  else if (e.key === "Backspace") { e.preventDefault(); pinPress("del"); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (LOCK() && !locked && hiddenAt && Date.now() - hiddenAt >= (P.lock.delay || 0) * 60000) showLock();
});
