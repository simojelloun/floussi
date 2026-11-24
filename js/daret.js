"use strict";
/* ================= daret (دارت) =================
   Une daret réunit plusieurs membres : à chaque tour, chacun verse la même somme et un membre
   différent, dans l'ordre convenu, reçoit toute la cagnotte (somme × nombre de membres).
   Ma cotisation et la cagnotte que je reçois sont des mouvements de type « pret » liés à la daret
   (champ dar) : ils changent le solde du compte, sans compter comme dépense ni comme revenu.
   Identifiants fixes : « dp-<daret>-<tour> » (ma cotisation) et « dr-<daret>-<tour> » (cagnotte reçue).
   Données : S.meta.darets = [{id, name, acc, amt, freq, start, members: [{name, me}], track, got: {tour: [membres]}}]. */
const DARETS = () => S.meta.darets || (S.meta.darets = []);
const daret = id => DARETS().find(d => d.id === id);
const darCur = d => (acc(d.acc) || accSorted()[0]).cur;
const darPot = d => d.amt * d.members.length;
const darDate = (d, k) => occ({start: d.start, unit: d.freq[0], every: +d.freq.slice(1)}, k);
const darIdP = (d, k) => "dp-" + d.id + "-" + k, darIdR = (d, k) => "dr-" + d.id + "-" + k;
const darMe = d => d.members.findIndex(m => m.me);
const DAR_FREQS = () => [["w1", L("Chaque semaine")], ["w2", L("Toutes les deux semaines")], ["m1", L("Chaque mois")]];
let darSel = "";

function darState(d, have) {
  have = have || txIds();
  const me = darMe(d), t0 = today();
  const rounds = d.members.map((m, k) => ({k, date: darDate(d, k), who: m, mine: k === me, paid: have.has(darIdP(d, k)), recv: k === me && have.has(darIdR(d, k))}));
  const paid = rounds.filter(r => r.paid).length * d.amt, recv = rounds.some(r => r.recv) ? darPot(d) : 0;
  const mine = me >= 0 ? rounds[me] : null;
  return {rounds, paid, recv, pos: paid - recv, mine, next: rounds.find(r => r.date >= t0) || null,
    done: rounds.every(r => r.paid) && (!mine || mine.recv), late: rounds.filter(r => r.date < t0 && !r.paid).length};
}
/* date enregistrée : celle du tour, ou aujourd'hui si on paie en avance */
const darTxDate = (d, k) => { const x = darDate(d, k), t0 = today(); return x > t0 ? t0 : x; };
function darPay(d, k) { const a = acc(d.acc) ? d.acc : accSorted()[0].id; touch("meta", ...putTx({id: darIdP(d, k), t: "pret", dar: d.id, dir: "out", amt: d.amt, acc: a, cat: "", note: "", date: darTxDate(d, k)}, darIdP(d, k))); }
function darReceive(d, k) { const a = acc(d.acc) ? d.acc : accSorted()[0].id; touch("meta", ...putTx({id: darIdR(d, k), t: "pret", dar: d.id, dir: "in", amt: darPot(d), acc: a, cat: "", note: "", date: darTxDate(d, k)}, darIdR(d, k))); }
function darUndo(txId) { const m = removeTx(txId); touch("meta", ...(m ? ["tx-" + m] : [])); }

/* ---------- liste (dans l'écran Prêts) ---------- */
function darRow(d) {
  const s = darState(d), c = darCur(d), n = d.members.length, nx = s.next;
  const sub = s.done ? L("Terminée") : (nx ? L("Tour ") + (nx.k + 1) + "/" + n + " · " + dm(nx.date) : L("Tous les tours sont passés")) + (s.mine && !s.mine.recv ? " · " + L("votre tour le ") + dm(s.mine.date) : "");
  return `<li><button type="button" class="row" data-act="dar-open" data-id="${esc(d.id)}" aria-label="${esc(d.name + ", " + L("cagnotte de ") + say(darPot(d), c) + ", " + sub + (s.late ? ", " + plur(s.late, L("cotisation en retard"), L("cotisations en retard")) : ""))}">${chipHtml(null, "👪")}<span class="t"><b>${esc(d.name)}</b><small>${s.late ? `<span class="when soon">${plur(s.late, L("cotisation en retard"), L("cotisations en retard"))}</span> · ` : ""}${esc(sub)}</small></span><span class="amt">${fmt(darPot(d), c)}</span></button></li>`;
}
function darSection() {
  const list = DARETS();
  return `<h2 class="sec-h">${L("Daret")}</h2>
    ${list.length ? `<ul class="card rows">${list.map(darRow).join("")}</ul>` : `<p class="hint" style="margin:0 4px">${L("Une daret (tontine) : chaque membre verse la même somme à chaque tour, et chacun reçoit la cagnotte à son tour.")}</p>`}
    ${proLock(`<button type="button" class="btn ghost" data-act="dar-new">＋ ${L("Nouvelle daret")}</button>`, "＋ " + L("Nouvelle daret"), "daret")}`;
}

/* ---------- écran d'une daret ---------- */
function vDaret() {
  if (!daret(darSel) && DARETS().length) darSel = DARETS()[0].id;
  const d = daret(darSel); if (!d) return backLink("prets") + `<p class="empty card">${L("Cette daret n'existe plus.")}</p>`;
  const s = darState(d), c = darCur(d), n = d.members.length, t0 = today(), a = acc(d.acc);
  const posTxt = s.pos > 0 ? L("La daret vous doit ") + fmt(s.pos, c) : s.pos < 0 ? L("Vous devez encore ") + fmt(-s.pos, c) + L(" à la daret") : L("Vous êtes à jour");
  const row = r => {
    const who = r.who.me ? L("Vous") : r.who.name, past = r.date < t0, got = (d.got && d.got[r.k]) || [];
    const payBtn = r.paid
      ? `<button type="button" class="btn sm ghost paybtn paid" data-act="dar-unpay" data-id="${esc(d.id)}" data-k="${r.k}" aria-label="${esc(L("Cotisation du tour ") + (r.k + 1) + L(" payée. Marquer impayée"))}">✓ ${L("Payée")}</button>`
      : `<button type="button" class="btn sm${past ? "" : " ghost"}" data-act="dar-pay" data-id="${esc(d.id)}" data-k="${r.k}" aria-label="${esc(L("Payer ma cotisation du tour ") + (r.k + 1) + ", " + say(d.amt, c))}">${L("Payer")} ${fmt(d.amt, c)}</button>`;
    const recvBtn = !r.mine ? "" : r.recv
      ? `<button type="button" class="btn sm ghost paybtn paid" data-act="dar-unrecv" data-id="${esc(d.id)}" data-k="${r.k}" aria-label="${esc(L("Cagnotte reçue. Marquer non reçue"))}">✓ ${L("Cagnotte reçue")}</button>`
      : `<button type="button" class="btn sm" data-act="dar-recv" data-id="${esc(d.id)}" data-k="${r.k}" aria-label="${esc(L("J'ai reçu la cagnotte de ") + say(darPot(d), c))}">${L("J'ai reçu")} ${fmt(darPot(d), c)}</button>`;
    return `<li class="dar-r${r.mine ? " mine" : ""}${s.next && s.next.k === r.k ? " now" : ""}">
      <div class="dar-h"><span class="dar-n" aria-hidden="true">${r.k + 1}</span><div class="t"><b>${L("Tour ")}${r.k + 1} · ${esc(who)}</b><small>${esc(longDate(r.date))}${!r.paid && past ? ` · <span class="when soon">${L("En retard")}</span>` : ""}</small></div></div>
      <div class="pend-act">${payBtn}${recvBtn}</div>
      ${d.track ? `<details class="dar-got"><summary>${L("Versements des membres")} (${got.length}/${n})</summary><div class="dar-gl">${d.members.map((m, i) => `<label class="check"><input type="checkbox" name="dar-got" data-id="${esc(d.id)}" data-k="${r.k}" value="${i}" ${got.includes(i) ? "checked" : ""}><span>${esc(m.me ? L("Vous") : m.name)}</span></label>`).join("")}</div></details>` : ""}
    </li>`;
  };
  return backLink("prets") + `<div class="card dar-top">
      <p class="dar-t">${esc(d.name)}</p>
      <p class="dar-pot num">${fmt(darPot(d), c)}</p>
      <p class="hint" style="margin:0">${L("Cagnotte à chaque tour")} · ${n} ${L("membres")} × ${fmt(d.amt, c)} · ${esc((DAR_FREQS().find(f => f[0] === d.freq) || [0, ""])[1].toLowerCase())}${a ? " · " + esc(a.name) : ""}</p>
      <dl class="kv">
        ${s.mine ? `<div><dt>${L("Votre tour")}</dt><dd>${L("tour ")}${s.mine.k + 1} · ${esc(dm(s.mine.date))}</dd></div>` : ""}
        <div><dt>${L("Versé")}</dt><dd>${fmt(s.paid, c)}</dd></div><div><dt>${L("Reçu")}</dt><dd>${fmt(s.recv, c)}</dd></div>
        <div class="strong"><dt>${L("Position")}</dt><dd>${esc(posTxt)}</dd></div></dl>
    </div>
    <h2 class="sec-h">${L("Tours")}</h2>
    <ul class="card rows dar-list">${s.rounds.map(row).join("")}</ul>
    <div class="actions"><button type="button" class="btn ghost" data-act="dar-edit" data-id="${esc(d.id)}">${L("Modifier")}</button><button type="button" class="btn danger" data-act="dar-del" data-id="${esc(d.id)}">${L("Supprimer")}</button></div>
    <p class="hint">${L("Vos cotisations et la cagnotte reçue modifient le solde du compte choisi, sans compter comme dépenses ni comme revenus, comme un prêt.")}</p>`;
}

/* ---------- création / modification ---------- */
function openDaretEdit(d) {
  const e = d || {name: "", acc: accSorted()[0].id, amt: 0, freq: "m1", start: today(), members: [], track: false};
  const lines = e.members.map(m => m.me ? L("Moi") : m.name).join("\n");
  openSheet(head(d ? L("Modifier la daret") : L("Nouvelle daret")) + `<form novalidate>
    <label class="f"><span>${L("Nom")}</span><input type="text" id="dr-name" maxlength="40" value="${esc(e.name)}" placeholder="${esc(L("Ex. Daret de la famille"))}"></label>
    <div class="f2"><label class="f"><span>${L("Cotisation par tour")}</span><input type="text" inputmode="decimal" id="dr-amt" value="${e.amt ? esc(plain(e.amt)) : ""}" placeholder="0,00" autocomplete="off"></label>
      <label class="f"><span>${L("Compte utilisé")}</span><select id="dr-acc">${accOpts(e.acc)}</select></label></div>
    <div class="f2"><label class="f"><span>${L("Fréquence")}</span><select id="dr-freq">${DAR_FREQS().map(([v, l]) => `<option value="${v}" ${v === e.freq ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <div class="f"><span id="dr-start-lab">${L("Premier tour")}</span>${dateInput("dr-start", esc(e.start), {})}</div></div>
    <label class="f"><span>${L("Membres, dans l'ordre des tours")}</span><textarea id="dr-mem" rows="7" aria-describedby="dr-mem-h" placeholder="${esc(L("Fatima") + "\n" + L("Moi") + "\n" + L("Karim"))}">${esc(lines)}</textarea></label>
    <small class="hint" id="dr-mem-h" style="margin:-4px 0 0">${L("Un nom par ligne, dans l'ordre où chacun reçoit la cagnotte. Écrivez « Moi » à votre place.")}</small>
    <label class="check"><input type="checkbox" id="dr-track" ${e.track ? "checked" : ""}><span>${L("Je gère cette daret : suivre les versements de chaque membre")}</span></label>
    <div class="err" id="f-err" role="alert"></div>
    <div class="actions"><button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`, () => {
    const name = $("#dr-name").value.trim(), amt = parseAmt($("#dr-amt").value), meWords = ["moi", "me", "أنا", "انا"].map(norm);
    const members = $("#dr-mem").value.split("\n").map(x => x.trim()).filter(Boolean).map(x => ({name: x, me: meWords.includes(norm(x))}));
    if (!name) return err(L("Donnez un nom à la daret."), "dr-name");
    if (!(amt > 0)) return err(L("Indiquez la cotisation par tour."), "dr-amt");
    if (members.length < 2) return err(L("Indiquez au moins deux membres, un par ligne."), "dr-mem");
    if (members.filter(m => m.me).length !== 1) return err(L("Écrivez « Moi » une fois, à votre place dans l'ordre des tours."), "dr-mem");
    members.forEach(m => { if (m.me) m.name = L("Moi"); });
    const x = {id: d ? d.id : "dar-" + uid(), name, acc: $("#dr-acc").value, amt, freq: $("#dr-freq").value, start: $("#dr-start").value || today(), members, track: $("#dr-track").checked, got: (d && d.got) || {}};
    if (d) DARETS()[DARETS().indexOf(d)] = x; else DARETS().push(x);
    touch("meta"); closeSheet(); darSel = x.id;
    if (location.hash !== "#daret") location.hash = "daret"; else render();
    toast(d ? L("Daret modifiée") : L("Daret créée : ") + plur(members.length, L("tour"), L("tours")));
  }, "#dr-name");
}
function darDelete(d) {
  confirmSheet(L("Supprimer la daret « ") + d.name + L(" » et ses mouvements enregistrés ?"), L("Supprimer"), () => {
    const snap = clone(S), ids = new Set(["meta"]);
    for (const t of allTx().filter(t => t.dar === d.id)) { const m = removeTx(t.id); if (m) ids.add("tx-" + m); }
    DARETS().splice(DARETS().indexOf(d), 1); touch(...ids); location.hash = "prets";
    toastUndo(L("Daret supprimée"), () => { S = snap; touch(...docIds()); render(); announce(L("Suppression annulée")); });
  });
}

/* ---------- échéances : accueil et calendrier ---------- */
function darDue(from, to) {
  const out = [], have = txIds();
  for (const d of DARETS()) {
    if (opAcc && tab === "operations" && d.acc !== opAcc) continue;
    const s = darState(d, have), c = darCur(d);
    for (const r of s.rounds) {
      if (r.date > to) break;
      if (!r.paid && (r.date >= from || from === "*")) out.push({date: r.date, d, k: r.k, kind: "pay", amt: d.amt, c});
      if (r.mine && !r.recv && (r.date >= from || from === "*")) out.push({date: r.date, d, k: r.k, kind: "recv", amt: darPot(d), c});
    }
  }
  return out;
}
function darDueRow(x) {
  const late = x.date < today(), pay = x.kind === "pay";
  const title = x.d.name + " · " + (pay ? L("ma cotisation") : L("je reçois la cagnotte"));
  return `<li class="pend"><div class="top-l">${chipHtml(null, "👪")}<div class="t"><b>${esc(title)}</b><small><span class="pay-st due${late ? " late" : ""}">${late ? L("En retard") : pay ? L("À payer") : L("À recevoir")}</span> · ${L("tour ")}${x.k + 1}</small></div><span class="amt ${pay ? "dep" : "rev"}">${pay ? "−" : "+"}${fmt(x.amt, x.c)}</span></div>
    <div class="pend-act"><button type="button" class="btn sm ghost" data-act="dar-open" data-id="${esc(x.d.id)}">${L("Voir la daret")}</button><button type="button" class="btn sm" data-act="${pay ? "dar-pay" : "dar-recv"}" data-id="${esc(x.d.id)}" data-k="${x.k}" aria-label="${esc((pay ? L("Payer ma cotisation : ") : L("J'ai reçu la cagnotte : ")) + x.d.name + ", " + say(x.amt, x.c))}">✓ ${pay ? L("Payée") : L("Reçue")}</button></div></li>`;
}

/* ---------- actions ---------- */
function darAction(a, el) {
  const d = daret(el.dataset.id); if (!d && a !== "dar-new") return;
  if (a === "dar-new") return needPro("daret") ? undefined : openDaretEdit(null);
  if (a === "dar-open") { darSel = d.id; if (location.hash === "#daret") render(); else location.hash = "daret"; return; }
  if (a === "dar-edit") return openDaretEdit(d);
  if (a === "dar-del") return darDelete(d);
  const k = +el.dataset.k, snap = clone(S), key = focusKey(el), c = darCur(d);
  if (a === "dar-pay") darPay(d, k); else if (a === "dar-unpay") darUndo(darIdP(d, k)); else if (a === "dar-recv") darReceive(d, k); else if (a === "dar-unrecv") darUndo(darIdR(d, k));
  render(); const back = key && document.querySelector(key); if (back) back.focus();
  const msg = {"dar-pay": L("Cotisation payée : "), "dar-unpay": L("Cotisation marquée impayée : "), "dar-recv": L("Cagnotte reçue : "), "dar-unrecv": L("Cagnotte marquée non reçue : ")}[a] + d.name + L(", tour ") + (k + 1) + " (" + fmt(a.includes("recv") ? darPot(d) : d.amt, c) + ")";
  toastUndo(msg, () => { S = snap; touch(...docIds()); render(); announce(L("Modification annulée")); });
}
/* suivi des versements des membres (gestionnaire de la daret) */
document.addEventListener("change", e => {
  if (e.target.name !== "dar-got") return;
  const d = daret(e.target.dataset.id); if (!d) return; const k = e.target.dataset.k, i = +e.target.value;
  d.got = d.got || {}; const g = new Set(d.got[k] || []); e.target.checked ? g.add(i) : g.delete(i); d.got[k] = [...g].sort((x, y) => x - y);
  touch("meta"); const sum = e.target.closest("details").querySelector("summary"); if (sum) sum.textContent = L("Versements des membres") + " (" + d.got[k].length + "/" + d.members.length + ")";
});
