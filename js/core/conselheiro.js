// js/core/conselheiro.js — Núcleo: a conselheira (Marta Siqueira, chefe de gabinete) — escolhe 1 ou 2 dicas por mês e executa o "Fazer isso".
/* Cada dica: { id, pri, head, text, sub?, act }. head/text/sub são frases fixas (traduzíveis) ou nomes do jogo.
   act.k: "tab" (só a tela muda), "action", "fac", "focus", "auto", "recruit", "posture"/"ofensiva"/"split" (frentes), "choose" (escolha da história) ou "end" (encerrar o mês, feito pela tela).
   No caminho do golpe (coupState em js/core/golpe.js) entram as dicas do plano, com golpe: true. */
const ADVISOR = { name: "Marta Siqueira", role: "Chefe de gabinete", portrait: "conselheira", max: 2 };
// Valor de um efeito para o governo: sobe os atributos mais baixos (mesma ideia da IA "gulosa" do sim)
function advisorFxValue(g, fx){
  if (!fx) return 0;
  let v = 0;
  for (const k in (fx.s || {})) v += fx.s[k] * (g.stats[k] < 30 ? 2.5 : g.stats[k] > 70 ? 0.4 : 1);
  for (const id in (fx.fac || {})) v += fx.fac[id] * (g.fac[id] && g.fac[id].loyalty < 30 ? 0.5 : 0.12);
  v += (fx.money || 0) * 0.25 - (fx.unrestAll || 0) * 0.2;
  return v;
}
function advisorBestAction(g, filter){
  return visibleActions(g).filter(a => actionState(g, a).ok && (!filter || filter(a)))
    .map(a => ({ a, v: advisorFxValue(g, a.fx) - (a.cost || 0) * (g.money < 15 ? 0.5 : 0.12) - (a.risk ? a.risk.p * 6 : 0) }))
    .sort((x, y) => y.v - x.v)[0] || null;
}
function advisorBestFocus(g){
  const T = focusTree(g); if (!T || !g.focus || g.focus.active) return null;
  const regime = phaseOf(g).id === "regime", plano = coupState(g) === "plano";
  return T.nodes.filter(F => !focusCheck(g, F.id) && !(plano && (F.excl || []).includes("c_ruptura")))
    .map(F => ({ F, v: advisorFxValue(g, F.fx) - (F.cost || 0) * 0.3 - F.months * 0.4 + (F.branch === "ruptura" && !regime && !plano ? -40 : 0) }))
    .sort((a, b) => b.v - a.v)[0] || null;
}
function advisorTips(g, ctx){
  ctx = ctx || {};
  if (!g || g.ended) return [];
  const C = scOf(g).campaign, ph = phaseOf(g), tips = [];
  const cs = coupState(g);
  if (g.queue.length){
    const st = cs && coupStoryTip(g, cs), ut = urnaStoryTip(g);
    if ((st || ut) && ctx.tab === "historia") return [ut, st].filter(Boolean);
    if (ctx.tab !== "historia") tips.push({ id: "fila", pri: 100, head: "Decisão esperando", text: "Tem um acontecimento esperando sua resposta na aba História. O mês só avança depois que você escolher.", act: { k: "tab", tab: "historia" }, btn: "Ver agora" });
    return tips;
  }
  // facção perto da crise
  for (const F of C.factions){
    const f = g.fac[F.id], fc = facCost(g, F, "agradar");
    if (f.loyalty < 25 && !g.used["fac_agradar_" + F.id] && g.money >= fc.money && g.ap >= fc.ap)
      tips.push({ id: "fac_" + F.id, pri: 90 - f.loyalty, head: F.name, text: fc.money ? `Este grupo está quase em crise com você (lealdade ${Math.round(f.loyalty)}). Agradar custa ${fc.money} Recursos e evita problemas maiores.` : `Este grupo está quase em crise com você (lealdade ${Math.round(f.loyalty)}). Vale agradar antes que ele cause problemas.`, act: { k: "fac", id: F.id } });
  }
  // atributo perigosamente baixo
  const low = Object.keys(g.stats).filter(k => g.stats[k] < 30).sort((a, b) => g.stats[a] - g.stats[b])[0];
  if (low){
    const best = advisorBestAction(g, a => a.fx && a.fx.s && a.fx.s[low] > 0);
    if (best) tips.push({ id: "low_" + low, pri: 80, head: scOf(g).story.stats[low].label, text: `Está baixo (${Math.round(g.stats[low])}). Se cair demais, a campanha pode acabar. Esta ação ajuda:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  // Tensão no Sul
  if (southOn(g) && g.south.state === "calmo" && g.south.t >= 55){
    const best = advisorBestAction(g, a => a.cat === "sul");
    if (best) tips.push({ id: "sul", pri: 78 + (g.south.t >= 75 ? 10 : 0), head: "Tensão no Sul", text: `A tensão está em ${Math.round(g.south.t)} de 100. Em 100 o Sul se rebela. Esta ação ajuda a acalmar:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  // guerra de 2022 (exércitos nos estados): defesa, ataque, ofensiva especial, comando automático e recrutamento
  if (ph.war && !ph.noArmies && frontMode(g)){
    advisorFrontTips(g, tips);
    // soldo (fase 16): cofres perto do limite → aviso do motim
    const S = frontCfg(g).soldo;
    if (S && g.war && g.war.fronts.length && (g.money < S.limite + 8 || g.unpaid > 0))
      tips.push({ id: "soldo", pri: 88 + (g.unpaid || 0) * 4, head: "Soldo das tropas", text: g.unpaid ? "O soldo já está atrasado. Mais alguns meses assim e as tropas se amotinam — e a campanha acaba. Consiga Recursos já (converta Apoio ou Base em Recursos, corte o recrutamento)." : "Os cofres estão quase no vermelho. Se o mês fechar com menos de −10 Recursos, o soldo atrasa; 3 meses seguidos e as tropas se amotinam.", act: { k: "tab", tab: "acoes" }, btn: "Ver ações" });
  }
  // guerra: exércitos sem ordem
  else if (ph.war && !ph.noArmies){
    const mine = armiesOf(g, "player"), idle = mine.filter(a => !a.order).length;
    if (idle && g.autoOrders !== "auto" && !ctx.manual) tips.push({ id: "auto", pri: 75, head: "Exércitos parados", text: idle === 1 ? "Um exército está sem ordem neste mês. Deixe as tropas agirem sozinhas: elas atacam onde a chance é boa e defendem o resto." : `${idle} exércitos estão sem ordem neste mês. Deixe as tropas agirem sozinhas: elas atacam onde a chance é boa e defendem o resto.`, act: { k: "auto" } });
    const me = sideStr(g, "player"), foe = sideStr(g, "enemy"), rs = recruitState(g);
    if (rs.ok && (foe > me * 1.1 || g.money >= moneyCap(g) - 15) && g.money >= rs.cost + 5)
      tips.push({ id: "recruit", pri: foe > me * 1.3 ? 72 : 50, head: "Mais tropas", text: `Seu lado tem ${Math.round(me)} de força e o inimigo ${Math.round(foe)}. Um exército novo custa ${rs.cost} Recursos.`, act: { k: "recruit" } });
  }
  // Recursos quase no teto
  const cap = moneyCap(g);
  if (Number.isFinite(cap) && g.money >= cap - 10){
    const bf = advisorBestFocus(g), ba = advisorBestAction(g, a => (a.cost || 0) > 0);
    const act = bf && (bf.F.cost || 0) > 0 ? { k: "focus", id: bf.F.id, sub: bf.F.name } : ba ? { k: "action", id: ba.a.id, sub: ba.a.name } : null;
    if (act) tips.push({ id: "cap", pri: 70, head: "Recursos quase no limite", text: `Você tem ${Math.round(g.money)} de ${cap}. O que passar do limite se perde no fim do mês, então vale gastar agora:`, sub: act.sub, act });
  }
  // caminho do golpe: dicas do plano (no "plano" substituem a sugestão genérica de decisão nacional)
  if (cs) tips.push(...coupTips(g, cs));
  tips.push(...urnaTips(g)); // contestação das urnas (js/core/urnas.js)
  // oportunidade aberta (some se não for aproveitada)
  const T = focusTree(g);
  if (T && g.focus && !g.focus.active){
    const op = T.nodes.filter(F => F.oport && g.focus.opps && g.focus.opps[F.id] !== undefined && !focusCheck(g, F.id) && (cs !== "plano" || F.id === "o_quarteis"))
      .map(F => ({ F, v: advisorFxValue(g, F.fx) - (F.cost || 0) * 0.3 })).sort((a, b) => b.v - a.v)[0];
    if (op && op.v > 0){ const left = focusStatus(g, op.F).left || 1;
      tips.push({ id: "opp", pri: 64, head: "Oportunidade", text: `Oportunidade aberta na aba Decisões: ${oppLeftText(g, left)}. Depois de começada, ela sempre termina. Vale aproveitar:`, sub: op.F.name, act: { k: "focus", id: op.F.id } }); }
  }
  // nenhuma decisão nacional em andamento
  const bf = advisorBestFocus(g);
  if (bf && cs !== "plano") tips.push({ id: "focus", pri: 62, head: "Decisões nacionais", text: bf.F.months === 1 ? "Nenhuma decisão nacional está em andamento. Sugiro esta, que leva 1 mês:" : `Nenhuma decisão nacional está em andamento. Sugiro esta, que leva ${bf.F.months} meses:`, sub: bf.F.name, act: { k: "focus", id: bf.F.id } });
  // ações sobrando
  if (g.ap > 0){
    const best = advisorBestAction(g);
    if (best && best.v > 0) tips.push({ id: "ap", pri: 40, head: "Ações sobrando", text: g.ap === 1 ? "Você ainda tem 1 ação neste mês. Uma boa opção:" : `Você ainda tem ${g.ap} ações neste mês. Uma boa opção:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  if (!tips.length) tips.push({ id: "fim", pri: 0, head: "Tudo em ordem", text: "Já fizemos o que dava neste mês. Quando estiver pronto, encerre o mês.", act: { k: "end" }, btn: "Encerrar mês" });
  // ordena e tira dicas que fazem a mesma coisa
  const seen = new Set();
  return tips.sort((a, b) => b.pri - a.pri).filter(t => { const k = t.act.k + ":" + (t.act.id || ""); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, ADVISOR.max);
}
// Executa o "Fazer isso" de uma dica (tudo menos "tab" e "end", que são da tela)
function advisorDo(g, tip){
  const res = advisorRun(g, tip);
  if (res && res.ok !== false && tip.act.k !== "tab" && tip.act.k !== "end") g.stat.adv = (g.stat.adv || 0) + 1; // conta para a conquista "Boa equipe"
  return res;
}
function advisorRun(g, tip){
  const a = tip && tip.act; if (!a) return { ok: false, msg: "Dica inválida" };
  if (a.k === "action") return doAction(g, a.id);
  if (a.k === "fac") return factionAction(g, a.id, "agradar");
  if (a.k === "focus") return startFocus(g, a.id);
  if (a.k === "recruit") return recruitArmy(g);
  if (a.k === "choose") return choose(g, a.i) ? { ok: true } : { ok: false, msg: "Escolha indisponível" };
  if (a.k === "tropa") return tpOrder(g, a.id, a.to);
  if (a.k === "flanco"){ let r = { ok: false }; for (const id of a.ids) r = tpOrder(g, id, a.to); return r; }
  if (a.k === "ofensiva") return launchOffensive(g, a.id);
  if (a.k === "auto" && frontMode(g)){ const m = setAutoOrders(g, "auto"); frontAuto(g, "auto"); return m; }
  if (a.k === "auto"){ setAutoOrders(g, "auto"); autoOrders(g, "auto"); return { ok: true, msg: "Ordens automáticas ligadas: as tropas agem sozinhas todo mês." }; }
  return { ok: true };
}
// Caminho até Recife: " Recife a N estados."
function advisorPathText(g, f){
  const D = f && frontCfg(g).frentes[f.id]; if (!D || !D.vitoria) return "";
  const P = tpGoalPath(g, f.id); if (!P) return "";
  return " " + (P.length === 1 ? frontFala(g, "mapa", "faltaUma") : gfmt(frontFala(g, "mapa", "faltam"), P.length) + ".");
}
// Dicas de guerra (2022, exércitos): defender o estado ameaçado, o melhor ataque, ataque de flanco, ofensiva especial, comando automático, recrutar
function advisorFrontTips(g, tips){
  const W = g.war, K = frontCfg(g), F = k => frontFala(g, "tropas", k); if (!W.fronts.length || !W.armies) return;
  const mine = tpArmies(g, "player"), auto = g.autoOrders === "auto", cap = tpCap(g);
  // 1) ameaça: o inimigo planeja atacar um estado seu com boa chance e um exército seu (sem ordem) pode chegar lá
  const threats = {};
  for (const e of tpArmies(g, "enemy")) if (e.order && e.order.type === "atacar") (threats[e.order.to] ||= []).push(e);
  let bestT = null;
  for (const uf in threats){
    const ch = tpOdds(g, threats[uf], uf).chance; if (ch < 0.45) continue;
    const helper = mine.filter(a => !a.order && a.uf !== uf && tpTargets(g, a).some(t => t.to === uf && t.type !== "atacar")).sort((x, y) => y.str - x.str)[0];
    if (!helper) continue;
    const imp = ch + (uf === cap ? 1 : 0) + (UF_WEIGHT[uf] || 1) / 20;
    if (!bestT || imp > bestT.imp) bestT = { uf, ch, helper, imp };
  }
  if (bestT && !auto) tips.push({ id: "tp_def", pri: bestT.uf === cap ? 92 : 84, head: F("dicaDefTit"), text: gfmt(F("dicaDef"), ufName(bestT.uf), Math.round(bestT.ch * 100), tpName(g, bestT.helper)), act: { k: "tropa", id: bestT.helper.id, to: bestT.uf } });
  // 2) melhor ataque de um exército sem ordem (chance ≥ 60%), preferindo o caminho até a capital inimiga
  let best = null, flank = null;
  const goalD = to => { const goal = tpHome(g, "enemy", g.control[to]); return goal ? (ufDist(goal)[to] ?? 30) - (to === goal ? 25 : 0) : 30; };
  for (const a of mine){
    if (a.order || (bestT && a === bestT.helper)) continue;
    for (const t of tpTargets(g, a)) if (t.type === "atacar"){
      const ch = tpChance(g, a, t.to).chance, v = ch - 0.04 * goalD(t.to);
      if (ch >= 0.6){ if (!best || v > best.v) best = { a, to: t.to, ch, v, fac: g.control[t.to] }; continue; }
      // flanco: outro exército sem ordem, em outro estado vizinho do mesmo alvo, completa a chance
      for (const b of mine) if (b !== a && !b.order && b.uf !== a.uf && (ADJ[b.uf] || []).includes(t.to) && (!bestT || b !== bestT.helper)){
        const c2 = tpOdds(g, [a, b], t.to).chance, v2 = c2 - 0.04 * goalD(t.to);
        if (c2 >= 0.6 && (!flank || v2 > flank.v)) flank = { a, b, to: t.to, ch: c2, v: v2 };
      }
    }
  }
  if (best && !auto) tips.push({ id: "tp_atk", pri: 72, head: F("dicaAtaqueTit"), text: gfmt(F("dicaAtaque"), tpName(g, best.a), ufName(best.to), Math.round(best.ch * 100)) + advisorPathText(g, frontById(g, best.fac) || W.fronts[0]), act: { k: "tropa", id: best.a.id, to: best.to } });
  else if (flank && !auto) tips.push({ id: "tp_flanco", pri: 70, head: F("dicaFlancoTit"), text: gfmt(F("dicaFlanco"), tpName(g, flank.a), tpName(g, flank.b), ufName(flank.to), Math.round(flank.ch * 100)), act: { k: "flanco", ids: [flank.a.id, flank.b.id], to: flank.to } });
  // 3) ofensiva especial num ataque já ordenado e apertado
  const off = offensiveState(g);
  if (off.ok && g.money >= off.cost + 10){
    const c = mine.filter(a => a.order && a.order.type === "atacar" && a.morale >= 30).map(a => ({ a, ch: tpChance(g, a, a.order.to).chance })).filter(x => x.ch >= 0.35 && x.ch < 0.8).sort((x, y) => y.ch - x.ch)[0];
    if (c) tips.push({ id: "ofensiva", pri: 62, head: F("dicaOfTit"), text: gfmt(F("dicaOf"), tpName(g, c.a), ufName(c.a.order.to), Math.round(c.ch * 100), off.cost), act: { k: "ofensiva", id: c.a.id } });
  }
  // 4) vários exércitos parados: comando automático
  const idle = mine.filter(a => !a.order).length;
  if (idle >= 2 && (!g.autoOrders || g.autoOrders === "off")) tips.push({ id: "auto", pri: 58, head: F("dicaAutoTit"), text: idle === 1 ? F("dicaAutoUm") : gfmt(F("dicaAuto"), idle), act: { k: "auto" } });
  // 5) recrutar quando o inimigo é mais forte (ou o caixa está cheio)
  const me = frontPool(g), foe = tpTotal(g, "enemy"), rs = recruitState(g);
  if (rs.ok && (foe > me * 0.9 || g.money >= moneyCap(g) - 15) && g.money >= rs.cost + 5)
    tips.push({ id: "recruit", pri: foe > me * 1.2 ? 74 : 52, head: F("dicaRecTit"), text: gfmt(F("dicaRec"), Math.round(me), Math.round(foe), K.recruta.forca, rs.cost), act: { k: "recruit" } });
}
