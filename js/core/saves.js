// js/core/saves.js — Núcleo: migração de saves antigos (v2 → v16). Ao mudar o formato do save, suba SAVE_VERSION (core/base.js) e migre aqui.
function migrateSave(g){
  if (!g || g.v === SAVE_VERSION) return g;
  if (!(g.v >= 2 && g.v < SAVE_VERSION) || !scOf(g)) return null;
  if (g.v === 2) migrateV2(g);
  if (g.v === 3){ g.battleLog = (g.mil && g.mil.battles ? g.mil.battles.slice(-30) : []); g.mobPool = g.mobPool || 0; g.v = 4; }
  if (g.v === 4){ g.chains = Array.isArray(g.chains) ? g.chains : []; g.v = 5; }
  if (g.v === 5){ migrateSouth(g); g.autoOrders = "off"; g.v = 6; }
  if (g.v === 6){ g.diff = "normal"; g.quick = false; g.simple = false; g.v = 7; } // saves antigos seguem no Normal, campanha completa
  if (g.v === 7){ migrateFronts(g); g.v = 8; } // 2022: exércitos → tropas das frentes (js/core/frentes.js)
  if (g.v === 8){ if (g.focus) focusInit(g); if (g.war) g.war.months = g.war.months || 0; g.v = 9; } // oportunidades e cansaço da guerra (campos novos começam vazios)
  if (g.v >= 9 && g.v <= 12){ migrateV13(g); g.v = 13; } // 2022: volta aos exércitos nos estados, sem regiões nem "em disputa" (js/core/frentes.js)
  if (g.v === 13){ g.urna = urnaNew(g); g.half = 0; g.halfDone = true; g.notice = null; g.v = 14; } // 2022: contestação das urnas (g.urna) e abertura em quinzenas (partidas antigas seguem mês a mês)
  if (g.v === 14){ delete g.quick; migrateV15(g); g.v = 15; } // fase 16: só a campanha completa; exércitos com tipo, experiência e sem fusão automática
  if (g.v === 15){ migrateV16(g); g.v = 16; } // v1.20: PD, novos atores, demandas; drop deals antigos
  return g.v === SAVE_VERSION ? g : null;
}
// v14 → v15: a partida rápida acabou (vira campanha completa; os finais por prazo já não existem). Exércitos ganham kind ("ex") e xp
// (veteranos de partidas antigas começam com um pouco, pela moral); o soldo atrasado (g.unpaid) começa em 0.
function migrateV16(g){
  const C = scOf(g).campaign;
  if (g.pd == null) g.pd = Math.min((C.diplo && C.diplo.cap) || 8, 2);
  if (g.isoMonths == null) g.isoMonths = 0;
  delete g.counter; // contrapropostas do deal builder antigo
  // remove ator legado "vizinhos" e cria os novos com defaults
  if (g.actors && g.actors.vizinhos){
    const old = g.actors.vizinhos;
    delete g.actors.vizinhos;
    if (!g.actors.venezuela) g.actors.venezuela = { opinion: old.opinion, recognized: !!old.recognized, dependence: old.dependence || 0, deals: old.deals || 0, aligned: !!old.aligned, sanctioning: !!old.sanctioning, supportsEnemy: !!old.supportsEnemy, demand: null, demandAge: 0, favorUsed: {} };
    if (!g.actors.mercosul) g.actors.mercosul = { opinion: Math.round((old.opinion || 0) / 2), recognized: false, dependence: 0, deals: 0, aligned: false, sanctioning: false, supportsEnemy: false, demand: null, demandAge: 0, favorUsed: {} };
  }
  for (const a of (C.actors || [])){
    if (!g.actors[a.id]) g.actors[a.id] = { opinion: a.opinion, recognized: false, dependence: 0, deals: 0, aligned: false, sanctioning: false, supportsEnemy: false, demand: null, demandAge: 0, favorUsed: {} };
    else {
      const st = g.actors[a.id];
      if (st.demand === undefined) st.demand = null;
      if (st.demandAge == null) st.demandAge = 0;
      if (!st.favorUsed) st.favorUsed = {};
    }
  }
  // limpa dívidas/drains apontando a atores removidos
  g.debts = (g.debts || []).filter(d => g.actors[d.aid]);
  g.drains = (g.drains || []).filter(d => !d.aid || g.actors[d.aid]);
  try { refreshAllDemands(g); } catch (e){}
}
function migrateV15(g){
  g.unpaid = 0;
  const W = g.war; if (!W || !Array.isArray(W.armies)) return;
  for (const a of W.armies){ if (!a.kind) a.kind = "ex"; if (a.xp == null) a.xp = a.side === "player" && W.months ? Math.min(30, (W.months || 0) * 3) : 0; }
}
// v5 → v6: cria a Tensão no Sul em partidas já no regime. Se a Liga já controla estados, ela está em revolta.
function migrateSouth(g){
  const SC = scOf(g).campaign.south; g.south = null;
  if (!SC || !g.visited.includes(SC.startNode) || g.ended) return;
  southInit(g);
  if (Object.values(g.control).some(f => f === SC.fac)){ Object.assign(g.south, { t: 100, state: "revolta", stage: 2, since: g.month, warned: true }); if (!g.flags.includes("sul_revolta")) g.flags.push("sul_revolta"); }
  else if (g.visited.includes("racha_militar")) g.south.t = Math.min(SC.joltCap, g.south.t + 20);
}
function migrateV2(g){
  const units = Object.entries(g.uf).map(([uf, u]) => [uf, u.force || 0]);
  const reserve = g.reserve || 0;
  initArmies(g); g.armies = []; g.armyN = {};
  for (const [uf, f] of units) if (f > 0 && armyAllowed(g, "player", uf)) newArmy(g, "player", uf, Math.min(ARMY_MAX, f * STR_UNIT));
  for (const uf in g.uf) delete g.uf[uf].force;
  delete g.reserve;
  if (reserve > 0) addPlayerStrength(g, reserve * STR_UNIT);
  if (phaseOf(g).war) spawnWarArmies(g);
  normalizeArmies(g); planEnemy(g);
  g.v = 3; g.milMigrated = true;
}
