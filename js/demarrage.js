"use strict";
/* ================= démarrage ================= */
const local = localLoad();
if (local) { if (local.meta && local.meta.v !== 3) IDB.set("avant-mise-a-jour-" + today(), JSON.parse(JSON.stringify(local))); S = local; migrate(S.meta); } else { S = demoStore(); demo = true; loading = !!(window.claude && window.claude.use); }
if (!NATIVE && "serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
applyStatic(); cur = base(); setPreset("month"); setSync("local"); runAuto(true);
if (LOCK()) showLock();
route(); initRemote();
const ACT = (() => { try { return new URLSearchParams(location.search).get("action"); } catch (e) { return null; } })();
if (ACT === "dep" || ACT === "rev") {
  try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
  const go = () => openTx(null, ACT); if (locked) afterUnlock.push(go); else setTimeout(go, 60);
}
IDB.get("snaps").then(x => { snaps = x || []; if (tab === "donnees") render(); });
if (NATIVE) nativeLoad().then(o => {
  if (!o) { if (!demo) nativeSave(true); return; }
  if (demo || o.stamp > stampOf(S)) {
    const was = demo; S = o.data; migrate(S.meta); demo = false; try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} idbSave(); protectStorage(); runAuto(true); setSync("local"); render();
    if (was) toast(L("Vos données ont été retrouvées et restaurées."));
  }
});
setTimeout(() => { if (S) loadPhotos(); }, 800);
if (local) { protectStorage(); idbSave(); }
else IDB.get("data").then(d => { if (d && d.meta && Array.isArray(d.meta.accounts) && demo) { S = d; migrate(S.meta); demo = false; localSave(); protectStorage(); runAuto(true); setSync(col ? "cloud" : "local"); render(); toast(L("Vos données ont été retrouvées et restaurées.")); } });
