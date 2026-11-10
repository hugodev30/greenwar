// js/ui/aba-diplomacia.js — Interface: aba Diplomacia (v1.20: PD, demandas, favores, strip).
function opinionBar(v){ const w = Math.abs(v) / 2, col = v >= 0 ? "#6fae6a" : "#c2563f"; return `<div class="opbar"><i style="${v >= 0 ? "left:50%" : `left:${50 - w}%`};width:${w}%;background:${col}"></i><b></b></div>`; }
function dipStripHTML(g){
  const C = scOf(g).campaign, n = (C.actors || []).length, rec = recognizedCount(g), sanc = sanctioningCount(g), en = enemySupportCount(g), iso = isolationStatus(g);
  const bits = [
    `<span title="Reconhecimentos">Reconhecimentos <b>${rec}/${n}</b></span>`,
    sanc ? `<span class="bad" title="Sob sanção">Sob sanção <b>${sanc}</b></span>` : `<span class="muted">Sob sanção <b>0</b></span>`,
    en ? `<span class="bad" title="Apoiam o inimigo">Apoiam o inimigo <b>${en}</b></span>` : `<span class="muted">Apoiam o inimigo <b>0</b></span>`,
    `<span title="Pontos de Diplomacia">PD <b>${g.pd || 0}/${pdCap(g)}</b></span>`
  ];
  if (iso.warn || iso.months > 0) bits.push(`<span class="bad" title="Isolamento">Isolamento <b>${iso.months}/${iso.need}</b></span>`);
  return `<div class="dipstrip">${bits.join("")}</div>`;
}
function tabDiplomacia(el){
  const C = SCEN.campaign, L = dipLabels(G), iso = isolationStatus(G);
  const list = C.actors.map(A => {
    const st = G.actors[A.id], chips = [];
    if (st.recognized) chips.push(`<em class="chip good">Reconhece você</em>`);
    if (st.aligned) chips.push(`<em class="chip">Alinhado</em>`);
    if (st.sanctioning) chips.push(`<em class="chip bad">Sanções</em>`);
    if (st.supportsEnemy) chips.push(`<em class="chip bad">Apoia o inimigo</em>`);
    if (st.demand) chips.push(`<em class="chip mid">Pedido</em>`);
    if (st.dependence >= 20) chips.push(`<em class="chip mid"><span>Dependência</span> ${Math.round(st.dependence)}</em>`);
    const debt = G.debts.filter(d => d.aid === A.id).reduce((s, d) => s + d.amount, 0);
    if (debt) chips.push(`<em class="chip mid"><span>Dívida</span> ${debt}</em>`);
    return `<button class="actor${UI.selActor===A.id?" on":""}" data-a="${A.id}"><div class="an">${portraitImg(portraitOf("atores", A.id), 40)}<div><strong>${esc(A.name)}</strong><small>${esc(A.tag)}</small></div></div>
      <div class="aop"><span>Opinião</span>${opinionBar(st.opinion)}<b>${sgn(st.opinion)}</b></div><div class="chips">${chips.join("")}</div></button>`;
  }).join("");
  let panel = `<p class="muted">Escolha um governo ou organismo. Atenda o pedido ativo, peça um favor ou envie uma missão — tudo custa Pontos de Diplomacia (PD), não ações.</p>`;
  if (iso.warn) panel = `<div class="dealmsg bad"><span>Isolamento diplomático</span>: ${iso.months}/${iso.need} <span>meses sob pressão. Busque reconhecimento ou acalme potências antes do Isolamento total.</span></div>` + panel;
  const aid = UI.selActor;
  if (aid){
    const A = actorDef(G, aid), st = G.actors[aid], dem = st.demand, favs = favorPool(G, A);
    const rels = Object.entries(A.rel || {}).map(([o, v]) => { const B = actorDef(G, o); return B ? `<span class="${v > 0 ? "good" : "bad"}"><span>${esc(B.short || B.name)}</span> ${v > 0 ? "▲" : "▼"}</span>` : ""; }).join(" ");
    const demLab = dem ? (L.demand[dem] || dem) : "—";
    const canGive = A.canGive || "Favores conforme a fase e a opinião.";
    const busy = !!G.dealtWith[aid] || !!G.queue.length || !!G.ended;
    const demCost = dem ? demandCost(G, dem) : 0;
    panel = `<h3>${esc(A.name)}</h3>${whoHTML(portraitOf("atores", aid), 48)}<p class="ideo">${esc(A.ideology)}</p>
      <div class="ufinfo"><div><span>Opinião</span>${opinionBar(st.opinion)}<b>${sgn(st.opinion)}</b></div>
      <div><span>O que quer agora</span><b>${esc(demLab)}${dem ? ` <em class="chip mid">${demCost} PD</em>` : ""}</b></div>
      <div><span>O que pode dar</span><b>${esc(canGive)}</b></div>
      <div><span>Relações</span><b class="rels">${rels || "—"}</b></div></div>
      <div class="dealbtns">
        <button class="primary" id="btnMeet" ${!dem || busy || (G.pd || 0) < demCost ? "disabled" : ""} title="${!dem ? "Sem pedido pendente" : busy ? "Já negociou ou há eventos" : (G.pd || 0) < demCost ? "PD insuficientes" : "Atender o pedido ativo"}">Atender pedido${dem ? ` (${demCost} PD)` : ""}</button>
        <button class="secondary" id="btnMission" ${G.used["mis_" + aid] || busy || (G.pd || 0) < 1 || G.money < (C.missionCost ?? 2) ? "disabled" : ""}>Missão (1 PD · ${C.missionCost ?? 2} ${esc(C.money.short)})</button>
      </div>
      <div class="favorlist"><h4>Pedir favor</h4>
        ${favs.length ? favs.map(f => { let c = favorCost(G, f); if (A.cheaper && A.cheaper[f] != null) c = A.cheaper[f]; const need = (C.diplo && C.diplo.favorOpinion && C.diplo.favorOpinion[f]) || 0; const ok = !busy && (G.pd || 0) >= c && st.opinion >= need; const tip = st.opinion < need ? ({10:"Opinião baixa demais (precisa +10)",15:"Opinião baixa demais (precisa +15)",20:"Opinião baixa demais (precisa +20)",25:"Opinião baixa demais (precisa +25)",30:"Opinião baixa demais (precisa +30)"}[need] || "Opinião baixa demais") : (G.pd || 0) < c ? "Pontos de Diplomacia insuficientes" : (L.favor[f] || f); return `<button class="secondary sm favbtn" data-fav="${f}" ${ok ? "" : "disabled"} title="${esc(tip)}">${esc(L.favor[f] || f)} <small>${c} PD</small></button>`; }).join("") : `<p class="muted">Nenhum favor disponível nesta fase.</p>`}
      </div>
      ${UI.dealMsg ? `<div class="dealmsg ${UI.dealMsg.cls}">${esc(UI.dealMsg.text)}</div>` : ""}
      <details class="conseq"><summary>Como funciona</summary><ul>
        <li>PD: renda base por turno (+ bônus de Relações Internacionais); ações diplomáticas gastam PD, não AP.</li>
        <li>Atender pedido: cumpre o que o ator quer agora e melhora a opinião.</li>
        <li>Pedir favor: reconhecimento, crédito, armas, mediação etc. (conforme a fase).</li>
        <li>Missão: +8 de opinião (1 PD + Recursos).</li>
        <li>Isolamento: sem reconhecimento e sob sanções/hostilidade por meses seguidos leva à derrota Isolamento total.</li></ul></details>`;
  }
  el.innerHTML = `${dipStripHTML(G)}<div class="diplayout"><div class="actors">${list}</div><div class="panel dealpanel">${panel}</div></div>`;
  el.querySelectorAll(".actor").forEach(b => b.onclick = () => { if (UI.selActor !== b.dataset.a){ UI.dealMsg = null; } UI.selActor = b.dataset.a; renderGame(); if (window.innerWidth < 900) setTimeout(() => $(".dealpanel") && $(".dealpanel").scrollIntoView({ behavior: "smooth" }), 30); });
  if ($("#btnMeet")) $("#btnMeet").onclick = () => { const r = meetDemand(G, aid); UI.dealMsg = { text: r.msg, cls: r.ok ? "good" : "bad" }; afterAct(r); };
  if ($("#btnMission")) $("#btnMission").onclick = () => { const r = diploMission(G, aid); UI.dealMsg = { text: r.msg, cls: r.ok ? "good" : "bad" }; afterAct(r); };
  el.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => { const r = askFavor(G, aid, b.dataset.fav); UI.dealMsg = { text: r.msg, cls: r.ok ? "good" : "bad" }; afterAct(r); });
}
