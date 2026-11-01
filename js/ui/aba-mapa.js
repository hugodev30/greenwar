// js/ui/aba-mapa.js — Interface: aba Mapa (camadas, ordens, recrutar). Na guerra de 2022, os exércitos nos estados (js/ui/frentes.js).
function tabMapa(el){
  const ph = phaseOf(G), FM = frontMode(G); // 2022: exércitos nos estados (js/ui/frentes.js e js/core/tropas.js); os exércitos do 1964 (js/ui/exercitos.js) ficam de fora
  if (FM){ UI.selArmy = null; UI.pend = null; UI.ordMode = null; }
  if (UI.selArmy && !armyById(G, UI.selArmy)) UI.selArmy = null;
  if (!UI.selArmy) UI.ordMode = null;
  const sel = UI.selArmy ? armyById(G, UI.selArmy) : null, uf = UI.selUF;
  if (UI.pend && (!sel || sel.id !== UI.pend.army || !armyTargets(G, sel).some(t => t.uf === UI.pend.to))) UI.pend = null;
  const pend = UI.pend;
  const panel = FM ? (uf ? frontUfPanel(uf) : frontsPanel()) : sel ? armyPanel(sel) : uf ? ufPanel(uf) : overviewPanel();
  const hint = FM ? frontHintHTML() : ph.noArmies ? "" : G.simple && !UI.manual && !sel ? `<div class="maphint">Modo simples: seus exércitos agem sozinhos. ${MOBILE_MAP() ? "Toque" : "Clique"} num estado para ver detalhes e agir nele.</div>` : sel && sel.side === "player" ? `<div class="maphint">${esc(sel.name)} selecionado. ${UI.ordMode === "atacar" ? `${MOBILE_MAP() ? "Toque" : "Clique"} num estado com <b class="hl-a">borda vermelha</b> para atacar.` : UI.ordMode ? `${MOBILE_MAP() ? "Toque" : "Clique"} num estado com <b class="hl-m">borda azul</b> para mover.` : `${MOBILE_MAP() ? "Toque" : "Clique"} num estado destacado (<b class="hl-a">vermelho</b> = atacar, <b class="hl-m">azul</b> = mover) ou use os botões ao lado.`} Ataques mostram a previsão antes de confirmar.</div>`
    : `<div class="maphint">Use os botões grandes em <b>Meus exércitos</b> (⚔ Atacar · ➜ Mover · 🛡 Defender · ＋ Reforçar) — ou ${MOBILE_MAP() ? "toque" : "clique"} numa <b>ficha azul</b> no mapa e depois no destino.</div>`;
  const lim = commandLimit(G), used = ordersUsed(G), nA = armiesOf(G, "player").length;
  const infoOpen = UI.layerInfo === true;
  const chip = FM ? frontChipHTML() : ph.noArmies ? "" : `<button class="ordchip${used >= lim ? " full" : ""}" id="btnOrders" title="Lista de ordens">⚑ Ordens ${used}/${lim}${nA ? ` · ${armiesOf(G, "player").filter(a => a.order).length}/${nA} exérc.` : ""}</button>`;
  const big = !!UI.mapBig;
  el.innerHTML = `<div class="maplayout${ph.noArmies ? "" : " war"}${big ? " big" : ""}"><div class="panel"><div class="maphead"><h3>Mapa</h3><span class="mhr">${chip}<button class="ordchip" id="btnMapBig" aria-pressed="${big}" title="${big ? "Reduzir o mapa" : "Ampliar o mapa"}">${big ? "⊖ Reduzir mapa" : "⊕ Ampliar mapa"}</button></span></div>
    <div class="layerbar" role="group" aria-label="Camadas do mapa"><span class="lk">Camada:</span><div class="seg" role="radiogroup"><button role="radio" aria-checked="${UI.mapMode==="controle"}" data-mode="controle" class="${UI.mapMode==="controle"?"on":""}">🗺 Controle</button><button role="radio" aria-checked="${UI.mapMode==="agitacao"}" data-mode="agitacao" class="${UI.mapMode==="agitacao"?"on":""}">🔥 Agitação</button></div><button class="infobtn" id="btnLayerInfo" aria-expanded="${infoOpen ? "true" : "false"}" aria-controls="layerInfo" title="O que é agitação?">i</button><button class="ordchip" id="btnMapDesc" aria-expanded="${UI.mapDesc ? "true" : "false"}" aria-controls="mapDesc">📝 Descrição do mapa</button></div>
    ${UI.mapDesc ? `<div class="mapdesc" id="mapDesc" tabindex="-1">${mapDescriptionHTML(G, UI.mapMode)}</div>` : ""}
    ${!infoOpen && UI.mapMode === "agitacao" ? `<div class="layerinfo short"><b>Agitação</b> (0–100) = tensão em cada estado. <b>Roxo</b> = calmo · <b>azul/verde</b> = tenso · <b>amarelo</b> = revolta. Média acima de 62 derruba seu apoio; acima de 88, revolta. <button class="linkbtn" id="btnLayerMore">Saiba mais (i)</button></div>` : ""}
    ${infoOpen ? `<div class="layerinfo" id="layerInfo">${UI.mapMode === "agitacao" ? `<b>Agitação</b> (0–100) mede a tensão em cada estado: protestos, greves, bloqueios. A cor vai do <b>roxo (calmo)</b>, passando por azul e verde, ao <b>amarelo (revolta)</b>; o número aparece sob a sigla.
      <ul><li>Todo mês ela tende a um alvo que depende do seu <b>Apoio Popular</b>${frontMode(G) ? ", da economia, das tropas no estado e de haver guerra por perto." : ", da economia, das tropas no estado e de haver disputa."}</li>
      <li>Média <b>acima de 62</b> nos seus estados: <b>−2 de Apoio Popular por mês</b>. Abaixo de 30: +1.</li>
      <li>Estado <b>acima de 88</b> com pouca tropa: em guerra, <b>revolta</b> ${frontMode(G) ? "(o estado passa para o inimigo vizinho)" : "(o estado entra em disputa)"}; fora dela, grandes protestos (−2 de apoio) ou até perder o estado.</li>
      <li>Agitação alta também enfraquece suas tropas em combate ali.</li>
      <li>Para baixar: <b>investir</b> (−15), <b>propaganda</b> (−8) ou <b>acordo com o governador</b> (−20), clicando no estado; tropas estacionadas também ajudam.</li></ul>` : `<b>Controle</b> mostra quem governa cada estado (cores na legenda). Troque para <b>Agitação</b> para ver onde o país está prestes a explodir.`}</div>` : ""}${UI.mapMode === "agitacao" ? "" : hint}<div class="mapbox" id="mapMain"></div></div><aside class="panel sidepanel">${panel}</aside></div>`;
  const toPanel = () => { if (window.innerWidth < 900) setTimeout(() => $(".sidepanel") && $(".sidepanel").scrollIntoView({ behavior: "smooth", block: "start" }), 30); };
  const order = (a, type, to) => { UI.pend = null; const r = setOrder(G, a.id, type, to); if (r.ok) AUDIO.sfx("order"); if (r.ok && type !== "reforcar" && type !== "defender" && type){ UI.selArmy = null; UI.ordMode = null; } afterAct(r); };
  // passo 3: prévia; tocar de novo no mesmo destino confirma
  const propose = (a, t) => { if (UI.pend && UI.pend.army === a.id && UI.pend.to === t.uf){ order(a, t.type, t.uf); return; } UI.pend = { army: a.id, to: t.uf, type: t.type }; renderGame(); };
  const pickArmy = (ufc, side) => {
    const list = (G.armies || []).filter(a => a.uf === ufc && a.side === side);
    if (!list.length) return;
    if (side === "player"){
      const i = list.findIndex(a => a.id === UI.selArmy);
      UI.pend = null; UI.ordMode = null;
      if (i >= 0 && list.length === 1){ UI.selArmy = null; UI.selUF = ufc; renderGame(); return; }
      const next = i >= 0 ? list[(i + 1) % list.length] : (list.find(a => !a.order) || list[0]);
      UI.selArmy = next.id; UI.selUF = ufc; renderGame(); toPanel();
    } else {
      if (sel && sel.side === "player" && armyTargets(G, sel).some(t => t.uf === ufc)){ propose(sel, armyTargets(G, sel).find(t => t.uf === ufc)); return; }
      UI.selArmy = list[0].id; UI.selUF = ufc; renderGame(); toPanel();
    }
  };
  const onPick = p => {
    if (sel && sel.side === "player"){
      const t = armyTargets(G, sel).find(x => x.uf === p);
      if (t){ UI.ordMode = null; propose(sel, t); return; }
      if (p === sel.uf){ UI.pend = null; UI.selArmy = null; UI.selUF = p; renderGame(); return; }
    }
    UI.pend = null; UI.selArmy = null; UI.selUF = p; renderGame();
    if (FM){ toPanel(); return; }
    if (ph.war && sideOf(G, G.control[p], ph) === "contested"){ const b = battleAt(p); b ? openBattle(b) : openForecast(p); return; }
    toPanel();
  };
  const milOn = UI.mapMode !== "agitacao", wideFc = window.innerWidth > 900 && !big;
  if (FM){ if (!milOn){ UI.tpSel = null; UI.tpPend = null; } // guerra de 2022: fichas dos exércitos, destinos com chance e setas (js/ui/mapa-frentes.js)
    renderMap($("#mapMain"), G.control, G.lastMapChanges, true, { g: G, sel: uf, mode: UI.mapMode, military: milOn, fronts: true, arrows: [], onPick, onTpTarget: tpPickUF, onTropa: tpPickArmy,
      tpSel: UI.tpSel, tpPend: UI.tpPend, tpMark: tpMarkList(), overlay: milOn ? tpMapGoalHTML() + tpHudHTML() + tpFloatHTML() : "", zoom: true }); }
  else renderMap($("#mapMain"), G.control, G.lastMapChanges, true, { g: G, sel: uf, selArmy: sel, tgtMode: UI.ordMode || null, pend: milOn && sel ? pend : null, mode: UI.mapMode, military: milOn, onPick, onArmy: pickArmy, overlay: milOn && sel && pend && !wideFc ? forecastCardHTML(sel, pend) : "", zoom: true });
  if (milOn && sel && pend && wideFc) $(".sidepanel").insertAdjacentHTML("afterbegin", forecastCardHTML(sel, pend));
  if (!tabMapa._esc){ tabMapa._esc = e => { if (e.key !== "Escape" || UI.tab !== "mapa" || document.querySelector(".overlay, .modal, #ecoModal") || (typeof coachBusy === "function" && coachBusy())) return;
      if (UI.tpPend){ UI.tpPend = null; renderGame(); } else if (UI.tpSel){ UI.tpSel = null; renderGame(); } else if (UI.pend){ UI.pend = null; renderGame(); } else if (UI.selArmy){ UI.selArmy = null; renderGame(); } }; document.addEventListener("keydown", tabMapa._esc); }
  if ($("#btnMapDesc")) $("#btnMapDesc").onclick = () => { UI.mapDesc = !UI.mapDesc; renderGame(); if (UI.mapDesc) setTimeout(() => $("#mapDesc") && $("#mapDesc").focus(), 30); };
  if ($("#btnMapBig")) $("#btnMapBig").onclick = () => { UI.mapBig = !big; renderGame(); };
  el.querySelectorAll("[data-fc]").forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.fc;
    if (k === "ok") order(sel, pend.type, pend.to); else if (k === "full") openAttackForecast(sel, pend.to); else { UI.pend = null; renderGame(); } });
  if (pend && $(".fcard [data-fc=ok]") && MOBILE_MAP()) setTimeout(() => { const c = $(".fcard"); if (c) c.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 40);
  el.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { UI.mapMode = b.dataset.mode; renderGame(); });
  if ($("#btnLayerInfo")) $("#btnLayerInfo").onclick = () => { UI.layerInfo = !infoOpen; renderGame(); };
  if ($("#btnLayerMore")) $("#btnLayerMore").onclick = () => { UI.layerInfo = true; renderGame(); };
  el.querySelectorAll(".mapacts .act").forEach(b => b.onclick = () => afterAct(doMapAction(G, uf, b.dataset.k)));
  el.querySelectorAll("[data-army]").forEach(b => b.onclick = () => { const a = armyById(G, b.dataset.army); UI.ordMode = null; UI.pend = null; UI.selArmy = a.id; UI.selUF = a.uf; renderGame(); window.scrollTo({ top: Math.max(0, ($("#mapMain").getBoundingClientRect().top + window.scrollY) - 70), behavior: "smooth" }); });
  el.querySelectorAll("[data-desel]").forEach(b => b.onclick = () => { UI.selArmy = null; UI.selUF = null; UI.ordMode = null; UI.pend = null; renderGame(); });
  const toMap = () => window.scrollTo({ top: Math.max(0, ($("#mapMain").getBoundingClientRect().top + window.scrollY) - 70), behavior: "smooth" });
  // botões grandes: ⚔ propõe o melhor alvo (2º clique ou ✔ confirma) · ➜ destaca destinos · 🛡/＋ aplicam na hora
  el.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const a = armyById(G, b.dataset.a); if (!a) return; const q = b.dataset.q;
    if (q === "def") return order(a, a.order && a.order.type === "defender" ? null : "defender");
    if (q === "ref") return order(a, a.order && a.order.type === "reforcar" ? null : "reforcar");
    UI.selArmy = a.id; UI.selUF = a.uf;
    if (q === "atk" && UI.pend && UI.pend.army === a.id && UI.pend.type === "atacar") return order(a, "atacar", UI.pend.to);
    if (q === "atk"){ const best = attackChoices(a)[0]; UI.ordMode = "atacar"; UI.pend = best ? { army: a.id, to: best.uf, type: "atacar" } : null; renderGame(); toMap(); return; }
    const mv = armyTargets(G, a).filter(t => t.type !== "atacar"); UI.ordMode = "mover"; UI.pend = null;
    if (mv.length === 1){ UI.pend = { army: a.id, to: mv[0].uf, type: mv[0].type }; } renderGame(); toMap(); });
  el.querySelectorAll("[data-undo]").forEach(b => b.onclick = () => { const a = armyById(G, b.dataset.undo); if (a){ UI.pend = null; order(a, null); } });
  el.querySelectorAll("[data-mode-off]").forEach(b => b.onclick = () => { UI.ordMode = null; renderGame(); });
  el.querySelectorAll("[data-atkw]").forEach(b => b.onclick = () => { const a = armyById(G, b.dataset.atkw); if (!a) return; UI.selArmy = a.id; UI.selUF = a.uf; UI.ordMode = "atacar"; UI.pend = { army: a.id, to: b.dataset.to, type: "atacar" }; renderGame(); toMap(); });
  el.querySelectorAll("[data-auto]").forEach(b => b.onclick = () => { const r = autoOrders(G, b.dataset.auto, false); if (r.ok && r.n) AUDIO.sfx("order"); afterAct(r); });
  el.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => { UI.pend = null; afterAct(clearOrders(G)); });
  el.querySelectorAll("[data-manual]").forEach(b => b.onclick = () => { UI.manual = b.dataset.manual === "1"; renderGame(); });
  el.querySelectorAll("[data-auto-on]").forEach(b => b.onclick = () => afterAct(setAutoOrders(G, "auto")));
  if ($("#autoSel")) $("#autoSel").onchange = e => afterAct(setAutoOrders(G, e.target.value));
  el.querySelectorAll("[data-south]").forEach(b => b.onclick = openSouth);
  el.querySelectorAll("[data-battle]").forEach(b => b.onclick = () => { const f = b.dataset.battle, r = battleAt(f); r ? openBattle(r) : openForecast(f); });
  { const recent = (G.battleLog || []).filter(b => G.mil && b.month === G.mil.month);
    el.querySelectorAll(".batrow[data-bat]").forEach(b => b.onclick = () => { const r = recent[+b.dataset.bat]; if (r) openBattle(r); }); }
  if (sel){
    el.querySelectorAll(".tglist .tgt").forEach(b => b.onclick = () => { propose(sel, { uf: b.dataset.to, type: b.dataset.type }); window.scrollTo({ top: Math.max(0, ($("#mapMain").getBoundingClientRect().top + window.scrollY) - 70), behavior: "smooth" }); });
  }
  if (FM){ bindFronts(el); if ($("#btnOrders")) $("#btnOrders").onclick = () => { UI.selUF = null; renderGame(); toPanel(); }; return; }
  if ($("#btnRecruit")) $("#btnRecruit").onclick = () => { const r = recruitArmy(G, $("#btnRecruit").dataset.uf || null); if (r.ok) UI.selArmy = r.id; afterAct(r); };
  if ($("#btnOrders")) $("#btnOrders").onclick = () => { UI.selArmy = null; UI.selUF = null; renderGame(); toPanel(); };
}
