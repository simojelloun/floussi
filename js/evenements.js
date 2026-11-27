"use strict";
/* ================= événements ================= */
document.addEventListener("click", e => {
  if (e.target.id === "wrap") return closeSheet();
  if (e.target.id === "pick") return closePick();
  if (e.target.id === "phv") return closePhoto();
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (e.target.id === "cal") return closeCal();
  if (a === "pick") return openPick(el.dataset.for);
  if (a === "pick-opt") return pickOpt(+el.dataset.i);
  if (a === "pick-sub") { pkCtx.sub = el.dataset.v; renderPickTree(true); announce(el.dataset.v && cat(el.dataset.v) ? cat(el.dataset.v).name : ""); return; }
  if (a === "pick-add") { pkCtx.add = {par: el.dataset.par || "", name: el.dataset.name || ""}; renderPickTree(); return; }
  if (a === "pick-add-cancel") { pkCtx.add = null; renderPickTree(true); const b = $("#pick").querySelector(".pk-add"); if (b) b.focus(); return; }
  if (a === "pick-back") { const v = pkCtx.sub; pkCtx.sub = ""; renderPickTree(false); const b = $("#pick").querySelector(`[data-v="${CSS.escape(v)}"]`); if (b) b.focus(); return; }
  if (a === "pick-close") return closePick();
  if (a === "pin") return pinPress(el.dataset.k);
  if (a === "pin-forgot") return renderLock("forgot");
  if (a === "lock-back") { renderLock(); return $("#lock-t").focus(); }
  if (a === "lock-erase") { try { localStorage.removeItem(LS); delete P.lock; savePrefs(); indexedDB.deleteDatabase("flousi"); } catch (x) {} return (NATIVE ? NFS.del("floussi/donnees.json").then(() => NFS.list("floussi/instantanes")).then(ls => Promise.all(ls.map(n => NFS.del("floussi/instantanes/" + n)))).then(() => NFS.list("floussi/photos")).then(ls => Promise.all(ls.map(n => NFS.del("floussi/photos/" + n)))) : Promise.resolve()).finally(() => location.reload()); }
  if (a === "pin-on" || a === "pin-change" || a === "pin-off") return openPin(a.slice(4));
  if (a === "lock-now") return showLock();
  if (a === "fc") { fcH = el.dataset.v; return render(); }
  if (a === "cal") openCal(el.dataset.for);
  else if (a === "cal-pick") pickDate(el.dataset.d);
  else if (a === "cal-ok") pickDate(calCtx.sel || $("#" + CSS.escape(calCtx.id)).value);
  else if (a === "cal-nav") { const n = +el.dataset.n; calCtx.view = shiftMonth(calCtx.view, n); calCtx.focus = shiftMonth(calCtx.focus.slice(0, 7), n) + calCtx.focus.slice(7); renderCal(false); }
  else if (a === "cal-close") closeCal();
  else if (a === "day-clear") { dayFilter = ""; render(); announce(L("Tout le mois")); }
  else if (a === "close") closeSheet();
  else if (a === "skip") { e.preventDefault(); const t = $("#view").querySelector("h2, button, a, input") || $("#title"); if (!t.matches("button,a,input")) t.setAttribute("tabindex", "-1"); t.focus(); }
  else if (a === "new-tx") openTx();
  else if (a === "edit-tx") openTx(allTx().find(t => t.id === id));
  else if (a === "tpl-new") { const tp = TPL().find(x => x.id === id); if (!tp) return; openTx(null, tp.t); tplApply(tp); renderTx("f-amt"); announce(L("Modèle « ") + tplLabel(tp) + L(" » repris. Vérifiez puis enregistrez.")); }
  else if (a === "tpl-use") { const tp = TPL().find(x => x.id === id); if (!tp || !draft) return; readTx(); tplApply(tp); renderTx("f-amt"); announce(L("Modèle « ") + tplLabel(tp) + L(" » repris. Vérifiez puis enregistrez.")); }
  else if (a === "tpl-save") saveTemplate();
  else if (a === "zakat-pay") zakatPay();
  else if (a.startsWith("dar-")) darAction(a, el);
  else if (a === "cat-open") { if (!draft) return; readTx(); const c = cat(draft.cat); openPick("f-cat", c && c.parent ? c.parent : ""); }
  else if (a === "cat-tile") { if (!draft) return; const c = el.dataset.id;
    if (kids(c).length) { readTx(); draft.catTile = c; openPick("f-cat", c); }
    else { readTx(); draft.cat = c; draft.catTouched = true; markTiles(); const tb = $("#sheet").querySelector(`.ctile[data-id="${CSS.escape(c)}"]`); if (tb) tb.focus(); announce(L("Catégorie : ") + catLabel(c)); } }
  else if (a === "acc-pill") { if (!draft) return; readTx(); draft.acc = el.dataset.id; renderTx(`.apill[data-id="${CSS.escape(el.dataset.id)}"]`); announce(L("Compte : ") + acc(el.dataset.id).name); }
  else if (a === "date-q") { setDateField("f-date", el.dataset.d); if (draft) draft.date = el.dataset.d; announce(longDate(el.dataset.d)); }
  else if (a === "op-view") { P.opView = el.dataset.v; savePrefs(); render(); const b = $("#view").querySelector(`[data-act="op-view"][data-v="${el.dataset.v}"]`); if (b) b.focus(); announce(el.dataset.v === "cal" ? L("Calendrier") : L("Liste")); }
  else if (a === "cal-day") { calDay = el.dataset.d; render(); const b = $("#view").querySelector(`.mc-d[data-d="${calDay}"]`); if (b) b.focus(); const x = calData(calM)[calDay]; announce(x ? plur(x.tx.length, L("opération"), L("opérations")) + (x.due.length ? ", " + plur(x.due.length, L("échéance à payer"), L("échéances à payer")) : "") : L("Rien ce jour-là")); }
  else if (a === "calm") { calM = shiftMonth(calM, +el.dataset.n); calDay = calM === today().slice(0, 7) ? today() : calM + "-01"; render(); const b = $("#view").querySelector(`[data-act="calm"][data-n="${el.dataset.n}"]`); if (b) b.focus(); }
  else if (a === "cal-today") { calM = today().slice(0, 7); calDay = today(); render(); const b = $("#view").querySelector(".mc-d.sel"); if (b) b.focus(); }
  else if (a === "new-on-day") { openTx(null, "dep"); readTx(); draft.date = el.dataset.d; renderTx("f-amt"); }
  else if (a === "tpl-edit") { const tp = TPL().find(x => x.id === id); if (!tp) return;
    openSheet(head(L("Renommer le modèle")) + `<form novalidate><label class="f"><span>${L("Nom affiché")}</span><input type="text" id="tp-name" maxlength="30" value="${esc(tplLabel(tp))}"></label><div class="err" id="f-err" role="alert"></div><div class="actions"><button type="submit" class="btn">${L("Enregistrer")}</button></div></form>`,
      () => { const v = $("#tp-name").value.trim(); if (!v) return err(L("Donnez un nom au modèle."), "tp-name"); tp.name = v; touch("meta"); closeSheet(); render(); toast(L("Modèle renommé")); }, "#tp-name"); }
  else if (a === "tpl-del") { const i = TPL().findIndex(x => x.id === id); if (i < 0) return; const tp = TPL().splice(i, 1)[0]; touch("meta"); render();
    toastUndo(L("Modèle supprimé"), () => { TPL().splice(i, 0, tp); touch("meta"); render(); announce(L("Modification annulée")); }); }
  else if (a === "sug") { const t = allTx().find(x => x.id === id); if (!t || !draft) return; readTx(); draft.note = t.note; if (cats(draft.t).some(c => c.id === t.cat)) draft.cat = t.cat; if (acc(t.acc)) draft.acc = t.acc; if (!parseAmt(draft.amtS)) draft.amtS = plain(Math.abs(t.amt)); draft.catTouched = true; if (!draft.tagsS && tagsOf(t).length) draft.tagsS = tagsOf(t).join(", "); renderTx("f-amt"); announce(L("Repris : ") + t.note + ", " + catLabel(draft.cat)); }
  else if (a === "tag-add") { readTx(); const cur0 = parseTags(draft.tagsS); cur0.push(el.dataset.v); draft.tagsS = parseTags(cur0.join(",")).join(", "); renderTx("f-tags"); announce(L("Étiquette ajoutée : ") + el.dataset.v); }
  else if (a === "op-tag") { opTag = opTag === el.dataset.v ? "" : el.dataset.v; render(); announce(opTag ? "#" + opTag + ", " + plur(opsList().length, L("opération"), L("opérations")) : L("Toutes les étiquettes")); }
  else if (a === "ph-view") openPhoto(draft && draft.photo);
  else if (a === "phv-close") closePhoto();
  else if (a === "ph-del") { if (!draft) return; draft.photo = null; $("#ph-box").innerHTML = phBox(draft); $("#f-photo").focus(); announce(L("Photo retirée. Elle sera supprimée à l'enregistrement.")); }
  else if (a === "bil-month") { const n = +el.dataset.n, nm = shiftMonth(bilM, n); if (nm > today().slice(0, 7)) return; bilM = nm; render(); announce(monthName(bilM)); }
  else if (a === "print") { try { window.print(); } catch (x) { toast(L("L'impression n'est pas disponible ici.")); } }
  else if (a === "del-tx") { const t = draft.id, g = draft.grp; confirmSheet(L("Supprimer cette opération ? Les soldes seront recalculés."), L("Supprimer"), () => { const ms = new Set(); (g ? allTx().filter(x => x.grp === g).map(x => x.id) : [t]).forEach(i => { const m = removeTx(i); if (m) ms.add("tx-" + m); }); touch(...ms); render(); toastDel(L("Opération supprimée")); }); }
  else if (a === "new-rec") openRec();
  else if (a === "edit-rec") openRec(recOf(id));
  else if (a === "del-rec") { const rid = draft.id; confirmSheet(L("Supprimer cette récurrence ? Les opérations déjà créées sont conservées."), L("Supprimer"), () => { S.meta.recurring = S.meta.recurring.filter(r => r.id !== rid); touch("meta"); render(); toastDel(L("Récurrence supprimée")); }); }
  else if (a === "rec-ok" || a === "rec-pay" || a === "rec-skip" || a === "rec-unpay") {
    const r = recOf(id); if (!r) return; const d = el.dataset.d || (dues(r)[0] || {}).date; if (!d) return;
    const snap = clone(S), key = focusKey(el);
    if (a === "rec-skip") recSkip(r, d); else if (a === "rec-unpay") recUnpay(r, d, el.dataset.tx); else recPay(r, d);
    if (draft && a === "rec-unpay" && !$("#wrap").hidden) closeSheet();
    render(); const back = key && document.querySelector(key); if (back) back.focus();
    const msg = (a === "rec-skip" ? L("Échéance ignorée : ") : a === "rec-unpay" ? (r.t === "rev" ? L("Marquée non reçue : ") : L("Marquée impayée : ")) : (r.t === "rev" ? L("Marquée reçue : ") : L("Marquée payée : "))) + recTitle(r) + L(" du ") + longDate(d);
    toastUndo(msg, () => { S = snap; touch(...docIds()); render(); announce(L("Modification annulée")); });
  }
  else if (a === "month") { month = shiftMonth(month, +el.dataset.n); dayFilter = ""; render(); announce(cap1(monthName(month))); }
  else if (a === "pick-month") { const m = el.dataset.m; preset = "custom"; range = {from: m + "-01", to: lastDay(m)}; render(); announce(L("Période : ") + monthName(m)); }
  else if (a === "cur") { cur = el.dataset.c; render(); }
  else if (a === "filter") { filter = el.dataset.f; render(); announce(plur(opsList().length, L("opération"), L("opérations"))); }
  else if (a === "loan") openLoanDetail(id);
  else if (a === "new-loan") openNewLoan();
  else if (a === "loanfilter") { loanFilter = el.dataset.v; render(); }
  else if (a === "move") { const l = loan(id); if (l) openMove(l, el.dataset.mv); }
  else if (a === "edit-loan") { const l = loan(id); if (l) openLoanEdit(l); }
  else if (a === "del-loan") {
    const l = loan(id); if (!l) return;
    confirmSheet(`${L("Supprimer ")}${l.kind === "lent" ? L("ce prêt") : L("cet emprunt")}${L(" et tous ses mouvements ? Les soldes des comptes seront recalculés.")}`, L("Supprimer"), () => {
      const ms = new Set(); loanState(l).items.forEach(t => { const m = removeTx(t.id); if (m) ms.add("tx-" + m); });
      S.meta.loans = S.meta.loans.filter(x => x.id !== l.id); touch("meta", ...ms); render(); toastDel(L("Supprimé"));
    });
  }
  else if (a === "del-move") {
    const {l, t} = moveCtx || {}; if (!t) return;
    const s = loanState(l); if (t.mv === "base" && s.principal - t.amt < s.repaid) return err(L("Supprimez d'abord les remboursements : ils dépasseraient le montant restant."));
    confirmSheet(L("Supprimer ce mouvement ? Les soldes seront recalculés."), L("Supprimer"), () => { const m = removeTx(t.id); if (m) touch("tx-" + m); render(); toastDel(L("Mouvement supprimé")); });
  }
  else if (a === "statview") { statView = el.dataset.v; anaSel = ""; $("#view").scrollTop = 0; render(); }
  else if (a === "ana") { anaSel = el.dataset.v; render(); const h = $("#view .ana-t") || $("#view .seg.wide"); if (h) { h.setAttribute("tabindex", "-1"); h.scrollIntoView({block: "start"}); h.focus({preventScroll: true}); } }
  else if (a === "cat-all") { catAll = el.dataset.v === "1"; render(); }
  else if (a === "statkind") { statKind = el.dataset.v; render(); }
  else if (a === "period") openPeriod(el.dataset.t);
  else if (a === "op-month") { const m = shiftMonth(opRange.from.slice(0, 7), +el.dataset.n); opRange = {from: m + "-01", to: lastDay(m)}; opPreset = m === today().slice(0, 7) ? "month" : "custom"; render(); announce(cap1(monthName(m)) + ", " + plur(opsList().length, L("opération"), L("opérations"))); }
  else if (a === "acc-ops") { opAcc = id; opPreset = "month"; opRange = presetRange("month"); filter = "all"; query = ""; if (tab === "operations") render(); else location.hash = "operations"; }
  else if (a === "pins") openPins();
  else if (a === "neg") { const inp = document.getElementById(el.dataset.for); if (inp) { const x = inp.value.trim().replace(/^−/, "-"); inp.value = x.startsWith("-") ? x.slice(1) : "-" + x; inp.dispatchEvent(new Event("input", {bubbles: true})); inp.focus(); announce(inp.value.startsWith("-") ? L("Montant négatif") : L("Montant positif")); } }
  else if (a === "part-add") { readTx(); const l = draft.parts[draft.parts.length - 1]; draft.parts.push({amtS: "", cat: l.cat, acc: l.acc}); renderTx("p-amt-" + (draft.parts.length - 1)); }
  else if (a === "part-del") { readTx(); draft.parts.splice(+el.dataset.i, 1); renderTx("p-amt-0"); }
  else if (a === "preset") { const pp = el.dataset.p; if (periodTarget === "ops") { opPreset = pp; opRange = presetRange(pp); } else setPreset(pp); closeSheet(); render(); announce(L("Période : ") + (PRESETS.find(x => x[0] === pp) || [0, ""])[1]); }
  else if (a === "stat-accs") openStatAccs();
  else if (a === "sa-pick") { const c = el.dataset.c; document.querySelectorAll('input[name="sa"]').forEach(x => x.checked = c === "ALL" || acc(x.value).cur === c); announce(c === "ALL" ? L("Tous les comptes cochés") : L("Comptes en ") + plural(c) + L(" cochés")); }
  else if (a === "catview") { catView = el.dataset.v; render(); }
  else if (a === "balmode") { balMode = el.dataset.v; render(); }
  else if (a === "bilmode") { bilMode = el.dataset.v; render(); }
  else if (a === "bil-year") { const ny = bilY + (+el.dataset.n); if (ny > +today().slice(0, 4)) return; bilY = ny; render(); announce(String(bilY)); }
  else if (a === "catkind") { catKind = el.dataset.v; render(); }
  else if (a === "grip") { if (!dgBlock) openCatOrder(id); }
  else if (a === "grip-acc") { if (!dgBlock) openAccOrder(id); }
  else if (a === "mv-acc") {
    const ac = acc(id); if (!ac) return;
    const ids = accSorted().map(x => x.id), i = ids.indexOf(id), v = el.dataset.v;
    ids.splice(i, 1); const j = v === "up" ? Math.max(0, i - 1) : v === "down" ? Math.min(ids.length, i + 1) : v === "first" ? 0 : ids.length; ids.splice(j, 0, id);
    const ok = reorderAccs(ids); touch("meta"); render(); openAccOrder(id);
    const nb = $("#sheet").querySelector(`[data-act="mv-acc"][data-v="${v}"]:not([disabled])`) || $("#sheet").querySelector('[data-act="mv-acc"]:not([disabled])'); if (nb) nb.focus();
    const k = accSorted().map(x => x.id).indexOf(id);
    announce(ac.name + " " + L("en position") + " " + (k + 1) + " / " + ids.length + (ok ? "" : ". " + L("Les comptes en évidence sur l'Accueil restent en tête des listes.")));
  }
  else if (a === "mv-cat") {
    const c = cat(id); if (!c) return;
    const sib = S.meta.categories.filter(x => x.kind === c.kind && (x.parent || "") === (c.parent || "")).map(x => x.id), i = sib.indexOf(id), v = el.dataset.v;
    sib.splice(i, 1); const j = v === "up" ? Math.max(0, i - 1) : v === "down" ? Math.min(sib.length, i + 1) : v === "first" ? 0 : sib.length; sib.splice(j, 0, id);
    reorderCats(sib); touch("meta"); render(); openCatOrder(id);
    const nb = $("#sheet").querySelector(`[data-act="mv-cat"][data-v="${v}"]:not([disabled])`) || $("#sheet").querySelector('[data-act="mv-cat"]:not([disabled])'); if (nb) nb.focus();
    announce(c.name + " " + L("en position") + " " + (j + 1) + " / " + sib.length);
  }
  else if (a === "cat-detail") { if (el.dataset.k) statKind = el.dataset.k; openCatDetail(id); }
  else if (a === "fs") fsOpen(el.dataset.k);
  else if (a === "pro") openPro(el.dataset.why);
  else if (a === "pro-buy") proBuy(el.dataset.plan);
  else if (a === "transfer-prep") { if (canCloud()) doCloudBackup(); else doBackup(); }
  else if (a === "go-transfer") { proBack = null; closeSheet(); location.hash = "transfert"; }
  else if (a === "pro-restore") proRestore();
  else if (a === "pro-manage") proManage();
  else if (a === "fs-close") fsClose();
  else if (a === "zoom") { const z = el.parentElement.previousElementSibling; if (!z || !z.classList.contains("zoomable")) return; const r = z.getBoundingClientRect(), s = zGet(z).s; el.dataset.z === "reset" ? zSet(z, 1, 0, 0) : zAround(z, el.dataset.z === "in" ? s * 1.5 : s / 1.5, r.width / 2, r.height / 2); }
  else if (a === "new-acc") { if (!overLimit("acc", S.meta.accounts.length)) openAcc(); }
  else if (a === "edit-acc") openAcc(acc(id));
  else if (a === "del-acc") {
    if (allTx().some(t => t.acc === id || t.to === id) || S.meta.recurring.some(r => r.acc === id || r.to === id)) return err(L("Ce compte est utilisé par des opérations ou des récurrences. Supprimez-les ou déplacez-les d'abord."));
    confirmSheet(L("Supprimer ce compte ?"), L("Supprimer"), () => { S.meta.accounts = S.meta.accounts.filter(x => x.id !== id); touch("meta"); render(); toastDel(L("Compte supprimé")); });
  }
  else if (a === "new-cat") openCat(null, el.dataset.k);
  else if (a === "new-subcat") { const p = cat(id); if (p) openCat(null, p.kind, p.id); }
  else if (a === "edit-cat") openCat(cat(id));
  else if (a === "del-cat") { const c = cat(id); if (c) openCatDelete(c); }
  else if (a === "new-budget") { if (overLimit("bud", S.meta.budgets.length)) return; if (!cats("dep").length) return toast(L("Créez d'abord une catégorie de dépense.")); openBudget(); }
  else if (a === "edit-budget") openBudget(S.meta.budgets.find(b => b.id === id));
  else if (a === "del-budget") confirmSheet(L("Supprimer ce budget ?"), L("Supprimer"), () => { S.meta.budgets = S.meta.budgets.filter(b => b.id !== id); touch("meta"); render(); toastDel(L("Budget supprimé")); });
  else if (a === "new-cur") { if (!overLimit("cur", S.meta.currencies.length)) openCur(); }
  else if (a === "edit-cur") openCur(curOf(el.dataset.c));
  else if (a === "del-cur") {
    const code = el.dataset.c; if (curUsed(code)) return err(L("Cette devise est utilisée par un compte, un budget ou un prêt."));
    confirmSheet(L("Supprimer cette devise ?"), L("Supprimer"), () => { S.meta.currencies = S.meta.currencies.filter(c => c.code !== code); touch("meta"); render(); toastDel(L("Devise supprimée")); });
  }
  else if (a === "export") { if (!allTx().length) return toast(L("Aucune opération à exporter.")); offerFile("operations-" + today() + ".csv", csv(), L("Fichier CSV exporté")); }
  else if (a === "backup") doBackup();
  else if (a === "cloud-backup") doCloudBackup();
  else if (a === "daily-skip") { P.skipDay = today(); savePrefs(); render(); $("#title").focus(); }
  else if (a === "snap-restore") { const d = el.dataset.d; IDB.get("snap-" + d).then(data => { if (data) restoreBackup({data, exportedAt: d + "T12:00:00"}); else toast(L("Cette copie est introuvable.")); }); }
  else if (a === "start") {
    demo = false; S = {meta: startMeta(), months: {}}; localSave(); push("meta"); setSync(col ? "cloud" : "local");
    month = today().slice(0, 7); setPreset("month"); statAccs = null; location.hash = "comptes"; tab = "comptes"; render(); $("#title").focus();
    toast(L("Indiquez le solde de départ de chaque compte, puis ajoutez vos opérations."));
  }
  else if (a === "reset") confirmSheet(L("Effacer tous les comptes, opérations, prêts, récurrences et budgets ? Cette action est définitive. Pensez à enregistrer une sauvegarde avant."), L("Tout effacer"), () => {
    const ids = Object.keys(S.months).map(m => "tx-" + m); ids.forEach(i => getDoc(i).items = []); S.meta = startMeta(); touch("meta", ...ids); render(); toastDel(L("Données effacées"));
  });
});
document.addEventListener("toggle", e => { const k = e.target.dataset && e.target.dataset.fold; if (!k) return; P.fold = P.fold || {}; P.fold[k] = e.target.open; savePrefs(); }, true);
document.addEventListener("submit", e => { e.preventDefault(); if (onSubmit) onSubmit(); });
document.addEventListener("change", async e => {
  const id = e.target.id, nm = e.target.name;
  if (draft && (id === "f-split" || nm === "t" || nm === "mode" || id === "f-acc" || id === "f-to" || id === "f-rep" || id === "f-repeat")) { readTx(); renderTx(id || (nm && document.querySelector(`input[name="${nm}"]:checked`)?.id)); return; }
  if (nm === "k") { const l = $("#f-acc-lab"); if (l) l.textContent = e.target.value === "lent" ? L("Compte d'où sort l'argent") : L("Compte où arrive l'argent"); }
  if (id === "ov-cur") { P.ovCur = e.target.value; savePrefs(); render(); announce(L("Vue d'ensemble en ") + plural(e.target.value)); return; }
  if (id === "base-cur") { setBase(e.target.value); return; }
  if (draft && id === "f-cat") { draft.catTouched = true; draft.cat = e.target.value; markTiles(); const tb = $("#f-cat-btn"); if (tb) tb.focus(); announce(L("Catégorie : ") + catLabel(draft.cat)); return; }
  if (draft && id === "f-date") { setDateField("f-date", e.target.value); draft.date = e.target.value; const tm = document.getElementById("f-date-tm"); if (tm) draft.time = tm.value; }
  if (id === "q-all") { searchAll = e.target.checked; render(); announce(plur(opsList().length, L("résultat"), L("résultats"))); return; }
  if (id === "f-photo" && e.target.files[0] && draft) {
    try { readTx(); draft.photo = await toPhoto(e.target.files[0]); $("#ph-box").innerHTML = phBox(draft); const b = $("#sheet").querySelector(".ph-thumb"); if (b) b.focus(); announce(L("Photo ajoutée")); }
    catch (x) { err(L("Cette image n'a pas pu être lue. Essayez une photo au format JPEG ou PNG.")); }
    return;
  }
  if (id === "op-acc") { opAcc = e.target.value; render(); announce(plur(opsList().length, L("opération"), L("opérations"))); return; }
  if (draft && /^p-(acc|cat)-/.test(id || "")) { readTx(); if (/^p-acc-/.test(id)) return renderTx(id); const pt = $("#p-total"); if (pt) pt.textContent = splitTotal(draft); return; }
  if (id === "ops-day") { dayFilter = e.target.value; if (dayFilter) month = dayFilter.slice(0, 7); render(); const n = opsList().length; announce(n ? plur(n, L("opération"), L("opérations")) : L("Aucune opération")); return; }
  if (id === "bal-date" && bal) { const i = bal.ser.findIndex(p => p.d === e.target.value); if (i >= 0) balShow(i); }
  if (nm === "pmode") { P.mode = e.target.value; savePrefs(); applyPrefs(); announce(L("Thème ") + e.target.nextElementSibling.textContent.toLowerCase()); }
  if (id === "lock-delay") { P.lock.delay = +e.target.value; savePrefs(); announce(e.target.selectedOptions[0].textContent); return; }
  if (id === "lock-bio") { const nm = bioName(); if (e.target.checked) { const ok = await bioRegister(); if (!ok) { e.target.checked = false; toast(nm + " " + L("n'a pas pu être activé ici.")); } else toast(nm + " " + L("activé")); } else { delete P.lock.bio; savePrefs(); toast(nm + " " + L("désactivé")); } return; }
  if (nm === "plang") { P.lang = e.target.value; savePrefs(); location.reload(); return; }
  if (nm === "pstyle") { P.style = e.target.value; savePrefs(); applyPrefs(); announce(L("Style ") + e.target.nextElementSibling.textContent.toLowerCase()); }
  if (nm === "paccent") { P.accent = e.target.value; savePrefs(); applyPrefs(); announce(L("Couleurs ") + THEMES[P.accent].name); }
  if (id === "pdaily") { P.daily = e.target.checked; savePrefs(); announce(P.daily ? L("Rappel quotidien activé") : L("Rappel quotidien désactivé")); return; }
  if (id === "pzoom") { P.zoom = e.target.checked; savePrefs(); applyPrefs(); announce(P.zoom ? L("Zoom de la page autorisé") : L("Zoom de la page désactivé, sauf graphiques")); }
  if (id === "c-img" && e.target.files[0] && catDraft) {
    try { catDraft.img = await toThumb(e.target.files[0]); const r = $("#cicon-img"); r.disabled = false; r.checked = true; $("#img-prev").innerHTML = `<img src="${catDraft.img}" alt="">`; announce(L("Image choisie comme icône")); }
    catch (x) { err(L("Cette image n'a pas pu être lue. Essayez une photo au format JPEG ou PNG.")); }
  }
  if (id === "csv-file" && e.target.files[0]) {
    const f = e.target.files[0]; e.target.value = "";
    try { const rows = parseCSV(decodeText(await f.arrayBuffer())); if (rows.length < 1 || rows[0].length < 2) return toast(L("Ce fichier ne ressemble pas à un CSV : il faut au moins deux colonnes.")); if (!S.meta.accounts.length) return toast(L("Créez d'abord un compte.")); openImport(rows); }
    catch (x) { toast(L("Le fichier n'a pas pu être lu.")); }
  }
  if (id === "backup-file" && e.target.files[0]) {
    const f = e.target.files[0]; e.target.value = "";
    try { restoreBackup(JSON.parse(decodeText(await f.arrayBuffer()))); } catch (x) { toast(L("Ce fichier n'est pas une sauvegarde valide.")); }
  }
  if (impCtx && id && id.startsWith("imp-")) {
    if (id === "imp-head") { impCtx.head = e.target.checked; impCtx.map = impCtx.head ? guessMap(impCtx.rows[0]) : impCtx.map; readImport(); renderImport(); $("#imp-head").focus(); return; }
    readImport(); $("#imp-sum").innerHTML = impSummaryHtml();
  }
});
let selOnUp = false;
document.addEventListener("focusin", e => {
  const t = e.target; if (!t.matches || !t.matches('input[inputmode="decimal"]')) return;
  selOnUp = true; setTimeout(() => { try { t.select(); t.setSelectionRange(0, t.value.length); } catch (x) {} }, 0);
});
document.addEventListener("mouseup", e => { if (selOnUp && e.target.matches && e.target.matches('input[inputmode="decimal"]')) { e.preventDefault(); } selOnUp = false; });
document.addEventListener("touchend", e => { if (selOnUp && e.target.matches && e.target.matches('input[inputmode="decimal"]')) { setTimeout(() => { try { e.target.setSelectionRange(0, e.target.value.length); } catch (x) {} }, 30); } selOnUp = false; });
let searchT;
document.addEventListener("input", e => {
  if (draft && e.target.id === "f-amt") { const to = $("#f-amt-to"), a = acc(draft.acc), b = acc(draft.to); if (to && a && b && draft.autoTo !== false) { const v = parseAmt(e.target.value); to.value = v > 0 ? plain(conv(v, a.cur, b.cur)) : ""; } }
  if (draft && e.target.id === "f-amt-to") draft.autoTo = false;
  if (draft && draft.parts && /^p-amt-/.test(e.target.id)) { readTx(); const pt = $("#p-total"); if (pt) pt.textContent = splitTotal(draft); return; }
  if (e.target.id === "pk-q" && pkCtx && pkCtx.tree) { pkCtx.q = e.target.value; renderPickTree(false); return; }
  if (e.target.id === "pk-q") { const q = norm(e.target.value); document.querySelectorAll("#pick li").forEach(li => li.hidden = !!q && !li.dataset.n.includes(q)); return; }
  if (e.target.id === "icon-q") {
    const q = norm(e.target.value); let n = 0, last = null, any = false;
    document.querySelectorAll("#icons > *").forEach(el => {
      if (el.dataset.g) { if (last) last.hidden = !any; last = el; any = false; return; }
      const ok = !q || (el.dataset.n || "").includes(q); el.hidden = !ok; if (ok) { n++; any = true; }
    });
    if (last) last.hidden = !any; $("#icon-n").textContent = plur(n, L("icône"), L("icônes")); return;
  }
  if (draft && e.target.id === "f-note") { updateSugs(); return; }
  if (e.target.id !== "q") return;
  query = e.target.value; const pos = e.target.selectionStart; render();
  const q = $("#q"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {}
  clearTimeout(searchT); searchT = setTimeout(() => { const n = opsList().length; announce(n ? plur(n, L("opération trouvée"), L("opérations trouvées")) : L("Aucune opération trouvée")); }, 800);
});
document.addEventListener("keydown", e => {
  const g = e.target.closest && e.target.closest(".ctiles,.apills"); if (!g || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  const items = [...g.querySelectorAll("[role=radio]")], i = items.indexOf(e.target), rtl = document.documentElement.dir === "rtl";
  const dl = {ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -1, ArrowDown: 1}[e.key], n = items[(i + dl + items.length) % items.length];
  e.preventDefault(); items.forEach(x => x.tabIndex = -1); n.tabIndex = 0; n.focus();
});
document.addEventListener("keydown", e => {
  if (!e.target.classList || !e.target.classList.contains("mc-d")) return;
  const rtl = document.documentElement.dir === "rtl", map = {ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7};
  if (!(e.key in map)) return; e.preventDefault();
  const n = addDays(calDay, map[e.key]); calDay = n; calM = n.slice(0, 7); render(); const b = $("#view").querySelector(`.mc-d[data-d="${n}"]`); if (b) b.focus();
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#phv") && !$("#phv").hidden) { e.preventDefault(); return closePhoto(); } if (e.key === "Escape" && !$("#wrap").hidden) closeSheet(); });
window.addEventListener("beforeprint", () => document.documentElement.setAttribute("data-mode", "light"));
window.addEventListener("afterprint", () => applyPrefs());
document.addEventListener("visibilitychange", () => { if (!document.hidden && S) { if (lastAuto !== today() && runAuto()) render(); setTimeout(remindLate, 600); } });
window.addEventListener("hashchange", () => { closeSheet(); route(); });
