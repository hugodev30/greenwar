// js/ui/frentes.js — Interface: guerra de 2022 com EXÉRCITOS nos estados — painel dos exércitos (força, moral, general, ordem),
// escolha do destino com a chance de vitória (e o bônus de flanco) antes de confirmar, ímpeto, avisos de cerco, recrutar num estado,
// comando automático, ofensiva especial, a escolha da tática na Batalha de Recife, relatório de cada batalha ("por que ganhou / perdeu"),
// a animação das batalhas no fim do mês e a tela de vitória "Recife caiu!".
// Fase 16: painel de exércitos (busca, filtro "sem ordem", renomear, dividir, juntar, experiência ★), HUD de movimento no mapa
// (passos 1-2-3, "próximo sem ordem" ⏭, ordens dadas com ✕ para cancelar) e recrutar escolhendo "nova divisão" ou "reforçar".
/* Só aparece quando frontMode(G) (js/core/frentes.js + js/core/tropas.js). No 1964 a aba Mapa continua com js/ui/exercitos.js.
   Seleção: UI.tpSel = id do exército; UI.tpPend = estado escolhido (a chance aparece; 2º toque ou ✔ confirma); UI.tpTat = tática escolhida para Recife. */
function fCfg(){ return frontCfg(G); }
function fFala(grp, k){ return frontFala(G, grp, k); }
function tF(k){ return frontFala(G, "tropas", k); }
// nomes próprios (estados, exércitos) não passam pelo tradutor
function nm(t){ return `<b class="pn" translate="no">${esc(t)}</b>`; }
function tpSelArmy(){ const a = UI.tpSel ? tpById(G, UI.tpSel) : null; if (!a || a.side !== "player"){ UI.tpSel = null; UI.tpPend = null; return null; }
  if (UI.tpPend && !tpTargets(G, a).some(t => t.to === UI.tpPend)) UI.tpPend = null; return a; }
// "Recife a N estados" (caminho mais curto pelos estados inimigos) e a distância do inimigo até Brasília
function tpEnemyNear(g){ const d = ufDist(tpCap(g)); let m = 99; for (const uf of TP_UFS) if (tpSide(g, uf) === "enemy" && d[uf] < m) m = d[uf]; return m === 99 ? 0 : m; }
function tpGoalText(g, f){ const P = tpGoalPath(g, f.id), n = P ? P.length : 0, F = k => frontFala(g, "mapa", k); return n ? (n === 1 ? F("faltaUma") : gfmt(F("faltam"), n)) : ""; }
function frontPathHTML(f){
  const D = fCfg().frentes[f.id]; if (!D || !D.vitoria) return "";
  const t = tpGoalText(G, f), nE = tpEnemyNear(G);
  const a = t ? `<span class="good">🎯 <span>${esc(t)}</span></span>` : "";
  const b = nE && nE <= 3 ? `<span class="bad">⚠ <span>${esc(nE === 1 ? fFala("mapa", "faltaUmaInimigo") : gfmt(fFala("mapa", "faltamInimigo"), nE))}</span></span>` : "";
  return a || b ? `<div class="fpath">${a}${b}</div>` : "";
}
// Ímpeto (−3 a +3): barra de 7 casas e o efeito na força
function tpMomHTML(){
  const m = tpMomentum(G), key = m > 0 ? "m" + m : m < 0 ? "n" + (-m) : "z", cells = [];
  for (let i = -3; i <= 3; i++) cells.push(`<i class="${i === 0 ? "c" : ""}${m > 0 && i > 0 && i <= m ? " on up" : ""}${m < 0 && i < 0 && i >= m ? " on dn" : ""}"></i>`);
  return `<div class="tpmom ${m > 0 ? "up" : m < 0 ? "dn" : ""}" role="status"><span>⚡ <span>${esc(fFala("impeto", "titulo"))}</span></span><span class="mombar" aria-hidden="true">${cells.join("")}</span><b>${esc(fFala("impeto", key))}</b></div>`;
}
// Avisos de cerco: seus exércitos sem ligação com Brasília e os inimigos cercados
function tpCutHTML(){
  const L = {}, cut = a => { const k = a.side + a.fac; if (!(k in L)) L[k] = tpLinked(G, a.side, a.fac); return tpCut(G, a, L[k]); };
  const mine = tpArmies(G, "player").filter(cut), foes = tpArmies(G, "enemy").filter(cut);
  if (!mine.length && !foes.length) return "";
  return `<ul class="tpcut">${mine.map(a => `<li class="bad"><button class="linkbtn" data-tpsel="${a.id}">⛓ ${esc(gfmt(fFala("cerco", "aviso"), tpName(G, a), ufName(a.uf)))}</button></li>`).join("")}${foes.map(a => `<li class="good"><button class="linkbtn" data-tpfocus="${a.uf}">⛓ ${esc(gfmt(fFala("cerco", "inimigo"), tpName(G, a), ufName(a.uf)))}</button></li>`).join("")}</ul>`;
}
function frontStatHTML(label, v, max, color){
  return `<div class="fstat"><span>${label}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${color}"></i></div><b>${Math.round(v)}</b></div>`;
}
// Força total dos dois lados (barra)
function tpTotalsHTML(){
  const P = Math.round(tpTotal(G, "player")), E = Math.round(tpTotal(G, "enemy")), tot = Math.max(1, P + E);
  return `<div class="pw tptot" title="${esc(tF("totais"))}"><b style="color:#9cc3ea"><span>${esc(tF("voce"))}</span> ${P}</b><div class="bar2"><i class="p" style="width:${P / tot * 100}%"></i><i class="e" style="width:${E / tot * 100}%"></i></div><b style="color:#f0a493">${E} <span>${esc(tF("inimigo"))}</span></b></div>`;
}
// Cada frente: nome, capital inimiga e o caminho até ela; depois o ímpeto e os avisos de cerco
function tpTallyHTML(){
  return (G.war.fronts || []).map(f => `<div class="tptally"><div class="fhead"><h4>${esc(frontName(G, f))}</h4><small>★ <b>${esc(fFala("reduto", f.id))}</b></small></div>${frontPathHTML(f)}</div>`).join("") + tpMomHTML() + tpCutHTML();
}
// Mini-ficha (HTML) para listas
function tpMiniChip(a){
  return `<svg class="tpmini" viewBox="-20 -11 40 22" width="38" height="21" aria-hidden="true"><g class="tchip ${a.side === "player" ? "p" : "e"}"><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/>${a.side === "player" ? `<rect class="sym" x="-16" y="-5.5" width="10" height="8"/><path class="sym" d="M-16,-5.5L-6,2.5M-16,2.5L-6,-5.5"/>` : `<path class="sym" d="M-11,-7L-5,-1.5L-11,4L-17,-1.5z"/>`}<text class="cn" x="6.5" y="0.5">${Math.round(a.str)}</text></g></svg>`;
}
function tpOrderHTML(a){
  const o = a.order;
  if (!o) return `<span class="muted">🛡 <span>${esc(tF("semOrdemCurta"))}</span></span>`;
  const c = o.type === "atacar" ? Math.round(tpChance(G, a, o.to).chance * 100) : null;
  return `<span class="${o.type === "atacar" ? "tpo-a" : "tpo-m"}">${o.type === "atacar" ? "⚔" : "➜"} <span>${esc(tF(o.type === "atacar" ? "ordemAtaca" : "ordemVai"))}</span> ${nm(ufName(o.to))}${c != null ? ` <em class="tpc ${tpChanceCls(c)}">${c}%</em>` : ""}${o.tatica ? ` · <span>${esc(fFala("taticas", o.tatica))}</span>` : ""}${a.special ? " 💥" : ""}</span>`;
}
// Experiência: estrelas (★ veteranos, ★★ elite) e o nome do nível
function tpXpHTML(a, long){
  const lv = tpXpLevel(a), st = lv ? `<span class="xpst" aria-hidden="true">${"★".repeat(lv)}</span>` : "";
  return long ? `<span class="tpxp lv${lv}">${st}<span>${esc(tF("xp" + lv))}</span> <small>${Math.round(a.xp || 0)}/100</small></span>` : st;
}
// Painel dos exércitos: busca (nome ou estado), filtro "sem ordem", cada linha com força, moral, experiência, general e ordem
function tpListHTML(){
  const mine = tpArmies(G, "player");
  if (!mine.length) return `<p class="muted">—</p>`;
  const idle = mine.filter(a => !a.order).length, f = UI.tpFilt === "idle" && idle ? "idle" : "all", T = tpK(G);
  const rows = mine.slice().sort((a, b) => (!!a.order - !!b.order) || (a.uf < b.uf ? -1 : a.uf > b.uf ? 1 : 0) || b.str - a.str).filter(a => f === "all" || !a.order);
  const q = a => esc((tpName(G, a) + " " + a.uf + " " + ufName(a.uf)).toLowerCase());
  return `<div class="tpapanel"><div class="tpatools">
      <input type="search" id="tpFind" class="tpfind" placeholder="${esc(tF("buscar"))}" aria-label="${esc(tF("buscar"))}" value="${esc(UI.tpFind || "")}" autocomplete="off">
      <div class="seg" role="group"><button class="${f === "all" ? "on" : ""}" data-tpfilt="all" aria-pressed="${f === "all"}"><span>${esc(tF("filtroTodos"))}</span> <b>${mine.length}/${T.max}</b></button><button class="${f === "idle" ? "on" : ""}" data-tpfilt="idle" aria-pressed="${f === "idle"}" ${idle ? "" : "disabled"}><span>${esc(tF("filtroLivres"))}</span> <b>${idle}</b></button></div></div>
    <div class="tplist">${rows.map(a => { const gen = tpGen(G, a);
      return `<button class="tprow${a.order ? " ord" : " idle"}" data-tpsel="${a.id}" data-q="${q(a)}">${tpMiniChip(a)}<span class="tpn"><b>${esc(tpName(G, a))}</b> ${tpXpHTML(a)}<small>📍 ${nm(ufName(a.uf))}${a.cut ? ` · ⛓ <span>${esc(fFala("cerco", "chip"))}</span>` : ""} · <span>${esc(tF("moral"))}</span> ${Math.round(a.morale)}${gen ? ` · ★ ${nm(frontGenName(G, gen))}` : ""}</small></span><span class="tpord">${tpOrderHTML(a)}</span></button>`; }).join("")}</div></div>`;
}
// Próximo exército seu sem ordem (depois do selecionado; volta ao começo)
function tpNextIdle(){
  const L = tpArmies(G, "player").filter(a => !a.order); if (!L.length) return null;
  const i = L.findIndex(a => a.id === UI.tpSel); return L[(i + 1) % L.length];
}
// Passos do movimento: 1 exército → 2 destino → 3 confirmar (o atual aceso)
function tpStepsHTML(){
  const s = !tpSelArmy() ? 1 : UI.tpPend ? 3 : 2;
  return `<ol class="tpsteps hud">${[1, 2, 3].map(i => `<li class="${i === s ? "now" : i < s ? "done" : ""}"><b>${i < s ? "✔" : i}</b> <span>${esc(tF("hudPasso" + i))}</span></li>`).join("")}</ol>`;
}
// Ordens já dadas neste mês (cada uma com ✕ para cancelar)
function tpPendingHTML(compact){
  const L = tpArmies(G, "player").filter(a => a.order);
  if (!L.length) return compact ? "" : `<p class="muted tpnone">${esc(tF("semOrdens"))}</p>`;
  return `<div class="tppend${compact ? " compact" : ""}" role="list" aria-label="${esc(tF("ordensDadas"))}">${L.map(a => { const o = a.order, c = o.type === "atacar" ? Math.round(tpChance(G, a, o.to).chance * 100) : null;
    return `<span class="tpp ${o.type === "atacar" ? "a" : "m"}" role="listitem"><button class="tpp-go" data-tpsel="${a.id}" title="${esc(tpName(G, a))}">${o.type === "atacar" ? "⚔" : "➜"} <b>${esc(tpName(G, a))}</b> ${nm(o.to)}${c != null ? ` <em class="tpc ${tpChanceCls(c)}">${c}%</em>` : ""}</button><button class="tpp-x" data-tpundo="${a.id}" aria-label="${esc(tF("cancelarOrdem"))}: ${esc(tpName(G, a))}" title="${esc(tF("cancelarOrdem"))}">✕</button></span>`; }).join("")}</div>`;
}
// HUD de movimento sobre o mapa: passos, "próximo sem ordem" e as ordens dadas (✕ cancela)
function tpHudHTML(){
  const ph = phaseOf(G); if (!ph.war || !G.war.fronts.length || (G.simple && !UI.manual) || G.ended) return "";
  if (UI.tpPend && window.innerWidth < 900) return ""; // a confirmação flutuante ocupa a parte de baixo
  const idle = tpArmies(G, "player").filter(a => !a.order).length;
  return `<div class="tphud" role="toolbar" aria-label="${esc(tF("titulo"))}">${tpStepsHTML()}
    <div class="tphrow"><button class="tpnext" data-tpnext ${idle ? "" : "disabled"} title="${esc(tF("proximo"))}">⏭ <span>${esc(idle ? tF("proximo") : tF("todosComOrdem"))}</span>${idle ? ` <b>${idle}</b>` : ""}</button>${tpPendingHTML(true)}</div></div>`;
}
// Ataques que o inimigo prepara (o plano dele é conhecido)
function tpThreatsHTML(){
  const list = tpArmies(G, "enemy").filter(e => e.order && e.order.type === "atacar"), seen = new Set(), rows = [];
  for (const e of list){ const to = e.order.to; if (seen.has(to)) continue; seen.add(to);
    const c = Math.round(tpChance(G, e, to).chance * 100);
    rows.push(`<li class="${c >= 50 ? "bad" : ""}"><button class="linkbtn" data-tpfocus="${to}">⚠ ${esc(gfmt(tF("ameaca"), tpName(G, e), ufName(to), c))}</button></li>`); }
  return `<div class="ordhead"><b>${esc(tF("ameacas"))}</b></div>${rows.length ? `<ul class="tpthreat">${rows.join("")}</ul>` : `<p class="muted">${esc(tF("semAmeaca"))}</p>`}`;
}
function frontRecruitHTML(){
  const ph = phaseOf(G), war = ph.war && G.war.fronts.length, K = fCfg().recruta;
  if (!war){ const st = recruitState(G);
    return `<div class="recruit"><div class="ordhead"><b>${esc(tF("recrutar"))}</b></div><button class="primary sm" id="btnRecruit" ${st.ok ? "" : "disabled"}>＋ <span>${esc(tF("recrutar"))}</span> <span>+${K.forca}</span> <span>(${K.custo} ${esc(SCEN.campaign.money.short)})</span></button>${st.ok ? "" : `<small class="muted">${esc(st.msg)}</small>`}</div>`; }
  const L = tpLineDist(G, "player"), regs = frontRecruitUFs(G).sort((a, b) => (L[a] ?? 50) - (L[b] ?? 50) || (a < b ? -1 : 1));
  const pick = UI.tpRec && regs.includes(UI.tpRec) ? UI.tpRec : frontRecruitPick(G), st = recruitState(G, pick);
  const opt = id => { const n = tpAllAt(G, "player", id).length; return `<option value="${id}" ${id === pick ? "selected" : ""}>${esc(ufName(id))}${n ? ` (${n})` : ""}</option>`; };
  const here = tpAllAt(G, "player", pick), T = tpK(G);
  const hows = here.map(a => ({ v: "r:" + a.id, l: gfmt(tF("recrutaReforco"), tpName(G, a)) })).concat([{ v: "novo", l: tF("recrutaNova") }]);
  const cur = UI.tpRecHow && hows.some(h => h.v === UI.tpRecHow) ? UI.tpRecHow : hows[0].v, how = cur === "novo" ? "novo" : "reforco", hid = cur.startsWith("r:") ? cur.slice(2) : null;
  const st2 = recruitState(G, pick, how, hid);
  return `<div class="recruit"><div class="ordhead"><b>${esc(tF("recrutar"))}</b><span>+${K.forca} · ${K.custo} ${esc(SCEN.campaign.money.short)}</span></div>
    <label class="fsel tprec"><span>${esc(tF("recrutarEm"))}</span> <select id="tpRecUF" aria-label="${esc(tF("recrutarEm"))}">${regs.map(opt).join("")}</select></label>
    <label class="fsel tprec"><span>${esc(tF("recrutaComo"))}</span> <select id="tpRecHow" aria-label="${esc(tF("recrutaComo"))}">${hows.map(h => `<option value="${h.v}" ${h.v === cur ? "selected" : ""}>${esc(h.l)}</option>`).join("")}</select></label>
    <button class="primary sm" id="btnRecruit" ${st.ok && st2.ok ? "" : "disabled"}>＋ <span>${esc(tF("recrutar"))}</span></button>${st.ok && st2.ok ? "" : `<small class="why"><span aria-hidden="true">🔒</span> <span>${esc((st.ok ? st2 : st).msg)}</span></small>`}<small class="muted">${esc(gfmt(tF("recrutaAjuda2"), T.porEstado || 3, T.max))}</small></div>`;
}
function frontAutoHTML(){
  const m = G.autoOrders || "off";
  return `<div class="fauto"><label><span>${esc(tF("auto"))}:</span> <select id="autoSel"><option value="off" ${m === "off" ? "selected" : ""}>${esc(tF("autoOff"))}</option><option value="defender" ${m === "defender" ? "selected" : ""}>${esc(tF("autoDef"))}</option><option value="auto" ${m === "auto" ? "selected" : ""}>${esc(tF("autoOn"))}</option></select></label></div>`;
}
function frontSituationHTML(){
  const sides = sideCounts(G);
  return `<h3>Situação</h3><div class="ufinfo"><div><span>Seus estados</span><b>${sides.player}</b></div><div><span>Inimigos</span><b>${sides.enemy}</b></div><div><span>Tropas no total</span><b>${Math.round(frontPool(G))}</b></div></div>`;
}
// Resumo do modo simples (Fácil): o comando automático decide; você só recruta
function simpleFrontsHTML(){
  const auto = (G.autoOrders || "off") !== "off";
  return `<h3>⚔ <span>${esc(tF("titulo"))}</span></h3><div class="simplebox">
    <p>${auto ? `🤖 <b>${esc(tF("autoMsgOn"))}</b>` : `⏸ <b>${esc(tF("autoMsgOff"))}</b>`}</p>
    ${tpTallyHTML()}${tpTotalsHTML()}${tpListHTML()}
    <div class="row2">${auto ? "" : `<button class="primary sm" data-auto-on>🤖 ${esc(tF("auto"))}</button>`}<button class="secondary sm" data-manual="1">⚔ ${esc(tF("passo1"))}</button></div></div>`;
}
// Botões das táticas da Batalha de Recife, cada um com a chance (data-tptat: antes de confirmar; data-tpset: troca a de uma ordem já dada)
function tpTacticsHTML(a, to, cur, attr){
  return `<div class="tptat" role="group" aria-label="${esc(fFala("recife", "escolha"))}">${Object.keys(tpTactics(G)).map(k => { const c = Math.round(tpChance(G, a, to, k).chance * 100);
    return `<button class="tptb${k === cur ? " on" : ""}" ${attr}="${k}" aria-pressed="${k === cur}"><b>${esc(fFala("taticas", k))}</b><em class="tpc ${tpChanceCls(c)}">${c}%</em><small>${esc(fFala("taticaDesc", k))}</small></button>`; }).join("")}</div>`;
}
// Bloco de confirmação: chance, poder × defesa, quem defende, flanco, cerco, quem vai junto (e a tática, se o alvo é Recife)
function tpConfirmHTML(a, to){
  const t = tpTargets(G, a).find(x => x.to === to); if (!t) return "";
  const btns = `<div class="row2"><button class="primary" data-tpok="${to}">✔ ${esc(tF("confirmar"))}</button><button class="secondary" data-tpcancel>✕ ${esc(tF("cancelar"))}</button></div>`;
  if (t.type !== "atacar") return `<div class="tpconf mv" role="status"><p>➜ ${esc(gfmt(tF("msgMover"), tpName(G, a), ufName(to)))}${t.stack ? ` <small class="muted">(<span>${esc(gfmt(tF("jaHa"), t.stack))}</span>)</small>` : ""}</p>${btns}</div>`;
  const tat = t.final ? (UI.tpTat && tpTactics(G)[UI.tpTat] ? UI.tpTat : tpBestTactic(G, a, to)) : undefined;
  const o = tpChance(G, a, to, tat), c = Math.round(o.chance * 100), F = fCfg().falas.fatores, foe = o.defs;
  const fl = o.flank > 1.005 ? Math.round((o.flank - 1) * 100) : 0, near = tpArmies(G, "player").filter(x => x !== a && !o.with.includes(x.id) && ADJ[x.uf].includes(to) && x.uf !== a.uf);
  return `<div class="tpconf at ${tpChanceCls(c)}${t.final ? " final" : ""}" role="status">${t.final ? `<h4 class="tprec">🏛 <span>${esc(fFala("recife", "titulo"))}</span></h4>` : ""}<div class="tpbig"><b>${c}%</b><span>${esc(tF("chance"))}</span></div>
    <p class="tpvs">⚔ ${`<b>${esc(tpName(G, a))}</b>`} → ${nm(ufName(to))}</p>
    <div class="pw"><b style="color:#9cc3ea"><span>${esc(tF("voce"))}</span> ${Math.round(o.A)}</b><div class="bar2"><i class="p" style="width:${o.A / Math.max(1, o.A + o.D) * 100}%"></i><i class="e" style="width:${o.D / Math.max(1, o.A + o.D) * 100}%"></i></div><b style="color:#f0a493">${Math.round(o.D)} <span>${esc(tF("inimigo"))}</span></b></div>
    ${t.final ? `<p class="tprec2">${esc(fFala("recife", "escolha"))}</p>${tpTacticsHTML(a, to, tat, "data-tptat")}<p class="muted">${esc(fFala("recife", "ultima"))}</p>` : ""}
    <ul class="tpdef"><li>${foe.length ? `<span>${esc(tF("defensores"))}:</span> ${foe.map(d => `${`<b>${esc(tpName(G, d))}</b>`} (${Math.round(d.str)})`).join(", ")}` : `<span>${esc(tF("soGuarnicao"))}</span>`}</li>
      <li><span>${esc(F.guarnicao)}</span>: ${Math.round(o.gar)}</li>${o.terr > 1.005 ? `<li><span>${esc(F.terreno)}</span>: +${Math.round((o.terr - 1) * 100)}%</li>` : ""}${o.red > 1 ? `<li><span>${esc(F.reduto)}</span>: +${Math.round((o.red - 1) * 100)}%</li>` : ""}
      ${fl ? `<li class="good">⚔ <span>${esc(gfmt(tF("flancoAjuda"), o.origins, fl))}</span></li>` : near.length ? `<li class="tip">💡 <span>${esc(tF("flancoDica"))}</span></li>` : ""}
      ${o.cutD ? `<li class="good">⛓ <span>${esc(tF("cercoAlvo"))}</span></li>` : ""}${o.cutA ? `<li class="bad">⛓ <span>${esc(gfmt(fFala("cerco", "aviso"), tpName(G, a), ufName(a.uf)))}</span></li>` : ""}
      ${o.with.length ? `<li>${esc(gfmt(tF("juntoCom"), o.with.map(id => tpName(G, tpById(G, id))).join(", ")))}</li>` : ""}</ul>${btns}</div>`;
}
// General: uma linha (retrato, nome, traço) e um seletor pequeno para trocar
function tpGenHTML(a){
  const K = fCfg(), gen = tpGen(G, a), P = gen && portraitOf("pessoas", gen.retrato);
  const opts = K.generais.map(x => { const on = G.war.gens[x.id], b = on && on !== a.id ? tpById(G, on) : null;
    return `<option value="${x.id}" ${gen && gen.id === x.id ? "selected" : ""}>${esc(frontGenName(G, x))} — ${esc(fFala("traco", x.traco))}${b ? ` (${esc(tpName(G, b))})` : ""}</option>`; }).join("");
  return `<div class="fgen tpgenrow">${P ? portraitImg(P, 30) : `<span class="tpgen0" aria-hidden="true">★</span>`}<div><b>${gen ? esc(frontGenName(G, gen)) : esc(tF("semGeneral"))}</b>${gen ? `<small><span>${esc(fFala("traco", gen.traco))}</span>: <span>${esc(fFala("tracoDesc", gen.traco))}</span></small>` : ""}</div>
    <select data-tpgen="${a.id}" aria-label="${esc(tF("trocarGeneral"))}" title="${esc(tF("trocarGeneral"))}"><option value="">${esc(tF("semGeneral"))}</option>${opts}</select></div>`;
}
// Fase 18: "Neste estado" à vista no cartão: marcar 2–3 exércitos do mesmo estado e unificar; dividir este em dois (força ≥ 50)
// UI.tpMark = { uf, ids }: os marcados (sem marcação, só o selecionado). Shift+clique / toque longo numa ficha também marca.
function tpMarkList(){
  const a = tpSelArmy(); if (!a || a.side !== "player") return [];
  const M = UI.tpMark; if (!M || M.uf !== a.uf) return [a.id];
  return M.ids.filter(id => { const x = tpById(G, id); return x && x.side === "player" && x.uf === a.uf; });
}
function tpToggleMark(id){
  const a = tpSelArmy(), x = tpById(G, id); if (!a || !x || x.side !== "player" || x.uf !== a.uf) return false;
  const L = tpMarkList(), i = L.indexOf(id); if (i >= 0) L.splice(i, 1); else L.push(id);
  UI.tpMark = { uf: a.uf, ids: L }; return true;
}
function tpKeepOf(L){ const M = L.map(id => tpById(G, id)).filter(Boolean); if (UI.tpKeep && L.includes(UI.tpKeep)) return UI.tpKeep; return (M.sort((x, y) => y.str - x.str)[0] || {}).id; }
function tpHereHTML(a){
  const here = tpAllAt(G, "player", a.uf).slice().sort((x, y) => tpSeqN(x) - tpSeqN(y)), T = tpK(G), cap = T.porEstado || 3, sp = tpSplitState(G, a);
  const L = tpMarkList(), keep = tpKeepOf(L), m = here.length > 1 ? tpMergeState(G, L, keep) : null;
  const rows = here.length > 1 ? `<div class="tphere">${here.map(x => `<div class="tphrow${x === a ? " cur" : ""}"><label><input type="checkbox" data-tpmark="${x.id}"${L.includes(x.id) ? " checked" : ""} aria-label="${esc(tpName(G, x))}">${tpMiniChip(x)}<span class="tphn"><b>${esc(tpName(G, x))}</b><small><span>${esc(tF("forca"))}</span> ${Math.round(x.str)} · <span>${esc(tF("moral"))}</span> ${Math.round(x.morale ?? 60)}${x.order ? ` · ${x.order.type === "atacar" ? "⚔" : "➜"} ${nm(ufName(x.order.to))}` : ""}</small></span></label>${x === a ? "" : `<button class="linkbtn" data-tpsel="${x.id}" title="${esc(tF("verExercito"))}" aria-label="${esc(tF("verExercito"))}">⇄</button>`}</div>`).join("")}</div>
    <div class="tpmerge"><button class="tpact merge" data-tpmerge ${m && m.ok ? "" : "disabled"}>🔗 <span>${esc(tF("unificar"))}</span> (${L.length})</button>${L.length > 1 ? `<label class="tpkeep"><span>${esc(tF("unirFica"))}</span> <select data-tpkeep aria-label="${esc(tF("unirFica"))}">${L.map(id => `<option value="${id}"${id === keep ? " selected" : ""}>${esc(tpName(G, tpById(G, id)))}</option>`).join("")}</select></label>` : ""}</div>
    <small class="${m && !m.ok && L.length > 1 ? "why" : "muted"}">${m && !m.ok ? `<span aria-hidden="true">🔒</span> <span>${esc(m.msg)}</span>` : `<span>${esc(tF("unirAjuda"))}</span>`}</small>
    <small class="muted tpmhint">${esc(tF("unirDica"))}</small>` : "";
  return `<div class="tpsec here"><div class="tpsech">👥 <span>${esc(tF("nesteEstado"))}</span> <small>(${here.length}/${cap})</small></div>${rows}
    <div class="tpsplitrow"><button class="tpact" data-tpsplit="${a.id}" ${sp.ok ? "" : "disabled"}>✂ <span>${esc(tF("dividir"))}</span></button><small class="${sp.ok ? "muted" : "why"}">${sp.ok ? `<span>${esc(gfmt(tF("dividirAjuda2"), Math.round(a.str) - Math.floor(a.str / 2), Math.floor(a.str / 2)))}</span>` : `<span aria-hidden="true">🔒</span> <span>${esc(sp.msg)}</span>`}</small></div></div>`;
}
// Recrutar direto num estado seu (fase 17): botão "novo exército" e "reforçar X" para cada exército seu ali, com custo e motivo do bloqueio
function tpRecHereHTML(uf){
  const ph = phaseOf(G); if (!ph.war || !G.war || !G.war.fronts.length || G.ended || tpSide(G, uf) !== "player") return "";
  const K = fCfg().recruta, S = fCfg().soldo, T = tpK(G), C = SCEN.campaign, here = tpAllAt(G, "player", uf);
  const sN = recruitState(G, uf, "novo"), left = Math.max(0, K.porMes - (+G.used._recruit || 0));
  const up = Math.round(K.forca / STR_UNIT * (C.upkeep ?? 0.4) * 10) / 10;
  const btn = (how, id, lbl, st) => `<button class="${how === "novo" ? "primary" : "secondary"} sm" data-tprec="${how}" data-uf="${uf}"${id ? ` data-id="${id}"` : ""} ${st.ok ? "" : `disabled title="${esc(st.msg)}"`}>${lbl}</button>`;
  const firstBad = [sN].concat(here.map(a => recruitState(G, uf, "reforco", a.id))).find(x => !x.ok);
  const allBad = !sN.ok && here.every(a => !recruitState(G, uf, "reforco", a.id).ok);
  return `<div class="recruit tprechere"><div class="ordhead"><b>＋ <span>${esc(tF("recAqui"))}</span></b><span>+${K.forca} · ${K.custo} ${esc(C.money.short)}</span></div>
    <div class="tprecbtns">${btn("novo", null, `＋ <span>${esc(tF("recNovo"))}</span>`, sN)}${here.map(a => btn("reforco", a.id, `⊕ <span>${esc(tF("reforcar"))}</span>: <span>${esc(tpName(G, a))}</span> <small>(${Math.round(a.str)})</small>`, recruitState(G, uf, "reforco", a.id))).join("")}</div>
    ${allBad && firstBad ? `<small class="why"><span aria-hidden="true">🔒</span> <span>${esc(firstBad.msg)}</span></small>` : !sN.ok && here.length ? `<small class="muted"><span>${esc(tF("recNovo"))}</span>: <span>${esc(sN.msg)}</span></small>` : ""}
    <small class="muted">${esc(gfmt(tF("recInfo"), here.length, T.porEstado || 3, left, K.porMes))}</small>
    <small class="muted">${esc(gfmt(tF("recSoldo"), K.forca, String(up).replace(".", ","), S ? S.limite : 0, S ? S.meses : 0))}</small></div>`;
}
// Ofensiva especial: só faz sentido com ordem de ataque; explica ganho, risco, custo e espera
function tpOffHTML(a){
  const off = offensiveState(G, a.id), K = fCfg().ofensiva;
  const expl = gfmt(tF("ofensivaExpl"), Math.round((K.mult - 1) * 100), Math.abs(K.falhaMoral), K.custo, K.intervalo);
  if (a.special) return `<div class="foff on"><p class="fwarn">💥 <span>${esc(tF("ofensivaMarcada"))}</span> <button class="linkbtn" data-foff-cancel="${a.id}">${esc(tF("cancelar"))}</button></p><small class="muted">${esc(expl)}</small></div>`;
  // disponível: botão + explicação; bloqueado: botão apagado + o motivo (a explicação fica na dica do botão)
  return `<div class="foff${off.ok ? "" : " off"}"><button class="secondary small" data-foff="${a.id}" ${off.ok ? "" : "disabled"} title="${esc(expl)}">💥 <span>${esc(tF("ofensivaBtn"))}</span> <span>(${K.custo} ${esc(SCEN.campaign.money.short)})</span></button>
    <small class="${off.ok ? "muted" : "why"}">${off.ok ? esc(expl) : `<span aria-hidden="true">🔒</span> <span>${esc(off.msg)}</span>`}</small></div>`;
}
// Cartão do exército selecionado (fase 17: compacto — ordem atual + Defender, ataques com chance em destaque, movimentos recolhidos)
function tpCardHTML(a, wide){
  const ts = tpTargets(G, a);
  const atk = ts.filter(t => t.type === "atacar").map(t => Object.assign({ c: Math.round(tpChance(G, a, t.to).chance * 100) }, t)).sort((x, y) => y.c - x.c);
  const mv = ts.filter(t => t.type !== "atacar"), o = a.order;
  const tb = t => `<button class="tptg ${t.type}${UI.tpPend === t.to || (o && o.to === t.to) ? " on" : ""}" data-tpto="${t.to}">${t.type === "atacar" ? (t.final ? "🏛" : "⚔") : "➜"} <b class="tpn2">${nm(ufName(t.to))}</b>${t.c != null ? `<em class="tpc ${tpChanceCls(t.c)}">${t.c}%</em>` : ""}${t.empty || t.stack ? `<span>${t.empty ? esc(tF("ocupar")) : ""}${t.stack ? esc(gfmt(tF("jaHa"), t.stack)) : ""}</span>` : ""}</button>`;
  const mvOpen = UI.tpMvOpen && UI.tpMvOpen.id === a.id ? UI.tpMvOpen.open : (!atk.length || (o && o.type !== "atacar") || (UI.tpPend && mv.some(t => t.to === UI.tpPend)));
  return `<div class="tpcard" data-tpcard="${a.id}">
    ${tpStepsHTML()}
    <div class="tphead">${tpMiniChip(a)}<div><h4><b>${esc(tpName(G, a))}</b> <button class="linkbtn tpren" data-tpren="${a.id}" title="${esc(tF("renomear"))}" aria-label="${esc(tF("renomear"))}">✎</button></h4><small>📍 ${nm(ufName(a.uf))}${a.cut ? ` · ⛓ <span>${esc(fFala("cerco", "chip"))}</span>` : ""} · <span>${esc(tF("forca"))}</span> <b>${Math.round(a.str)}</b> · <span>${esc(tF("moral"))}</span> <b>${Math.round(a.morale)}</b> · ${tpXpHTML(a, true)}</small></div><button class="xbtn" data-tpdesel aria-label="${esc(tF("cancelar"))}">✕</button></div>
    ${UI.tpRen === a.id ? `<form class="tprenf" data-tprenf="${a.id}"><input id="tpRenIn" maxlength="28" value="${esc(a.nome || "")}" placeholder="${esc(tpName(G, Object.assign({}, a, { nome: null })))}" aria-label="${esc(tF("renomear"))}"><button class="primary sm" type="submit">${esc(tF("salvar"))}</button><button class="secondary sm" type="button" data-tprenx>✕</button></form>` : ""}
    <div class="tpnow">${o ? `<span class="tpnowo">${tpOrderHTML(a)}</span>` : ""}<button class="tpdef${o ? "" : " on"}" ${o ? `data-tpundo="${a.id}"` : "disabled"} aria-pressed="${!o}" title="${esc(tF("defenderAjuda"))}">🛡 <span>${esc(o ? tF("defender") : tF("defendendo"))}</span></button>${o ? "" : `<small class="muted">${esc(tF("defenderAjuda"))}</small>`}</div>
    ${o && o.tatica && !(wide && UI.tpPend) ? `<p class="tprec2">🏛 ${esc(fFala("recife", "escolha"))}</p>${tpTacticsHTML(a, o.to, o.tatica, "data-tpset")}` : ""}
    ${wide && UI.tpPend ? tpConfirmHTML(a, UI.tpPend) : ""}
    <div class="tpsec atk"><div class="tpsech">⚔ <span>${esc(tF("atacarTit"))}</span></div>${atk.length ? `<div class="tptgs atk">${atk.map(tb).join("")}</div>` : `<small class="muted">${esc(tF("semAlvo"))}</small>`}
      ${atk.length ? tpOffHTML(a) : ""}</div>
    ${mv.length ? `<details class="tpsec mv" data-tpdet="tpMvOpen" data-id="${a.id}"${mvOpen ? " open" : ""}><summary>➜ <span>${esc(gfmt(tF("moverTit"), mv.length))}</span></summary><div class="tptgs mvs">${mv.map(tb).join("")}</div></details>` : ""}
    ${tpHereHTML(a)}
    ${tpGenHTML(a)}
    ${tpRecHereHTML(a.uf)}
  </div>`;
}
function frontsPanel(){
  const ph = phaseOf(G), W = G.war;
  if (ph.noArmies) return frontSituationHTML() + `<p class="muted">Nesta fase você não comanda tropas: o mapa mostra a disputa política. Use propaganda, investimentos e negociação.</p>`;
  if (!ph.war || !W.fronts.length) return `<h3>${esc(tF("titulo"))}</h3><div class="simplebox"><p>${esc(gfmt(tF("reserva"), Math.round(frontPool(G))))}</p><p class="muted">Se a guerra começar, seus exércitos entram no mapa: toque num exército, escolha um estado destacado, veja a chance e confirme.</p></div>${frontRecruitHTML()}${frontSituationHTML()}`;
  const a = tpSelArmy(), wide = window.innerWidth >= 900;
  if (a && !(G.simple && !UI.manual)) return tpCardHTML(a, wide) + tpThreatsHTML();
  const last = (G.mil && G.mil.battles) || [];
  let html = G.simple && !UI.manual ? simpleFrontsHTML() + frontRecruitHTML()
    : `${G.simple ? `<button class="linkbtn" data-manual="0">← Voltar ao resumo simples</button>` : ""}<h3>⚔ <span>${esc(tF("titulo"))}</span></h3>
      ${tpStepsHTML()}
      ${frontWeary(G) > 0 ? `<p class="fwarn">😩 <span>Cansaço da guerra:</span> ${G.war.months} <span>meses de combate — Apoio Popular cai aos poucos e as batalhas ficam mais sangrentas.</span></p>` : ""}
      ${G.ceasefire > 0 ? `<p class="fwarn">🕊 <span>Trégua em vigor: sem combates por</span> ${G.ceasefire} <span>mês(es).</span></p>` : ""}
      ${tpTallyHTML()}${tpTotalsHTML()}
      <div class="ordhead"><b>${esc(tF("ordensDadas"))}</b>${tpNextIdle() ? `<button class="secondary sm" data-tpnext>⏭ <span>${esc(tF("proximo"))}</span></button>` : `<span class="good">✔ <span>${esc(tF("todosComOrdem"))}</span></span>`}</div>${tpPendingHTML(false)}
      <div class="ordhead"><b>${esc(tF("painel"))}</b></div>${tpListHTML()}${tpThreatsHTML()}${frontRecruitHTML()}${frontAutoHTML()}`;
  html += `<div class="ordhead"><b>${esc(tF("batalhas"))}</b>${last.length ? `<span>${esc(tF("verRelatorio"))}</span>` : ""}</div>${last.length ? frontRowsHTML(last) : `<p class="muted">${esc(tF("semBatalhas"))}</p>`}`;
  return html + frontSituationHTML();
}
// Painel de um estado no modo guerra: dono, agitação, exércitos no estado e ações políticas
function frontUfPanel(uf){
  const C = SCEN.campaign, ph = phaseOf(G), u = G.uf[uf], fac = STORY.factions[G.control[uf]], side = sideOf(G, G.control[uf]);
  const sideLbl = { player: "Seu lado", enemy: "Inimigo", neutral: "Outros" }[side] || "", acts = mapActions(G, uf), T = TERRAIN_TYPES[TERRAIN[uf]];
  const ar = ph.war ? tpArmies(G).filter(x => x.uf === uf) : [];
  return `<h3>${uf} · ${esc(MAP_DATA.states[uf].name)}</h3>
    <div class="ufinfo"><div><span>Controle</span><b><i class="sw" style="background:${fac ? fac.color : "#555"}"></i>${esc(fac ? fac.label : G.control[uf])}</b><em class="side ${side}">${sideLbl}</em></div>
    <div><span>Agitação</span><div class="bar"><i style="width:${u.unrest}%;background:${unrestColor(u.unrest)}"></i></div><b>${Math.round(u.unrest)}</b></div>
    <div><span>Terreno</span><b>${esc(T ? T.label : "—")}${T && T.def ? ` · defesa +${Math.round(T.def * 100)}%` : ""}</b></div>
    <div><span>Peso econômico</span><b>${UF_WEIGHT[uf]}</b></div><div><span>Vizinhos</span><b>${ADJ[uf].join(", ")}</b></div>
    ${STORY.stateNotes && STORY.stateNotes[uf] ? `<small class="muted">${esc(STORY.stateNotesLabel || "")}: ${esc(STORY.stateNotes[uf])}</small>` : ""}</div>
    ${ar.length ? `<div class="ufregs"><ul>${ar.map(x => `<li><button class="linkbtn" data-tpsel="${x.side === "player" ? x.id : ""}" ${x.side === "player" ? "" : "disabled"}>${x.side === "player" ? "■" : "◆"} ${esc(tpName(G, x))} (${Math.round(x.str)})</button></li>`).join("")}</ul></div>` : ""}
    ${tpRecHereHTML(uf)}
    ${southOn(G) && G.south.state !== "aliado" && G.south.state !== "esmagada" && southCfg(G).ufs.includes(uf) ? `<p class="why">🌾 Estado da Liga do Sul: <b>investir</b> aqui baixa a Tensão no Sul em 4, e <b>negociar</b> com sucesso, em 6. <button class="linkbtn" data-south>Tensão: ${G.south.t}/100</button></p>` : ""}
    <div class="mapacts">${acts.length ? acts.map(a => `<button class="act" data-k="${a.kind}" ${a.ok ? "" : "disabled"}><span>${esc(a.label)}</span><em>${a.ap ? a.ap + " AP" : "grátis"}${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.ok ? a.desc + (a.kind === "negociar" ? ` Chance: ${negotiateChance(G, uf)}%.` : "") : a.why)}</small></button>`).join("") : `<p class="muted">Nenhuma ação política disponível aqui nesta fase.</p>`}</div>
    <button class="secondary" data-desel>← <span>${esc(tF("titulo"))}</span></button>`;
}
function frontHintHTML(){
  const ph = phaseOf(G); if (ph.noArmies || !ph.war || !G.war.fronts.length) return "";
  if (G.simple && !UI.manual) return `<div class="maphint">🤖 <span>${esc(tF("autoMsgOn"))}</span></div>`;
  const a = tpSelArmy();
  return `<div class="maphint tphint">${a ? `<b>${`<b>${esc(tpName(G, a))}</b>`}</b> · <span>${esc(UI.tpPend ? tF("passo3") : tF("passo2"))}</span>` : `<span>${esc(tF("comoJogar"))}</span>`}</div>`;
}
function frontChipHTML(){
  const ph = phaseOf(G); if (ph.noArmies) return "";
  const n = tpArmies(G, "player").length;
  return `<button class="ordchip" id="btnOrders" title="${esc(tF("titulo"))}">⚔ ${n} · ${Math.round(frontPool(G))}</button>`;
}
// Sobreposto ao mapa: "🎯 Recife a N estados" e o ímpeto
function tpMapGoalHTML(){
  if (!phaseOf(G).war || !G.war.fronts.length) return "";
  const f = G.war.fronts.find(x => (fCfg().frentes[x.id] || {}).vitoria) || G.war.fronts[0], t = tpGoalText(G, f), m = tpMomentum(G);
  return `<div class="tpmaptally" role="status">${t ? `<b>🎯 <span>${esc(t)}</span></b>` : ""}${m ? `<small class="${m > 0 ? "good" : "bad"}">⚡ <span>${esc(fFala("impeto", m > 0 ? "m" + m : "n" + (-m)))}</span></small>` : ""}</div>`;
}
/* ---------- Relatório de batalha ---------- */
function tpRecName(x){ return tpName(G, x); }
// Rótulo curto do resultado, do seu ponto de vista
function tpResultKey(r){ return r.side === "player" ? (r.win ? "anVitoria" : "anDerrota") : (r.win ? "relCaiu" : "relSegurou"); }
function tpMineWon(r){ return r.side === "player" ? r.win : !r.win; }
function frontRowsHTML(list){
  return `<div class="batlist">${list.map((r, i) => { const R = frontReport(G, r), good = tpMineWon(r);
    return `<button class="batrow ${good ? "good" : "bad"}" data-frow="${i}" data-fmonth="${r.month}"><b>${r.side === "player" ? "⚔" : "🛡"} ${nm(ufName(r.uf))} · <span>${esc(tF(tpResultKey(r)))}</span></b><span><small>${esc(gfmt(tF("relChance"), R.chance))}</small> <small>${esc(R.summary)}</small></span></button>`; }).join("")}</div>`;
}
function frontReportHTML(rec){
  let R; try{ R = frontReport(G, rec); }catch(e){ return ""; }
  const maxW = Math.max(0.05, ...R.rows.map(r => r.w || 0));
  const favH = r => r.fav ? `<span class="fav ${r.fav}"><i style="width:${Math.round(8 + 52 * Math.min(1, (r.w || 0) / maxW))}px"></i><span>${esc(r.fav === "player" ? tF("voce") : tF("inimigo"))}</span></span>` : `<span class="fav none">—</span>`;
  const tot = Math.max(1, R.power.p + R.power.e);
  return `<p class="sum ${R.won ? "good" : "bad"}">${esc(R.summary)}</p>
    <div class="pw"><b style="color:#9cc3ea"><span>${esc(tF("voce"))}</span> ${R.power.p}</b><div class="bar2"><i class="p" style="width:${R.power.p / tot * 100}%"></i><i class="e" style="width:${R.power.e / tot * 100}%"></i></div><b style="color:#f0a493">${R.power.e} <span>${esc(tF("inimigo"))}</span></b></div>
    <table><tr><th></th><th style="text-align:center">${esc(tF("voce"))}</th><th style="text-align:center">${esc(tF("inimigo"))}</th><th></th></tr>
    ${R.rows.map(r => `<tr><td>${esc(r.label)}</td><td class="v p">${esc(r.p)}</td><td class="v e">${esc(r.e)}</td><td>${favH(r)}</td></tr>`).join("")}</table>
    <ul class="tips">${R.tips.map(t => `<li>💡 <span>${esc(t)}</span></li>`).join("")}</ul>`;
}
function openFrontReport(rec, opts){
  opts = opts || {}; closeOverlay("frep");
  const R = frontReport(G, rec), mine = rec.side === "player" ? rec.atk : rec.def, foes = rec.side === "player" ? rec.def : rec.atk;
  const loss = L => L.reduce((s, x) => s + Math.max(0, (x.str0 || 0) - (x.str || 0)), 0);
  const K = fCfg(), side = (L, cls, gar) => `<div class="frside ${cls}"><div><small>${esc(cls === "p" ? tF("voce") : tF("inimigo"))}</small>
    ${L.length ? L.map(x => { const gen = x.gen && K.generais.find(y => y.id === x.gen), GP = gen && portraitOf("pessoas", gen.retrato); return `<b>${GP ? portraitImg(GP, 28) : ""}${`<b>${esc(tpRecName(x))}</b>`} <span class="muted">${x.str0} → ${x.str}</span></b>`; }).join("") : ""}
    ${gar ? `<b><span>${esc(K.falas.fatores.guarnicao)}</span> ${rec.gar}</b>` : ""}${!L.length && !gar ? "—" : ""}</div></div>`;
  const gP = rec.side !== "player", lines = [];
  for (const x of rec.retreat || []) lines.push(gfmt(tF("relRecuo"), tpRecName(x), ufName(x.to)));
  for (const x of rec.lost || []) lines.push(x.cerco ? gfmt(fFala("cerco", x.side === "player" ? "rendeuSeu" : "rendeuInimigo"), tpRecName(x), ufName(rec.uf)) : gfmt(tF("relDestruido"), tpRecName(x)));
  const res = rec.side === "player" ? (rec.win ? "relV" : "relD") : (rec.win ? "relCaiu" : "relSegurou");
  const o = document.createElement("div"); o.id = "frep"; o.className = "overlay";
  o.innerHTML = `<div class="bmodal frmodal" role="dialog" aria-label="${esc(gfmt(tF("relTitulo"), ufName(rec.uf)))}">
    <div class="btop"><div><div class="chap"><span>${esc(tF(rec.side === "player" ? "relAtaque" : "relDefesa"))}</span> · <span>${esc(monthLabel(rec.month))}</span></div><h2>${rec.final ? "🏛" : "⚔"} <span>${esc(gfmt(tF("relTitulo"), ufName(rec.uf)))}</span></h2>
      <small class="muted">${esc(frontName(G, rec.front))}</small></div><button class="xbtn" data-close aria-label="Fechar">✕</button></div>
    <p class="frres ${R.won ? "good" : "bad"}"><b>${esc(tF(res))}</b> · <span>${esc(gfmt(tF("relChance"), R.chance))}</span>${rec.special ? ` · 💥 <span>${esc(tF("ofensivaBtn"))}</span>` : ""}${rec.tat ? ` · 🏛 <span>${esc(fFala("taticas", rec.tat))}</span>` : ""}${rec.origins >= 2 ? ` · ⚔ <span>${esc(tF("flancoChip"))}</span>` : ""}</p>
    ${rec.drama ? `<p class="frdrama">${esc(fFala("drama", rec.drama))}</p>` : ""}
    <div class="frvs">${side(mine, "p", gP)}<div class="vs">VS</div>${side(foes, "e", !gP)}</div>
    <p class="frmove"><span>${esc(gfmt(tF("relBaixas"), loss(mine), loss(foes)))}</span>${lines.map(t => ` · <span>${esc(t)}</span>`).join("")}</p>
    <div class="brep show">${frontReportHTML(rec)}</div>
    <div class="bbtns">${opts.onBack ? `<button class="secondary" data-back>← Voltar</button>` : ""}<button class="primary" data-close>Fechar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  o.addEventListener("click", e => { if (e.target === o || e.target.closest("[data-close]")){ closeOverlay("frep"); if (opts.onClose) opts.onClose(); }
    else if (e.target.closest("[data-back]")){ closeOverlay("frep"); opts.onBack(); } });
}
/* ---------- Fim do mês: animação dos movimentos e das batalhas (pulável) ---------- */
// ev = g.mil (js/core/frentes.js → frontWarMonth): control0, start (exércitos no início), orders, moves, merges, battles, sieges, flips, mom0/mom
function playFrontResolution(ev, done){
  const won = (ev && ev.battles || []).some(r => r.final && r.win);
  const finish = () => { closeOverlay("resol"); if (won) showRecifeVictory(done); else if (done) done(); };
  if (!ev || !((ev.battles || []).length || (ev.moves || []).length || (ev.sieges || []).length)) return finish();
  const sp = reduceMotion() ? 0.35 : 1;
  closeOverlay("resol");
  const o = document.createElement("div"); o.id = "resol"; o.className = "overlay";
  o.innerHTML = `<div class="rmodal"><div class="btop"><div><div class="chap">${esc(tF("anTitulo"))}</div><h2>${esc(monthLabel(ev.month))}</h2></div><button class="secondary" data-skip>${esc(tF("pular"))} ▸▸</button></div>
    <div class="mapbox" id="resolMap"></div><div class="rcap">${esc(tF("anMovimentos"))}</div><div class="rlist"></div><div class="bbtns"><button class="primary" data-done style="display:none">Continuar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  const box = o.querySelector("#resolMap"), cap = o.querySelector(".rcap"), list = o.querySelector(".rlist");
  // estado da animação: dono dos estados e exércitos como estavam no começo do mês
  const ctl = Object.assign({}, ev.control0 || G.control), byId = {};
  let armies = (ev.start || []).map(x => { const c = Object.assign({ morale: 60 }, x); byId[x.id] = c; return c; });
  let arrows = (ev.orders || []).filter(x => x.side === "player" || x.type === "atacar").map(x => ({ pts: x.path && x.path.length > 1 ? x.path : [x.from, x.to], cls: x.side === "enemy" ? "en" : x.type === "atacar" ? "pl" : "mv" }));
  let hot = [];
  const draw = () => { box.innerHTML = mapSVG(ctl, [], { g: G, military: true, fronts: true, armies: [], arrows: [], static: true, tpArmies: armies, tpArrows: arrows, tpHot: hot }); };
  draw();
  const timers = [], later = (fn, ms) => timers.push(setTimeout(fn, ms * sp));
  const btn = r => { const b = document.createElement("div"); b.innerHTML = frontRowsHTML([r]); const x = b.firstElementChild.firstElementChild; x.className += " rbat"; x.onclick = () => openFrontReport(r); return x; };
  const say = (html, cls) => { cap.innerHTML = html; cap.className = "rcap" + (cls ? " " + cls : ""); };
  let t = 700;
  // 1) movimentos
  if ((ev.moves || []).length) later(() => { for (const m of ev.moves){ const a = byId[m.id]; if (a) a.uf = m.to; }
    for (const m of ev.merges || []){ const a = byId[m.id], b = byId[m.into]; if (a && b){ b.str += a.str; armies = armies.filter(x => x !== a); } }
    arrows = arrows.filter(x => x.cls !== "mv"); draw(); AUDIO.sfx("order"); }, t), t += 900;
  // 2) batalhas, uma por vez (a de Recife, por último, em três fases)
  (ev.battles || []).forEach(r => {
    later(() => { hot = [r.uf]; const att = r.atk.map(x => byId[x.id]).filter(Boolean);
      arrows = att.map(a => ({ pts: [a.uf, r.uf], cls: r.side === "player" ? "pl" : "en" })); draw(); AUDIO.sfx("boom");
      say(`${r.final ? "🏛" : r.side === "player" ? "⚔" : "🛡"} ${nm(ufName(r.uf))}${r.origins >= 2 ? ` · <b>⚔ ${esc(tF("flancoChip"))}</b>` : ""} · <span>${esc(gfmt(tF("relChance"), frontReport(G, r).chance))}</span>`, r.final ? "final" : ""); }, t);
    if (r.final){ ["fase1", "fase2", "fase3"].forEach((k, i) => later(() => { say(`🏛 <b>${esc(fFala("recife", "titulo"))}</b> · <span>${esc(fFala("recife", k))}</span>`, "final shake"); AUDIO.sfx("boom"); }, t + 900 + i * 1000)); t += 3000; }
    later(() => {
      for (const x of r.atk.concat(r.def)){ const a = byId[x.id]; if (a) a.str = x.str; }
      if (r.win && r.took){ ctl[r.uf] = r.took.to; for (const x of r.retreat || []){ const a = byId[x.id]; if (a) a.uf = x.to; } if (r.into && byId[r.into]) byId[r.into].uf = r.uf; }
      const dead = new Set((r.lost || []).map(x => x.id)); armies = armies.filter(a => !dead.has(a.id) && a.str > 0);
      arrows = []; draw(); const p = box.querySelector(`path.uf[data-uf="${r.uf}"]`); if (p && r.win) p.classList.add("flipfx");
      const good = tpMineWon(r); say(`<b>${esc(r.drama ? fFala("drama", r.drama) : tF(good ? "anVitoria" : "anDerrota"))}</b> · ${nm(ufName(r.uf))} <span>${esc(tF(r.win ? "anTomou" : "anSegurou"))}</span>`, (good ? "good" : "bad") + (r.final ? " final big" : ""));
      if (r.final && r.win) AUDIO.sfx("win");
      list.appendChild(btn(r)); }, t + 650);
    t += r.final ? 2600 : 1500;
  });
  // 3) rendições de quem estava cercado
  const gave = (ev.sieges || []).filter(s => s.surrender);
  if (gave.length) later(() => { const dead = new Set(gave.map(s => s.id)); armies = armies.filter(a => !dead.has(a.id)); draw();
    say(gave.map(s => `⛓ <span>${esc(gfmt(fFala("cerco", s.side === "player" ? "rendeuSeu" : "rendeuInimigo"), tpName(G, s), ufName(s.uf)))}</span>`).join("<br>"), gave.some(s => s.side === "player") ? "bad" : "good"); }, t), t += 1400;
  const end = () => { hot = []; box.innerHTML = mapSVG(G.control, [], { g: G, military: true, fronts: true, armies: [], arrows: [], static: true, tpArrows: [] });
    const mine = (ev.flips || []).filter(m => m.side === "player").map(m => ufName(m.uf)), lost = (ev.flips || []).filter(m => m.side !== "player").map(m => ufName(m.uf));
    say([mine.length ? `<b class="good">${esc(gfmt(fFala("mapa", "listaGanhou"), mine.join(", ")))}</b>` : "", lost.length ? `<b class="bad">${esc(gfmt(fFala("mapa", "listaPerdeu"), lost.join(", ")))}</b>` : "",
      ev.mom !== ev.mom0 && ev.mom ? `<small>⚡ ${esc(fFala("impeto", ev.mom > 0 ? "m" + ev.mom : "n" + (-ev.mom)))}</small>` : ""].filter(Boolean).join(" ")); 
    o.querySelector("[data-done]").style.display = ""; o.querySelector("[data-skip]").style.display = "none"; };
  later(end, t);
  o.querySelector("[data-skip]").onclick = () => { timers.forEach(clearTimeout); list.innerHTML = ""; (ev.battles || []).forEach(r => list.appendChild(btn(r))); end(); };
  o.querySelector("[data-done]").onclick = finish;
}
// Vitória da Batalha de Recife: agora é a cena animada do final "Recife caiu" (js/ui/finais-animados.js)
function showRecifeVictory(done){ if (G.ended) playEndingScene(G, done); else if (done) done(); }
/* ---------- Seleção e ordens (mapa e painel) ---------- */
// toque numa ficha: seleciona (ou tira a seleção); ficha inimiga = toque no estado dela
function tpPickArmy(id, multi){
  const a = tpById(G, id); if (!a) return;
  if (a.side !== "player") return tpPickUF(a.uf);
  // Shift+clique / toque longo: marca ou desmarca para unificar (mesmo estado do selecionado)
  if (multi){ const s0 = tpSelArmy(); if (s0 && s0.side === "player"){
    if (s0.uf !== a.uf){ toast(frontFala(G, "tropas", "unirLonge")); return; } // outro estado: não marca, explica
    if (tpToggleMark(id)){ AUDIO.sfx("click"); renderGame(); } return; } }
  if (G.simple && !UI.manual) UI.manual = true;
  UI.tpPend = null; UI.tpTat = null; UI.selUF = null; UI.tpRen = null;
  // fase 18: as fichas ficam lado a lado, então cada toque escolhe aquele exército (tocar de novo desmarca)
  UI.tpSel = UI.tpSel === id ? null : id;
  if (UI.tpSel) tpZoomToArmy(a);
  renderGame(); tpToPanel();
}
// com o mapa inteiro, aproxima um pouco no exército escolhido para os destinos não ficarem amontoados
function tpZoomToArmy(a){
  if (typeof mapZoomState !== "function" || mapZoomState().k >= 1.5) return;
  // a ficha (que nos estados pequenos do Nordeste fica no mar) e os destinos entram no enquadramento
  const pts = [tpChipPos(a.uf)].concat(tpTargets(G, a).map(t => MAP_DATA.states[t.to]).filter(Boolean).map(r => [r.lx, r.ly]));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  mapZoomTo((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 1.6);
}
// toque num estado destacado: com exército selecionado, escolhe o destino (2º toque confirma); sem seleção, abre o estado
function tpPickUF(uf){
  const a = tpSelArmy();
  if (a){
    if (uf === a.uf){ UI.tpSel = null; UI.tpPend = null; UI.selUF = uf; renderGame(); tpToPanel(); return; }
    if (tpTargets(G, a).some(t => t.to === uf)){ if (UI.tpPend === uf) return tpConfirm(a, uf); UI.tpPend = uf; UI.tpTat = null; AUDIO.sfx("click"); renderGame(); return; }
    const mine = tpAllAt(G, "player", uf).find(x => !x.order) || tpAt(G, "player", uf); if (mine){ UI.tpSel = mine.id; UI.tpPend = null; renderGame(); return; }
    UI.tpSel = null; UI.tpPend = null;
  } else { const mine = tpAllAt(G, "player", uf).find(x => !x.order) || tpAt(G, "player", uf); if (mine && !(G.simple && !UI.manual)){ UI.tpSel = mine.id; UI.tpPend = null; UI.selUF = null; renderGame(); tpToPanel(); return; } }
  UI.selUF = uf; renderGame(); tpToPanel();
}
function tpConfirm(a, to){
  const r = tpOrder(G, a.id, to, tpIsFinal(G, to) ? UI.tpTat || undefined : undefined); if (r.ok) AUDIO.sfx("order");
  UI.tpPend = null; UI.tpTat = null; if (r.ok) UI.tpSel = null; afterAct(r);
}
function tpToPanel(){ if (window.innerWidth < 900) setTimeout(() => { const p = $(".sidepanel"); if (p && UI.tpSel && !UI.tpPend) p.scrollIntoView({ behavior: "smooth", block: "start" }); }, 30); }
// cartão flutuante de confirmação no mapa (telas estreitas)
function tpFloatHTML(){ const a = tpSelArmy(); if (!a || !UI.tpPend || window.innerWidth >= 900) return ""; return `<div class="tpfloat">${tpConfirmHTML(a, UI.tpPend)}</div>`; }
/* ---------- Eventos do painel ---------- */
function bindFronts(el){
  el.querySelectorAll("[data-tpsel]").forEach(b => b.onclick = () => { const id = b.dataset.tpsel; if (!id) return; if (G.simple && !UI.manual) UI.manual = true; UI.tpSel = id; UI.tpPend = null; UI.selUF = null; const a0 = tpById(G, id); if (a0) tpZoomToArmy(a0); renderGame();
    const a = tpById(G, id); if (a && window.innerWidth < 900) window.scrollTo({ top: Math.max(0, ($("#mapMain").getBoundingClientRect().top + window.scrollY) - 70), behavior: "smooth" }); });
  el.querySelectorAll("[data-tpdesel]").forEach(b => b.onclick = () => { UI.tpSel = null; UI.tpPend = null; renderGame(); });
  el.querySelectorAll("[data-tpto]").forEach(b => b.onclick = () => { const a = tpSelArmy(); if (!a) return; const to = b.dataset.tpto; if (UI.tpPend === to) return tpConfirm(a, to); UI.tpPend = to; renderGame(); });
  el.querySelectorAll("[data-tpok]").forEach(b => b.onclick = e => { e.stopPropagation(); const a = tpSelArmy(); if (a) tpConfirm(a, b.dataset.tpok); });
  el.querySelectorAll("[data-tpcancel]").forEach(b => b.onclick = e => { e.stopPropagation(); UI.tpPend = null; renderGame(); });
  el.querySelectorAll("[data-tpundo]").forEach(b => b.onclick = () => { UI.tpPend = null; afterAct(tpOrder(G, b.dataset.tpundo, null)); });
  el.querySelectorAll("[data-tpgen]").forEach(s => s.onchange = () => afterAct(tpSetGeneral(G, s.dataset.tpgen, s.value || null)));
  el.querySelectorAll("[data-tptat]").forEach(b => b.onclick = e => { e.stopPropagation(); UI.tpTat = b.dataset.tptat; AUDIO.sfx("click"); renderGame(); });
  el.querySelectorAll("[data-tpset]").forEach(b => b.onclick = () => { const a = tpSelArmy(); if (a && a.order) afterAct(tpSetTactic(G, a.order.to, b.dataset.tpset)); });
  el.querySelectorAll("[data-tpfocus]").forEach(b => b.onclick = () => { const R = MAP_DATA.states[b.dataset.tpfocus]; if (!R) return; mapZoomTo(R.lx, R.ly, Math.max(mapZoomState().k, 1.8)); const mine = tpAt(G, "player", b.dataset.tpfocus); if (mine) UI.tpSel = mine.id; renderGame(); window.scrollTo({ top: Math.max(0, ($("#mapMain").getBoundingClientRect().top + window.scrollY) - 70), behavior: "smooth" }); });
  el.querySelectorAll("[data-foff]").forEach(b => b.onclick = () => { const r = launchOffensive(G, b.dataset.foff); if (r.ok) AUDIO.sfx("order"); afterAct(r); });
  el.querySelectorAll("[data-foff-cancel]").forEach(b => b.onclick = () => afterAct(cancelOffensive(G, b.dataset.foffCancel)));
  { const last = (G.mil && G.mil.battles) || []; el.querySelectorAll(".sidepanel [data-frow]").forEach(b => b.onclick = () => { const r = last[+b.dataset.frow]; if (r) openFrontReport(r); }); }
  el.querySelectorAll("details[data-tpdet]").forEach(d => d.ontoggle = () => { UI[d.dataset.tpdet] = d.dataset.id ? { id: d.dataset.id, open: d.open } : d.open; });
  el.querySelectorAll("[data-tprec]").forEach(b => b.onclick = () => { const how = b.dataset.tprec, r = recruitArmy(G, b.dataset.uf, how, b.dataset.id || undefined);
    if (r.ok){ AUDIO.sfx("order"); if (r.id){ UI.tpSel = r.id; UI.selUF = null; } } afterAct(r); });
  if ($("#tpRecUF")) $("#tpRecUF").onchange = e => { UI.tpRec = e.target.value; UI.tpRecHow = null; renderGame(); };
  if ($("#tpRecHow")) $("#tpRecHow").onchange = e => { UI.tpRecHow = e.target.value; renderGame(); };
  if ($("#btnRecruit")) $("#btnRecruit").onclick = () => { const hv = $("#tpRecHow") ? $("#tpRecHow").value : "";
    const r = recruitArmy(G, $("#tpRecUF") ? $("#tpRecUF").value : null, hv === "novo" ? "novo" : hv ? "reforco" : undefined, hv.startsWith("r:") ? hv.slice(2) : undefined); if (r.ok) AUDIO.sfx("order"); afterAct(r); };
  // fase 16: próximo sem ordem, filtro/busca do painel, renomear, dividir, juntar
  el.querySelectorAll("[data-tpnext]").forEach(b => b.onclick = e => { e.stopPropagation(); const a = tpNextIdle(); if (!a) return; if (G.simple && !UI.manual) UI.manual = true;
    UI.tpSel = a.id; UI.tpPend = null; UI.selUF = null; UI.tpRen = null; tpZoomToArmy(a); AUDIO.sfx("click"); renderGame(); });
  el.querySelectorAll("[data-tpfilt]").forEach(b => b.onclick = () => { UI.tpFilt = b.dataset.tpfilt; renderGame(); });
  const fi = el.querySelector("#tpFind"); if (fi){ const run = () => { const q = fi.value.trim().toLowerCase(); UI.tpFind = fi.value; el.querySelectorAll(".tplist .tprow[data-q]").forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); }); }; fi.oninput = run; if (fi.value) run(); }
  el.querySelectorAll("[data-tpren]").forEach(b => b.onclick = () => { UI.tpRen = UI.tpRen === b.dataset.tpren ? null : b.dataset.tpren; renderGame(); setTimeout(() => { const i = $("#tpRenIn"); if (i) i.focus(); }, 30); });
  el.querySelectorAll("[data-tprenx]").forEach(b => b.onclick = () => { UI.tpRen = null; renderGame(); });
  el.querySelectorAll("[data-tprenf]").forEach(f => f.onsubmit = e => { e.preventDefault(); const r = tpRename(G, f.dataset.tprenf, $("#tpRenIn").value); UI.tpRen = null; afterAct(r); });
  el.querySelectorAll("[data-tpmark]").forEach(c => c.onchange = () => { tpToggleMark(c.dataset.tpmark); renderGame(); });
  el.querySelectorAll("[data-tpkeep]").forEach(c => c.onchange = () => { UI.tpKeep = c.value; renderGame(); });
  el.querySelectorAll("[data-tpmerge]").forEach(b => b.onclick = () => { const L = tpMarkList(), r = tpMerge(G, L, tpKeepOf(L)); if (r.ok){ AUDIO.sfx("order"); UI.tpSel = r.id; UI.tpMark = null; UI.tpKeep = null; } afterAct(r); });
  el.querySelectorAll("[data-tpsplit]").forEach(b => b.onclick = () => { const r = tpSplit(G, b.dataset.tpsplit); if (r.ok){ AUDIO.sfx("order"); UI.tpMark = null; } afterAct(r); });
  el.querySelectorAll("[data-tpjoin]").forEach(b => b.onclick = () => { const a = tpSelArmy(); if (!a) return; const r = tpJoin(G, a.id, b.dataset.tpjoin); if (r.ok) AUDIO.sfx("order"); afterAct(r); });
  if ($("#autoSel")) $("#autoSel").onchange = e => { const r = setAutoOrders(G, e.target.value); if (e.target.value !== "off") frontAuto(G, e.target.value); afterAct(r); };
}
