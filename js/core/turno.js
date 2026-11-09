// js/core/turno.js — Núcleo: "Encerrar mês" (endTurn) e o registro do mês.
/* ---------- Encerrar o mês ---------- */
function paceFor(g){
  const C = scOf(g).campaign, ph = phaseOf(g);
  if (ph.war) return 1;
  let p = 1;
  for (const s of (C.pace || [])) if (g.month >= parseYM(s.from)) p = s.months;
  return p;
}
function incomeFor(g){
  const sc = scOf(g), C = sc.campaign, ph = phaseOf(g), K = C.keys;
  const sides = sideCounts(g), strength = sideStr(g, "player");
  const base = ph.income ?? 4, terr = sides.wPlayer * (ph.perWeight ?? 0.2), econ = K.econ ? ((g.stats[K.econ] - 50) / 10) : 0;
  const upkeep = strength / STR_UNIT * (C.upkeep ?? 0.4), sanc = Object.values(g.actors).filter(a => a.sanctioning).length * 2;
  const facBonus = C.factions.reduce((s, f) => s + ((f.boostMoney && g.fac[f.id].loyalty >= 65) ? f.boostMoney : 0) - ((f.boostMoney && g.fac[f.id].loyalty <= 25) ? f.boostMoney : 0), 0);
  return { base, terr, econ, upkeep, sanc, facBonus, total: Math.round(base + terr + econ - upkeep - sanc + facBonus) };
}
function endTurn(g){
  if (g.ended) return false;
  if (g.queue.length) return false;
  const sc = scOf(g), S = sc.story, C = sc.campaign, K = C.keys, rep = [];
  const R = (t, k) => rep.push({ t, k: k || "info" });
  const qz = halfOn(g); // abertura em quinzenas (js/core/quinzenas.js)
  if (qz && !g.half) return halfTurn(g);
  g.lastDelta = {}; g.lastMapChanges = []; g.counter = null; g.notice = null;
  let pace = qz ? 1 : paceFor(g);
  if (g.story.pending) pace = Math.min(pace, Math.max(1, g.story.due - g.month));
  const from = g.month; g.month += pace; g.turn++;
  if (qz) g.half = 0;
  R(pace > 1 ? `Passaram-se ${pace} meses (${monthLabel(from)} → ${monthLabel(g.month)}).` : qz && halfOn(g) ? `Nova quinzena: ${dateLabel(g)}.` : `Novo mês: ${monthLabel(g.month)}.`);
  // 1. Economia (na abertura em quinzenas, metade da receita do mês em cada quinzena)
  const inc = incomeFor(g), gain = qz ? inc.total - Math.round(inc.total / 2) : inc.total * pace;
  g.money += gain;
  R(`Receita líquida: ${gain >= 0 ? "+" : ""}${gain} ${C.money.short} (base ${Math.round(inc.base)}, território +${Math.round(inc.terr)}, manutenção de tropas −${Math.round(inc.upkeep)}${inc.sanc ? `, sanções −${inc.sanc}` : ""}${inc.econ ? `, economia ${inc.econ > 0 ? "+" : ""}${Math.round(inc.econ)}` : ""}${inc.facBonus ? `, facções ${inc.facBonus > 0 ? "+" : ""}${inc.facBonus}` : ""}).`, gain >= 0 ? "good" : "bad");
  for (const d of g.drains) if (d.until > from){ const m = Math.min(pace, d.until - from); g.money -= d.amount * m; }
  g.drains = g.drains.filter(d => d.until > g.month);
  for (const d of g.debts.filter(d => d.due <= g.month)){
    const A = actorDef(g, d.aid);
    if (g.money >= d.amount){ g.money -= d.amount; R(`Dívida paga a ${A.name}: −${d.amount} ${C.money.short}.`, "bad"); }
    else { bumpActor(g, d.aid, -30); applyStats(g, K.econ ? { [K.econ]: -8, [K.legit]: -4 } : { [K.legit]: -6, [K.pop]: -3 }); g.money -= Math.round(d.amount / 2); R(`Calote! Sem caixa para pagar ${A.name}: metade renegociada às pressas, opinião −30.`, "bad"); }
  }
  g.debts = g.debts.filter(d => d.due > g.month);
  if (g.money < 0){ applyStats(g, Object.assign({ [K.pop]: -2 }, C.keys.money ? { [C.keys.money]: -2 } : {})); R("Cofres no vermelho: salários atrasam e a confiança cai.", "bad"); }
  else if (C.keys.money){ if (g.money < 3) applyStats(g, { [C.keys.money]: -1 }); else if (g.money >= (C.money.comfort ?? 20)) applyStats(g, { [C.keys.money]: g.money > (C.money.comfort ?? 20) + 15 ? 2 : 1 }); }
  // 1a. Desgaste (Difícil): Apoio Popular e Base Política acima do limite caem 1 ponto por mês
  const dz = diffOf(g).desgaste;
  if (dz) for (const k of ["apoio", "base"]) if (g.stats[k] > dz) g.stats[k] -= 1;
  // 1b. Foco nacional (árvore de decisões)
  if (C.focus) focusTick(g, qz ? (halfCfg(g).foco ?? 1) : pace, R);
  // 1c. Contestação das urnas (js/core/urnas.js): um turno de mês vale duas quinzenas
  urnaTick(g, qz ? 1 : 2 * pace, R);
  // 2. Mapa: agitação, simpatia, combates, inimigo
  const ph = phaseOf(g);
  const pop = g.stats[K.pop] ?? 50, econ = K.econ ? g.stats[K.econ] : 50, mil = g.stats[K.mil] ?? 50;
  let sumUnrest = 0, nP = 0;
  for (const uf in g.uf){
    const u = g.uf[uf], s = sideOf(g, g.control[uf], ph);
    const target = clamp(55 - (pop - 50)*0.7 - (econ - 50)*0.3 - Math.min(24, sideStr(g, "player", uf) / STR_UNIT * 4) + (s === "contested" ? 20 : 0) + (C.unrestBias || 0), 5, 95);
    u.unrest = clamp(Math.round(u.unrest + (target - u.unrest)*0.2 + (rnd(g)*8 - 4)), 0, 100);
    if (s !== "player") u.sway = clamp(u.sway - 5*pace, -100, 100);
    if (s === "player"){ sumUnrest += u.unrest; nP++; }
  }
  const avgU = nP ? sumUnrest / nP : 0;
  if (nP && avgU > 62){ applyStats(g, { [K.pop]: -2 }); R(`Agitação alta nos seus estados (média ${Math.round(avgU)}).`, "bad"); }
  else if (nP && avgU < 30) applyStats(g, { [K.pop]: 1 });
  // revoltas / perdas por agitação extrema
  for (const uf of playerUFs(g)){
    const u = g.uf[uf];
    if (u.unrest >= 88 && sideStr(g, "player", uf) < 20){
      if (ph.war && frontMode(g) && !C.contested){ // 2022: o estado inteiro passa para o inimigo vizinho (sem vizinho inimigo: grandes protestos)
        const to = tpRevoltTo(g, uf);
        if (to){ setControl(g, uf, to); g.uf[uf].unrest = 60; tpFix(g); R(gfmt(frontFala(g, "mapa", "revolta"), MAP_DATA.states[uf].name), "bad"); }
        else { applyStats(g, { [K.pop]: -2 }); u.unrest = 70; R(`Grandes protestos em ${MAP_DATA.states[uf].name}.`, "bad"); } }
      else if (ph.war && ph.revoltTo !== null){ setControl(g, uf, C.contested); g.uf[uf].enemy = Math.max(g.uf[uf].enemy, 2); R(`Revolta em ${MAP_DATA.states[uf].name}: o estado entrou em disputa.`, "bad"); }
      else if (ph.loseTo && ph.loseTo[g.control[uf]]){ setControl(g, uf, ph.loseTo[g.control[uf]]); R(`${MAP_DATA.states[uf].name} escapou da sua influência após protestos.`, "bad"); }
      else { applyStats(g, { [K.pop]: -2 }); u.unrest = 70; R(`Grandes protestos em ${MAP_DATA.states[uf].name}.`, "bad"); }
    }
  }
  // 2b. Operações militares: ordens dos exércitos (jogador) + plano da IA inimiga
  if (frontMode(g)){ // 2022: guerra por frentes (js/core/frentes.js)
    frontWarMonth(g, R);
    if (!g.war.end) frontSoldo(g, R); // fase 16: soldo atrasado e motim
    if (g.war.end){ applyMoneyCap(g); g.report = rep; finishLog(g, rep); endCampaign(g, g.war.end.to, g.war.end.why, g.war.end.cause); return true; }
  } else {
  if (ph.war && g.autoOrders && g.autoOrders !== "off" && g.armies){ const r = autoOrders(g, g.autoOrders, true); if (r.n) R(`Ordens automáticas (${g.autoOrders === "auto" ? "automático" : "defender fronteiras"}): ${r.n} ${r.n === 1 ? "exército recebeu" : "exércitos receberam"} ordem.`); }
  if (ph.war){
    const cf = g.ceasefire > 0;
    if (cf){ g.ceasefire--; R("Trégua em vigor: sem combates neste mês (só deslocamentos).", "good"); }
    militaryMonth(g, R, !cf);
    if (!cf && phaseOf(g).war){
      enemyReinforce(g, R);
      playerMobilize(g, R);
      const sides = sideCounts(g), tot = sides.wPlayer + sides.wEnemy + sides.wContested;
      const share = tot ? sides.wPlayer / tot : 1;
      if (share > 0.65) applyStats(g, { [K.mil]: 1 }); else if (share < 0.35) { applyStats(g, { [K.mil]: -2 }); R("Você controla pouco território: o moral das tropas cai.", "bad"); }
      if (sides.contested >= 3) applyStats(g, { [K.pop]: -1 });
    }
    g.enemyBoost = Math.max(0, g.enemyBoost - 0.25);
  } else militaryMonth(g, R, false);
  }
  // 2c. Tensão no Sul (2022): pode levar à rebelião da Liga do Sul
  southTick(g, pace, R);
  // 3. Facções
  for (const F of C.factions){
    const f = g.fac[F.id];
    f.loyalty = clamp(Math.round((f.loyalty + (F.loyalty - f.loyalty) * 0.05) * 10) / 10, 0, 100);
    if (F.boost){ if (f.loyalty >= 70) applyStats(g, F.boost); else if (f.loyalty <= 25) applyStats(g, Object.fromEntries(Object.entries(F.boost).map(([k, v]) => [k, -v]))); }
  }
  // 4. Atores estrangeiros
  const legit = g.stats[K.legit] ?? 50;
  for (const A of C.actors){
    const st = g.actors[A.id];
    const base = A.opinion + (A.democracy || 0) * (legit - 50) * 0.5 + (st.aligned ? 15 : 0);
    st.opinion = clamp(Math.round(st.opinion + (base - st.opinion) * 0.1), -100, 100);
    if (g.turn % 3 === 0 && st.deals > 0) st.deals--;
    st.dependence = Math.max(0, st.dependence - 2);
    if (ph.war){
      if (st.opinion >= 45 && (A.gives.armas || 0) > 0 && rnd(g) < 0.2){ const got = addPlayerStrength(g, STR_UNIT); if (got) R(`${A.name} enviou equipamento por conta própria (+${got} de força).`, "good"); }
      const was = st.supportsEnemy; st.supportsEnemy = st.opinion <= -45 && (A.gives.armas || 0) > 0;
      if (st.supportsEnemy && !was) R(`${A.name} passou a apoiar o lado inimigo.`, "bad");
    } else st.supportsEnemy = false;
    const wasS = st.sanctioning;
    if (!wasS && st.opinion <= -50 && (A.democracy || 0) >= 0.5 && (A.gives.sancoes || 0) > 0 && legit <= 35){ st.sanctioning = true; R(`${A.name} impôs sanções ao seu governo (−2 ${C.money.short}/mês).`, "bad"); }
    else if (wasS && st.opinion > -25){ st.sanctioning = false; R(`${A.name} suspendeu as sanções.`, "good"); }
    if (!ph.war && st.opinion >= 60 && (A.gives.dinheiro || 0) > 0 && rnd(g) < 0.12){ g.money += 3; R(`Investimentos de ${A.name}: +3 ${C.money.short}.`, "good"); }
  }
  syncActorStats(g);
  // 5. Fim por colapso / estado da campanha
  for (const k in S.collapse) if (g.stats[k] <= 0){ g.report = rep; finishLog(g, rep); enterStory(g, collapseTo(g, k)); g.ended.why = `${S.stats[k].label} chegou a zero.`; return true; }
  for (const chk of (C.checks || [])) if (cond(g, chk.if)){ g.report = rep; finishLog(g, rep); endCampaign(g, chk.to, chk.why, chk.cause); return true; }
  if (urnaCheck(g, rep) && g.ended){ g.report = rep; finishLog(g, rep); return true; }
  // 6. Eventos: história > crise de facção > dependência > aleatório
  if (g.story.pending && g.month >= g.story.due) enterStory(g, g.story.node, rep);
  let crisis = null;
  for (const F of C.factions){
    const f = g.fac[F.id];
    if (f.loyalty < 15 && f.influence >= 25 && g.month - f.lastCrisis >= 4){
      const ev = (C.events || []).find(e => e.crisisOf === F.id && cond(g, e.if));
      if (ev){ crisis = ev; f.lastCrisis = g.month; break; }
    }
  }
  if (crisis){ g.queue.push({ type: "event", id: crisis.id }); g.eventSeen[crisis.id] = g.month; R(`Crise: ${crisis.title}.`, "bad"); }
  else {
    const dep = C.actors.find(A => g.actors[A.id].dependence >= 45);
    if (dep && rnd(g) < 0.35 && g.month - (g.eventSeen._dependencia ?? -99) >= 6){ g.queue.push({ type: "event", id: "_dependencia", actor: dep.id }); g.eventSeen._dependencia = g.month; }
    else {
      // desdobramentos vencidos têm prioridade sobre o sorteio (um evento por turno, sem spam)
      const ci = (g.chains || []).findIndex(c => c.due <= g.month && findEvent(g, c.id) && cond(g, findEvent(g, c.id).if));
      if (ci >= 0){ const c = g.chains.splice(ci, 1)[0]; g.queue.push({ type: "event", id: c.id }); g.eventSeen[c.id] = g.month; }
      else {
        const forced = halfOn(g) ? pickForcedQuinzena(g) : null;
        if (forced){ g.queue.push({ type: "event", id: forced.id }); g.eventSeen[forced.id] = g.month; }
        else if (rnd(g) < 1 - Math.pow(1 - (C.eventChance ?? 0.45), Math.min(pace, C.eventPaceBoost ? 2 : 1))){ /* eventPaceBoost: turnos de 3 meses têm mais chance, ainda no máx. 1 sorteado */ const ev = pickRandomEvent(g); if (ev){ g.queue.push({ type: "event", id: ev.id }); g.eventSeen[ev.id] = g.month; } }
      }
    }
    g.chains = (g.chains || []).filter(c => g.month - c.due <= 6); // desdobramento que não coube em 6 meses se perde
  }
  // 7. Oportunidades (focos que aparecem e expiram) e aviso de focos novos
  if (C.focus) focusEndTick(g, R);
  planEnemy(g);
  const capInfo = applyMoneyCap(g); if (capInfo) R(`Teto de ${C.money.short}: ${capInfo} acima de ${C.money.cap} foram perdidos (caixa parado não rende).`, "bad");
  { const A = apFor(g); g.ap = A.total; g.apParts = A.parts; if (C.apScale) R(`Ações neste turno: ${A.total} (${A.parts.filter((p, i) => i === 0 || p.v).map((p, i) => i === 0 ? `base ${p.v}` : `${p.label} ${p.v > 0 ? "+" : "−"}${Math.abs(p.v)}`).join(" · ")}).`); }
  g.used = {}; g.dealtWith = {};
  halfSync(g, R);
  g.report = rep; finishLog(g, rep);
  return true;
}

function finishLog(g, rep){ g.log.unshift({ m: g.month, lines: rep.slice(0, 30) }); g.log = g.log.slice(0, 12); }
// Efeitos dinâmicos do evento genérico de dependência
function resolveGenericDyn(g, q, idx){
  const C = scOf(g).campaign, aid = q.actor, K = C.keys;
  if (idx === 0){ bumpActor(g, aid, 10); applyStats(g, { [K.legit]: -3 }); if (C.nationalFac) bumpFac(g, C.nationalFac, -10); }
  else { bumpActor(g, aid, -25); g.actors[aid].dependence = Math.max(0, g.actors[aid].dependence - 25); applyStats(g, { [K.pop]: 3 }); }
}
