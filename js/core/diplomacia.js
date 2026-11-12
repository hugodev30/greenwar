// js/core/diplomacia.js — Núcleo: diplomacia v1.20 (Pontos de Diplomacia, demandas, favores, isolamento).
/* ---------- Tipos legados (ainda usados em focos/eventos e migração) ---------- */
function actorDef(g, id){ return scOf(g).campaign.actors.find(a => a.id === id); }
function dipLabels(g){ const C = scOf(g).campaign, ph = phaseOf(g); return { req: Object.assign({}, REQ_LABEL, C.reqLabels || {}, (ph.diplo||{}).reqLabels || {}), off: Object.assign({}, OFF_LABEL, C.offLabels || {}, (ph.diplo||{}).offLabels || {}), favor: Object.assign({}, FAVOR_LABEL, C.favorLabels || {}), demand: Object.assign({}, DEMAND_LABEL, C.demandLabels || {}) }; }
function majorActors(g){ const C = scOf(g).campaign; return (C.actors || []).filter(a => a.major); }
function recognizedCount(g){ return Object.values(g.actors).filter(a => a.recognized).length; }
function sanctioningCount(g){ return Object.values(g.actors).filter(a => a.sanctioning).length; }
function enemySupportCount(g){ return Object.values(g.actors).filter(a => a.supportsEnemy).length; }
function pendingDemands(g){ return Object.keys(g.actors).filter(id => g.actors[id].demand).length; }

/* ---------- Pontos de Diplomacia (PD) ---------- */
function pdCap(g){ return scOf(g).campaign.diplo && scOf(g).campaign.diplo.cap || 8; }
function pdIncome(g, half){
  const C = scOf(g).campaign, D = C.diplo || {}, K = C.keys, intl = g.stats[K.legit] ?? 50;
  let base = D.base ?? 2, bonus = 0;
  if (intl >= (D.intlHigh ?? 70)) bonus += D.bonusHigh ?? 2;
  else if (intl >= (D.intlMid ?? 50)) bonus += D.bonusMid ?? 1;
  if (g.focus && g.focus.pdBonus) bonus += g.focus.pdBonus;
  const total = Math.max(1, base + bonus + (diffOf(g).pd || 0)); // Difícil: −1 PD por mês (v1.22)
  return half ? Math.max(1, Math.round(total / 2)) : total;
}
function grantPD(g, n, R){
  if (!n) return;
  const before = g.pd || 0, cap = pdCap(g);
  g.pd = Math.min(cap, before + n);
  if (R && g.pd > before){
    const got = g.pd - before;
    const msg = got === 1 ? `Diplomacia: +1 PD (agora ${g.pd}/${cap}).` : got === 2 ? `Diplomacia: +2 PD (agora ${g.pd}/${cap}).` : got === 3 ? `Diplomacia: +3 PD (agora ${g.pd}/${cap}).` : `Diplomacia: +${got} PD (agora ${g.pd}/${cap}).`;
    R(msg, "good");
  }
}
function spendPD(g, n){ if ((g.pd || 0) < n) return false; g.pd -= n; return true; }

/* ---------- Demandas e favores ---------- */
function demandPool(g, A){
  const ph = phaseOf(g).id, pools = A.demands || {};
  return pools[ph] || pools.default || ["gesto"];
}
function favorPool(g, A){
  const ph = phaseOf(g).id, pools = A.favors || {};
  return (pools[ph] || pools.default || ["reconhecimento"]).filter(f => favorAvailable(g, A.id, f));
}
function favorAvailable(g, aid, fav){
  const st = g.actors[aid], A = actorDef(g, aid), ph = phaseOf(g);
  if (fav === "reconhecimento" && st.recognized) return false;
  if (fav === "armas" && !ph.war) return false;
  if (fav === "sancoes" && !ph.war) return false;
  if (fav === "dinheiro" && (A.gives && (A.gives.dinheiro || 0) <= 0)) return false;
  if (st.favorUsed && st.favorUsed[fav] && g.month - st.favorUsed[fav] < 3) return false;
  return true;
}
function refreshDemand(g, aid){
  const A = actorDef(g, aid), st = g.actors[aid]; if (!A || !st) return;
  const pool = demandPool(g, A);
  let pick = pool[Math.floor(rnd(g) * pool.length)];
  if (pool.length > 1 && pick === st.demand) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  st.demand = pick; st.demandAge = 0;
}
function refreshAllDemands(g){
  for (const A of scOf(g).campaign.actors || []) if (!g.actors[A.id].demand || g.actors[A.id].demandAge >= 2) refreshDemand(g, A.id);
  else g.actors[A.id].demandAge = (g.actors[A.id].demandAge || 0) + 1;
}
function demandCost(g, dem){ return (scOf(g).campaign.diplo && scOf(g).campaign.diplo.demandCost && scOf(g).campaign.diplo.demandCost[dem]) || 1; }
function favorCost(g, fav){ return (scOf(g).campaign.diplo && scOf(g).campaign.diplo.favorCost && scOf(g).campaign.diplo.favorCost[fav]) || 1; }

function meetDemand(g, aid){
  if (g.ended || g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes" };
  const A = actorDef(g, aid), st = g.actors[aid]; if (!A || !st || !st.demand) return { ok: false, msg: "Sem pedido pendente" };
  if (g.dealtWith[aid]) return { ok: false, msg: "Já negociou com este ator neste turno" };
  const cost = demandCost(g, st.demand);
  if ((g.pd || 0) < cost) return { ok: false, msg: cost===2 ? "Pontos de Diplomacia insuficientes (precisa 2)" : "Pontos de Diplomacia insuficientes (precisa 1)" };
  const dem = st.demand;
  spendPD(g, cost); g.dealtWith[aid] = true; g.stat.deals = (g.stat.deals || 0) + 1; st.deals = (st.deals || 0) + 1;
  const out = applyDemand(g, aid, dem);
  st.demand = null; st.demandAge = 0;
  bumpActor(g, aid, 10); syncActorStats(g);
  return { ok: true, msg: `Pedido atendido (${A.short || A.name}): ${out}` };
}
function askFavor(g, aid, fav){
  if (g.ended || g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes" };
  const A = actorDef(g, aid), st = g.actors[aid]; if (!A || !st) return { ok: false, msg: "Ator inválido" };
  if (g.dealtWith[aid]) return { ok: false, msg: "Já negociou com este ator neste turno" };
  if (!favorAvailable(g, aid, fav)) return { ok: false, msg: "Favor indisponível" };
  let cost = favorCost(g, fav);
  if (A.cheaper && A.cheaper[fav] != null) cost = A.cheaper[fav];
  if (g.focus && g.focus.dipBonus && g.focus.dipBonus[aid]) cost = Math.max(1, cost - 1);
  if ((g.pd || 0) < cost) return { ok: false, msg: cost===2 ? "Pontos de Diplomacia insuficientes (precisa 2)" : "Pontos de Diplomacia insuficientes (precisa 1)" };
  // opinião mínima (bônus de foco reduz a exigência)
  let need = (scOf(g).campaign.diplo && scOf(g).campaign.diplo.favorOpinion && scOf(g).campaign.diplo.favorOpinion[fav]) || 0;
  if (g.focus && g.focus.dipBonus && g.focus.dipBonus[aid]) need = Math.max(0, need - Math.round(g.focus.dipBonus[aid] / 2));
  if (st.opinion < need){ const tips={10:"Opinião baixa demais (precisa +10)",15:"Opinião baixa demais (precisa +15)",20:"Opinião baixa demais (precisa +20)",25:"Opinião baixa demais (precisa +25)",30:"Opinião baixa demais (precisa +30)"}; return { ok: false, msg: tips[need] || "Opinião baixa demais" }; }
  spendPD(g, cost); g.dealtWith[aid] = true; g.stat.deals = (g.stat.deals || 0) + 1; st.deals = (st.deals || 0) + 1;
  st.favorUsed = st.favorUsed || {}; st.favorUsed[fav] = g.month;
  const out = applyFavor(g, aid, fav);
  bumpActor(g, aid, 3); syncActorStats(g);
  return { ok: true, msg: `Favor obtido (${A.short || A.name}): ${out}` };
}
function diploMission(g, aid){
  if (g.queue.length || g.ended) return { ok: false, msg: "Resolva os eventos pendentes" };
  const key = "mis_" + aid, cost = 1, money = scOf(g).campaign.missionCost ?? 2;
  if (g.used[key]) return { ok: false, msg: "Missão já enviada neste turno" };
  if ((g.pd || 0) < cost) return { ok: false, msg: "Pontos de Diplomacia insuficientes" };
  if (g.money < money) return { ok: false, msg: "Recursos insuficientes" };
  spendPD(g, cost); g.money -= money; g.used[key] = true; g.stat.actions++;
  bumpActor(g, aid, 8); syncActorStats(g);
  return { ok: true, msg: `Missão diplomática: opinião de ${actorDef(g, aid).short || actorDef(g, aid).name} +8.` };
}

function applyDemand(g, aid, dem){
  const C = scOf(g).campaign, K = C.keys, A = actorDef(g, aid), out = [];
  if (dem === "gesto"){ applyStats(g, { [K.legit]: 1 }); out.push("gesto público (+1 relações)"); }
  else if (dem === "alinhamento"){ g.actors[aid].aligned = true; applyStats(g, { [K.legit]: 2 }); const rel = A.rel || {}; for (const x in rel){ if (rel[x] < 0) bumpActor(g, x, -8 * Math.abs(rel[x])); else bumpActor(g, x, 4 * rel[x]); } out.push("alinhamento anunciado"); }
  else if (dem === "comercio"){ g.drains.push({ aid, amount: 1, until: g.month + 4 }); out.push("acordo comercial (−1 Recursos/mês por 4 meses)"); }
  else if (dem === "amazonia"){ applyStats(g, { [K.legit]: 3 }); bumpFac(g, "agro", -4); out.push("compromisso ambiental (+3 relações, agro −4)"); }
  else if (dem === "seguranca"){ applyStats(g, { [K.mil]: 1, [K.legit]: 1 }); out.push("parceria de segurança"); }
  else if (dem === "votos"){ bumpActor(g, aid, 4); out.push("apoio em fóruns"); }
  else if (dem === "fe"){ bumpFac(g, "evangelicos", 4); bumpFac(g, "movimentos", -2); out.push("agenda de valores"); }
  else if (dem === "mercosul"){ bumpActor(g, "argentina", 6); out.push("gesto ao Mercosul"); }
  else if (dem === "credito"){ g.money += 4; out.push("+4 Recursos (linha de crédito simbólica)"); }
  else { applyStats(g, { [K.legit]: 1 }); out.push("demanda atendida"); }
  if (A.reactions) for (const f in A.reactions) bumpFac(g, f, Math.round(A.reactions[f] * 0.5));
  return out.join("; ") + ".";
}
function applyFavor(g, aid, fav){
  const sc = scOf(g), C = sc.campaign, A = actorDef(g, aid), st = g.actors[aid], K = C.keys, out = [];
  if (fav === "dinheiro"){ const amt = Math.round((C.loan || 15) * Math.min(1.2, A.gives.dinheiro || 0.5)); const due = g.month + 6; g.money += amt; g.debts.push({ aid, amount: Math.round(amt * 1.3), due }); out.push("empréstimo recebido (dívida em 6 meses)"); }
  else if (fav === "armas"){ const got = addPlayerStrength(g, 2 * STR_UNIT); g.armsAid = { v: Math.min(0.28, armsAid(g) + 0.12), until: g.month + 6 }; applyStats(g, { [K.mil]: 4 }); st.dependence += 10; out.push(got ? "armas e reforço de força recebidos (bônus de combate por 6 meses)" : "armas recebidas (bônus de combate por 6 meses)"); }
  else if (fav === "reconhecimento"){ st.recognized = true; applyStats(g, { [K.legit]: A.id === "israel" ? 10 : 8 }); const rel = A.rel || {}; for (const o in rel) if (rel[o] >= 0.5) bumpActor(g, o, 4); out.push("reconhecimento obtido"); }
  else if (fav === "sancoes"){ g.enemyMalus = 1; g.malusUntil = g.month + 4; out.push("sanções ao inimigo por 4 meses"); }
  else if (fav === "mediacao"){ if (isWar(g)) g.ceasefire = 2; applyFx(g, { unrestAll: -8, s: { [K.legit]: 3 } }); if (g.south) g.south.t = Math.max(0, g.south.t - 8); out.push(isWar(g) ? "trégua mediada 2 meses" : "mediação (−agitação, −tensão no Sul)"); }
  else if (fav === "lobby"){ applyStats(g, { [K.legit]: 3, [K.pop]: 2 }); bumpFac(g, "evangelicos", 3); out.push("lobby político (+relações, +apoio)"); }
  else if (fav === "tech"){ applyStats(g, { [K.mil]: 2 }); out.push("cooperação tecnológica (+militar)"); }
  else out.push("favor obtido");
  const rel = A.rel || {}; for (const x in rel) if (rel[x] <= -0.3) bumpActor(g, x, -5 * Math.abs(rel[x]));
  return out.join("; ") + ".";
}

/* Compat: stubs do sistema antigo (focos ainda citam) */
function allowedReqs(g, aid){ return favorPool(g, actorDef(g, aid)).filter(f => ["dinheiro","armas","reconhecimento","sancoes","mediacao"].includes(f)); }
function allowedOffs(){ return []; }
function dealScore(){ return { score: 0, parts: [] }; }
function dealCheck(){ return "Use Atender pedido ou Pedir favor"; }
function proposeDeal(){ return { result: "error", msg: "A negociação livre foi substituída na v1.20. Use Atender pedido ou Pedir favor." }; }
function acceptCounter(){ return { ok: false, msg: "Sem contraproposta" }; }

/* ---------- Isolamento total ---------- */
function isolationStatus(g){
  const C = scOf(g).campaign, D = C.diplo || {}, need = D.isoMonths || 4;
  const majors = majorActors(g);
  if (!majors.length || !phaseOf(g).war && phaseOf(g).id === "governo" && g.month - g.startMonth < 2) return { iso: false, months: 0, need, warn: false };
  const rec = majors.filter(a => g.actors[a.id].recognized).length;
  const host = majors.filter(a => (g.actors[a.id].opinion || 0) <= (D.isoHostile || -40) || g.actors[a.id].sanctioning).length;
  const sanc = majors.filter(a => g.actors[a.id].sanctioning).length;
  const intl = g.stats[(scOf(g).campaign.keys || {}).legit || "internacional"] ?? 50;
  // Isolado: quase sem reconhecimento entre potências, relações baixas, e (sanções ou várias potências hostis)
  const isolated = rec <= (D.isoMaxRec != null ? D.isoMaxRec : 0) && intl <= (D.isoIntl || 35) && (sanc >= (D.isoMinSanc || 1) || host >= Math.max(2, Math.ceil(majors.length * 0.5)));
  return { iso: isolated, months: g.isoMonths || 0, need, warn: (g.isoMonths || 0) >= Math.max(1, need - 2) && (g.isoMonths || 0) < need, rec, host, sanc, majors: majors.length };
}
function isolationTick(g, R){
  const st = isolationStatus(g);
  if (st.iso) g.isoMonths = (g.isoMonths || 0) + 1;
  else g.isoMonths = 0;
  const now = isolationStatus(g);
  if (now.warn && R) R(now.months === 1 ? "Isolamento: 1 mês sob pressão diplomática. Busque reconhecimento ou acalme potências." : now.months === 2 ? "Isolamento: 2 meses sob pressão diplomática. Busque reconhecimento ou acalme potências." : "Isolamento: pressão diplomática prolongada. Busque reconhecimento ou acalme potências.", "bad");
  if (now.months >= now.need){
    g.report = g.report || [];
    endCampaign(g, "fim_isolamento", "Isolamento total: quase sem reconhecimento e sob sanções/hostilidade prolongada.", "isolamento");
    return true;
  }
  return false;
}
function warEnemySupportMalus(g){
  const n = enemySupportCount(g);
  return n >= 2 ? Math.min(0.12, 0.04 * (n - 1)) : 0;
}
