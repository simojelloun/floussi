"use strict";
/* ================= données ================= */
const LS = "carnet-comptes-v1";
const DEF_CATS = [
  ["c-alim",L("Alimentation"),"dep"],["c-log",L("Logement"),"dep"],["c-trans",L("Transport"),"dep"],["c-fact",L("Factures"),"dep"],
  ["c-sante",L("Santé"),"dep"],["c-lois",L("Loisirs"),"dep"],["c-shop",L("Achats"),"dep"],["c-educ",L("Éducation"),"dep"],
  ["c-voy",L("Voyage"),"dep"],["c-div",L("Divers"),"dep"],["r-sal",L("Salaire"),"rev"],["r-prime",L("Prime"),"rev"],["r-autre",L("Autres revenus"),"rev"]
].map(([id, name, kind]) => ({id, name, kind, parent: "", icon: ICON_DEF[id][0], color: COLORS[ICON_DEF[id][1]][0]}));
const DEF_ACCS = [
  {id: "a-esp", name: L("Espèces"), cur: "MAD", initial: 0, color: "#eda100"},
  {id: "a-mad", name: L("Compte courant Maroc"), cur: "MAD", initial: 0, color: "#e34948"},
  {id: "a-eur", name: L("Compte courant France"), cur: "EUR", initial: 0, color: "#2a78d6"},
  {id: "a-ep", name: L("Épargne"), cur: "MAD", initial: 0, color: "#008300"}
];
const freshMeta = () => ({v: 3, base: "MAD", currencies: clone(DEF_CURS), ratesDate: today(), accounts: clone(DEF_ACCS), categories: clone(DEF_CATS), budgets: [], loans: [], recurring: [], updatedAt: Date.now()});
function migrate(m) {
  if (!m) return m;
  if (!Array.isArray(m.currencies) || !m.currencies.length) m.currencies = clone(DEF_CURS);
  if (!m.base || !m.currencies.some(c => c.code === m.base)) m.base = m.currencies[0].code;
  if (!Array.isArray(m.loans)) m.loans = [];
  if (!Array.isArray(m.recurring)) m.recurring = [];
  if (!Array.isArray(m.templates)) m.templates = [];
  if (!m.zakat || typeof m.zakat !== "object") m.zakat = {};
  if (!Array.isArray(m.darets)) m.darets = [];
  if (!m.ratesDate) m.ratesDate = today();
  m.accounts.forEach((a, i) => { if (!a.color) a.color = COLORS[(i * 3) % COLORS.length][0]; });
  m.categories.forEach((c, i) => {
    if (c.parent == null) c.parent = "";
    const d = ICON_DEF[c.id];
    if (!c.icon) c.icon = d ? d[0] : "📦";
    if (!c.color) c.color = COLORS[d ? d[1] : i % COLORS.length][0];
  });
  m.v = 3; return m;
}

function demoStore() {
  const meta = freshMeta(); meta.updatedAt = 0;
  [250000, 1240000, 152000, 2500000].forEach((v, i) => meta.accounts[i].initial = v);
  meta.categories.push(
    {id: "c-alim-rest", name: L("Restaurant"), kind: "dep", parent: "c-alim", icon: "🍽️", color: COLORS[0][0]},
    {id: "c-alim-marche", name: L("Marché"), kind: "dep", parent: "c-alim", icon: "🍎", color: COLORS[0][0]},
    {id: "c-trans-carb", name: L("Carburant"), kind: "dep", parent: "c-trans", icon: "⛽", color: COLORS[1][0]},
    {id: "c-lois-sport", name: L("Sport"), kind: "dep", parent: "c-lois", icon: "🏋️", color: COLORS[4][0]},
    {id: "r-cours", name: L("Cours particuliers"), kind: "rev", parent: "r-autre", icon: "🎓", color: COLORS[3][0]});
  meta.budgets = [
    {id: "b1", cat: "c-alim", cur: "MAD", limit: 300000}, {id: "b2", cat: "c-lois", cur: "MAD", limit: 90000},
    {id: "b3", cat: "c-trans", cur: "MAD", limit: 80000}, {id: "b4", cat: "c-alim", cur: "EUR", limit: 15000}
  ];
  const tpl = [
    [1,"rev",1400000,"a-mad","r-sal",L("Salaire")],[3,"dep",420000,"a-mad","c-log",L("Loyer")],[4,"dep",38500,"a-mad","c-fact",L("Électricité et eau")],
    [5,"vir",150000,"a-mad","",L("Épargne du mois"),"a-ep"],[6,"dep",61200,"a-mad","c-alim",L("Courses de la semaine")],[7,"dep",12000,"a-esp","c-trans",L("Taxi")],
    [9,"dep",29900,"a-mad","c-fact",L("Internet et téléphone")],[11,"dep",4680,"a-eur","c-alim",L("Supermarché")],[12,"dep",45000,"a-mad","c-alim-rest",L("Dîner en famille")],
    [13,"dep",58700,"a-mad","c-alim",L("Courses de la semaine")],[14,"dep",5200,"a-eur","c-trans",L("Billet de train")],[16,"dep",35000,"a-mad","c-sante",L("Pharmacie")],
    [17,"dep",22000,"a-esp","c-lois",L("Cinéma et sortie")],[18,"dep",49000,"a-mad","c-trans-carb",L("Plein d'essence")],[19,"dep",6340,"a-eur","c-alim-marche",L("Marché du samedi")],
    [20,"dep",64300,"a-mad","c-alim",L("Courses de la semaine")],[22,"dep",89000,"a-mad","c-shop",L("Vêtements")],[24,"rev",180000,"a-mad","r-prime",L("Heures complémentaires")],
    [26,"dep",3990,"a-eur","c-shop",L("Librairie")],[27,"dep",55400,"a-mad","c-alim",L("Courses de la semaine")]
  ];
  const months = {}, now = new Date(), cm = ymd(now).slice(0, 7);
  const add = (ym, t) => (months[ym] = months[ym] || {items: [], updatedAt: 0}).items.push(t);
  [0, -1, -2].forEach((off, k) => {
    const ym = shiftMonth(cm, off);
    tpl.forEach((r, i) => {
      if (off === 0 && r[0] > now.getDate()) return;
      const f = r[1] === "dep" && r[4] !== "c-log" ? 1 + ((i * 7 + k * 5) % 9 - 4) / 40 : 1;
      const t = {id: "d" + k + "-" + i, t: r[1], amt: Math.round(r[2] * f / 10) * 10, acc: r[3], cat: r[4], note: r[5], date: ym + "-" + pad(r[0])};
      if (r[6]) t.to = r[6];
      add(ym, t);
    });
    if (off === -1) add(ym, {id: "d" + k + "-x", t: "vir", amt: 220000, amtTo: 20000, acc: "a-mad", to: "a-eur", cat: "", note: L("Virement vers la France"), date: ym + "-08"});
  });
  meta.loans = [
    {id: "l-demo1", kind: "lent", person: "Youssef", cur: "MAD", due: shiftMonth(cm, 2) + "-15", note: L("Achat de voiture")},
    {id: "l-demo2", kind: "borrowed", person: "Nadia", cur: "EUR", due: "", note: L("Avance pour le billet d'avion")}
  ];
  const p1 = shiftMonth(cm, -1), p2 = shiftMonth(cm, -2);
  add(p1, {id: "dl1", t: "pret", loan: "l-demo1", mv: "base", dir: "out", amt: 500000, acc: "a-mad", cat: "", note: "", date: p1 + "-12"});
  add(cm, {id: "dl2", t: "pret", loan: "l-demo1", mv: "remb", dir: "in", amt: 150000, acc: "a-mad", cat: "", note: "", date: cm + "-" + pad(Math.min(10, now.getDate()))});
  add(p2, {id: "dl3", t: "pret", loan: "l-demo2", mv: "base", dir: "in", amt: 30000, acc: "a-eur", cat: "", note: "", date: p2 + "-15"});
  add(p1, {id: "dl4", t: "pret", loan: "l-demo2", mv: "remb", dir: "out", amt: 10000, acc: "a-eur", cat: "", note: "", date: p1 + "-15"});
  meta.recurring = [
    {id: "rc-sport", t: "dep", amt: 30000, acc: "a-mad", cat: "c-lois-sport", note: L("Abonnement salle de sport"), unit: "m", every: 1, start: p2 + "-02", end: "", k: 0, mode: "auto", paused: false},
    {id: "rc-cours", t: "rev", amt: 120000, acc: "a-esp", cat: "r-cours", note: L("Cours particuliers"), unit: "m", every: 1, start: p1 + "-" + pad(Math.max(1, Math.min(15, now.getDate()))), end: "", k: 1, mode: "manual", paused: false}
  ];
  meta.darets = [{id: "dar-demo", name: L("Daret de la famille"), acc: "a-mad", amt: 100000, freq: "m1", start: p2 + "-05", track: false, got: {},
    members: [L("Fatima"), L("Salma"), L("Moi"), L("Nadia"), L("Khadija"), L("Amina")].map((name, i) => ({name, me: i === 2}))}];
  add(p2, {id: "dp-dar-demo-0", t: "pret", dar: "dar-demo", dir: "out", amt: 100000, acc: "a-mad", cat: "", note: "", date: p2 + "-05"});
  add(p1, {id: "dp-dar-demo-1", t: "pret", dar: "dar-demo", dir: "out", amt: 100000, acc: "a-mad", cat: "", note: "", date: p1 + "-05"});
  add(p1, {id: "r-rc-cours-" + meta.recurring[1].start, t: "rev", amt: 120000, acc: "a-esp", cat: "r-cours", note: L("Cours particuliers"), date: meta.recurring[1].start, rec: "rc-cours"});
  return {meta, months};
}

let S, demo = false, loading = false, col = null, syncState = "local";
function localLoad() { try { const o = JSON.parse(localStorage.getItem(LS)); return o && o.meta ? o : null; } catch (e) { return null; } }
function localSave() { if (demo) return; try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} idbSave(); nativeSave(); }
/* copie de sécurité dans IndexedDB (plus durable que localStorage) et instantanés quotidiens */
const IDB = {
  p: null,
  open() { if (!this.p) this.p = new Promise((res, rej) => { try { const r = indexedDB.open("flousi", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); return this.p; },
  async get(k) { try { const db = await this.open(); return await new Promise(res => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); } catch (e) { return undefined; } },
  async set(k, v) { try { const db = await this.open(); return await new Promise(res => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); } catch (e) { return false; } },
  async del(k) { try { const db = await this.open(); return await new Promise(res => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete(k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); } catch (e) { return false; } }
};
/* ===== version installée (App Store / Google Play, via Capacitor) =====
   En plus de localStorage et IndexedDB, les données sont écrites dans un fichier privé de l'appli
   (floussi/donnees.json), qui n'est jamais effacé par le système. Sur le web, rien de tout ceci ne s'exécute. */
const NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
const NP = n => NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[n] || null : null;
const NFS = {
  async write(path, data, dir) { const fs = NP("Filesystem"); if (!fs) return null; try { return (await fs.writeFile({path, data, directory: dir || "DATA", encoding: "utf8", recursive: true})).uri; } catch (e) { return null; } },
  async read(path, dir) { const fs = NP("Filesystem"); if (!fs) return null; try { return (await fs.readFile({path, directory: dir || "DATA", encoding: "utf8"})).data; } catch (e) { return null; } },
  async list(path, dir) { const fs = NP("Filesystem"); if (!fs) return []; try { return (await fs.readdir({path, directory: dir || "DATA"})).files.map(f => typeof f === "string" ? f : f.name); } catch (e) { return []; } },
  async del(path, dir) { const fs = NP("Filesystem"); if (!fs) return false; try { await fs.deleteFile({path, directory: dir || "DATA"}); return true; } catch (e) { return false; } }
};
const stampOf = o => Math.max(0, (o && o.meta && o.meta.updatedAt) || 0, ...Object.values((o && o.months) || {}).map(m => m.updatedAt || 0));
let nT, nBusy = false;
function nativeSave(now) {
  if (!NATIVE || demo || !S) return; clearTimeout(nT);
  const go = async () => {
    if (nBusy) { nT = setTimeout(go, 300); return; } nBusy = true;
    try {
      const data = JSON.stringify({app: "floussi", savedAt: Date.now(), stamp: stampOf(S), data: S});
      await NFS.write("floussi/donnees.json", data);
      const d = today(); await NFS.write("floussi/instantanes/" + d + ".json", data);
      const ls = (await NFS.list("floussi/instantanes")).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
      while (ls.length > 10) await NFS.del("floussi/instantanes/" + ls.shift());
      if (P.autoDoc !== d && allTx().length) await nativeDailyCopy(d);
    } finally { nBusy = false; }
  };
  if (now) go(); else nT = setTimeout(go, 600);
}
/* copie quotidienne visible dans Fichiers : iPhone › Sur mon iPhone › Floussi ; Android › Documents › Floussi */
async function nativeDailyCopy(d) {
  await loadPhotos();
  const uri = await NFS.write("Floussi/floussi-sauvegarde-" + d + ".json", backupJSON(), "DOCUMENTS");
  if (!uri) return;
  P.autoDoc = d; P.lastBackup = d; savePrefs();
  const ls = (await NFS.list("Floussi", "DOCUMENTS")).filter(n => /^floussi-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  while (ls.length > 14) await NFS.del("Floussi/" + ls.shift(), "DOCUMENTS");
}
async function nativeLoad() {
  const txt = await NFS.read("floussi/donnees.json"); if (!txt) return null;
  try { const o = JSON.parse(txt); return o && o.data && o.data.meta && Array.isArray(o.data.meta.accounts) ? o : null; } catch (e) { return null; }
}
/* partage d'un fichier (sauvegarde, CSV) par la feuille de partage du téléphone */
async function nativeShare(filename, data, okMsg) {
  const sh = NP("Share"), uri = await NFS.write("partage/" + filename, data, "CACHE");
  if (!sh || !uri) { toast(L("L'enregistrement de fichier n'est pas disponible dans cette vue.")); return false; }
  try { await sh.share({title: filename, files: [uri], dialogTitle: L("Enregistrer ou envoyer le fichier")}); toast(okMsg); return true; }
  catch (e) { return false; }
}
if (NATIVE) {
  const app = NP("App");
  if (app && app.addListener) { try { app.addListener("pause", () => nativeSave(true)); } catch (e) {} }
}
let idbT, snaps = [];
function idbSave() {
  clearTimeout(idbT);
  idbT = setTimeout(async () => {
    const data = JSON.parse(JSON.stringify(S)); await IDB.set("data", data);
    const d = today(); snaps = (await IDB.get("snaps")) || [];
    if (!snaps.includes(d)) {
      await IDB.set("snap-" + d, data); snaps.push(d); snaps.sort();
      while (snaps.length > 10) await IDB.del("snap-" + snaps.shift());
      await IDB.set("snaps", snaps);
    } else await IDB.set("snap-" + d, data);
  }, 400);
}
async function protectStorage() { try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {} }
const getDoc = id => id === "meta" ? S.meta : S.months[id.slice(3)];
const setDoc = (id, d) => { if (id === "meta") S.meta = d; else if (id.startsWith("tx-")) S.months[id.slice(3)] = d; };
const docIds = () => ["meta", ...Object.keys(S.months).map(m => "tx-" + m)];

/* une seule écriture à la fois par document */
const pending = new Set(), busy = new Set();
function push(id) { if (!col || demo) return; pending.add(id); pump(id); }
async function pump(id) {
  if (busy.has(id)) return; busy.add(id);
  while (pending.has(id)) {
    pending.delete(id);
    try { await col.doc(id).set(clone(getDoc(id))); setSync("cloud"); }
    catch (e) {
      if (e && e.code === "unavailable") { await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500)); try { await col.doc(id).set(clone(getDoc(id))); continue; } catch (e2) {} }
      setSync(e && e.code === "invalid_argument" ? "toolarge" : "error"); break;
    }
  }
  busy.delete(id);
}
function touch(...ids) { if (demo) return; ids.forEach(id => { const d = getDoc(id); if (d) d.updatedAt = Date.now(); }); localSave(); ids.forEach(push); }
function setSync(s) {
  syncState = s;
  $("#sync").textContent = demo ? L("Exemple") : s === "cloud" ? L("Enregistré") : s === "error" || s === "toolarge" ? L("Non synchronisé") : s === "loading" ? L("Chargement…") : L("Sur cet appareil");
}
async function initRemote() {
  try {
    if (!window.claude || !window.claude.use) return;
    setSync("loading");
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const id = user ? await user.id() : null;
    if (!db || !id) return;
    const c = db.collection("data/users/" + id);
    const snap = await Promise.race([c.limit(1000).get(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))]);
    const remote = {}; snap.docs.forEach(d => { if (d.exists) remote[d.id] = clone(d.data()); });
    if (demo && remote.meta) { S = {meta: null, months: {}}; demo = false; }
    if (!demo) {
      Object.keys(remote).forEach(k => { const l = getDoc(k); if (!l || (remote[k].updatedAt || 0) > (l.updatedAt || 0)) setDoc(k, remote[k]); });
      migrate(S.meta); col = c; localSave();
      docIds().forEach(k => { if (!remote[k] || (remote[k].updatedAt || 0) < (getDoc(k).updatedAt || 0)) push(k); });
    } else col = c;
    syncState = "cloud";
  } catch (e) { syncState = col ? "cloud" : "local"; }
  finally { loading = false; if (syncState === "loading") syncState = "local"; setSync(syncState); runAuto(true); render(); }
}
