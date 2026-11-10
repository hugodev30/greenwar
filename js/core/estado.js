// js/core/estado.js — Núcleo: fases da campanha, lados, condições (cond) e criação de uma partida nova (newCampaign).
/* ---------- Fases, lados e condições ---------- */
function phaseOf(g){ const C = scOf(g).campaign; return C.phases.find(p => !p.if || cond(g, p.if)) || C.phases[C.phases.length-1]; }
function isWar(g){ return !!phaseOf(g).war; }
function sideOf(g, fac, ph){
  ph = ph || phaseOf(g); const C = scOf(g).campaign;
  if ((ph.player||[]).includes(fac)) return "player";
  if ((ph.enemy||[]).includes(fac)) return "enemy";
  if (fac === C.contested) return "contested";
  return "neutral";
}
function sideCounts(g){
  const ph = phaseOf(g), r = { player:0, enemy:0, contested:0, neutral:0, wPlayer:0, wEnemy:0, wContested:0 };
  for (const uf in g.control){ const s = sideOf(g, g.control[uf], ph); r[s]++; if (s==="player") r.wPlayer += UF_WEIGHT[uf]; if (s==="enemy") r.wEnemy += UF_WEIGHT[uf]; if (s==="contested") r.wContested += UF_WEIGHT[uf]; }
  return r;
}
function cond(g, c, slack){ // slack: folga da dificuldade nos mínimos (só nos testes de rumo da história)
  if (!c) return true;
  const S = g.stats;
  if (c.min) for (const k in c.min) if ((S[k] ?? 0) + (slack || 0) < c.min[k]) return false;
  if (c.max) for (const k in c.max) if ((S[k] ?? 0) > c.max[k]) return false;
  if (c.flags) for (const f of c.flags) if (!g.flags.includes(f)) return false;
  if (c.noFlags) for (const f of c.noFlags) if (g.flags.includes(f)) return false;
  if (c.visited) for (const n of c.visited) if (!g.visited.includes(n)) return false;
  if (c.visitedAny && !c.visitedAny.some(n => g.visited.includes(n))) return false;
  if (c.notVisited) for (const n of c.notVisited) if (g.visited.includes(n)) return false;
  if (c.from && g.month < parseYM(c.from)) return false;
  if (c.until && g.month > parseYM(c.until)) return false;
  if (c.half != null && (g.half|0) !== c.half) return false; // abertura: 0 = 1ª quinzena, 1 = 2ª
  if (c.money){ if (c.money.min !== undefined && g.money < c.money.min) return false; if (c.money.max !== undefined && g.money > c.money.max) return false; }
  if (c.fac) for (const id in c.fac){ const f = g.fac[id]; if (!f) return false; if (c.fac[id].min !== undefined && f.loyalty < c.fac[id].min) return false; if (c.fac[id].max !== undefined && f.loyalty > c.fac[id].max) return false; }
  if (c.actor) for (const id in c.actor){ const a = g.actors[id]; if (!a) return false; if (c.actor[id].min !== undefined && a.opinion < c.actor[id].min) return false; if (c.actor[id].max !== undefined && a.opinion > c.actor[id].max) return false; }
  if (c.diff && !c.diff.includes(g.diff || "normal")) return false; // só nestas dificuldades
  if (c.warMonths && !((g.war && g.war.months || 0) >= c.warMonths.min)) return false; // frentes: meses de guerra (cansaço)
  if (c.recentLoss && !(g.war && g.war.lostAt != null && g.month - g.war.lostAt <= c.recentLoss)) return false; // frentes: perdeu um estado nos últimos N meses
  if (c.control) for (const uf in c.control) if (g.control[uf] !== c.control[uf]) return false;
  if (c.anyControl && !Object.values(g.control).some(f => c.anyControl.includes(f))) return false;
  if (c.south){ const st = g.south; if (!st || !scOf(g).campaign.south) return false;
    if (c.south.min !== undefined && st.t < c.south.min) return false; if (c.south.max !== undefined && st.t > c.south.max) return false;
    if (c.south.state && !c.south.state.includes(st.state)) return false; }
  if (c.urna){ const U = g.urna, u = c.urna; if (!U) return false; // contestação das urnas (js/core/urnas.js)
    if (u.on && !urnaOn(g)) return false;
    if (u.min !== undefined && U.prog + (slack || 0) < u.min) return false; if (u.max !== undefined && U.prog > u.max) return false;
    if (u.credMin !== undefined && U.cred < u.credMin) return false; if (u.credMax !== undefined && U.cred > u.credMax) return false;
    if (u.escMin !== undefined && U.esc < u.escMin) return false; if (u.escMax !== undefined && U.esc > u.escMax) return false; }
  if (c.recognized && Object.values(g.actors).filter(a => a.recognized).length < c.recognized.min) return false;
  if (c.phase || c.notPhase || c.war !== undefined || c.sideCount){
    const ph = phaseOf(g);
    if (c.phase && !(Array.isArray(c.phase) ? c.phase : [c.phase]).includes(ph.id)) return false;
    if (c.notPhase && (Array.isArray(c.notPhase) ? c.notPhase : [c.notPhase]).includes(ph.id)) return false;
    if (c.war !== undefined && !!ph.war !== c.war) return false;
    if (c.sideCount){ const sc = sideCounts(g); for (const s in c.sideCount){ if (c.sideCount[s].min !== undefined && sc[s] < c.sideCount[s].min) return false; if (c.sideCount[s].max !== undefined && sc[s] > c.sideCount[s].max) return false; } }
  }
  return true;
}
function resolveNextG(next, g){
  if (next == null) return null;
  if (typeof next === "string") return next;
  const sl = diffSlack(g);
  for (const b of next) if (cond(g, b.if, sl)) return b.to;
  return next[next.length-1].to;
}

/* ---------- Criação da partida ---------- */
// opts: { diff: "facil" | "normal" | "dificil" }. Sem opts = Normal (o jogo original). Só existe a campanha completa.
function newCampaign(sc, seed, opts){
  opts = opts || {};
  const diff = DIFICULDADES[opts.diff] ? opts.diff : "normal", D = DIFICULDADES[diff];
  const S = sc.story, C = scVariant(sc, diff).campaign;
  const g = { v: SAVE_VERSION, scen: sc.id, diff, simple: !!D.simples, seed: (seed >>> 0) || ((Date.now() ^ 0x5bd1e995) >>> 0),
    month: parseYM(C.start), startMonth: parseYM(C.start), turn: 1,
    stats: {}, flags: [], visited: [], history: [], lastDelta: {}, control: {}, lastMapChanges: [],
    money: C.money.initial, ap: C.ap, pd: 0, isoMonths: 0,
    uf: {}, actors: {}, fac: {}, debts: [], drains: [], queue: [], report: [], log: [], used: {}, dealtWith: {},
    eventSeen: {}, chains: [], ended: null, enemyMalus: 0, malusUntil: 0, ceasefire: 0, enemyBoost: 0, counter: null,
    story: { node: null, due: 0 }, stat: { deals: 0, actions: 0, battles: 0 }, south: null, urna: null, half: 0, halfDone: true, unpaid: 0, autoOrders: D.ordensAuto || "off" };
  for (const k in S.stats) g.stats[k] = clamp(S.stats[k].initial + ((D.status || {})[k] || 0), 0, 100);
  for (const uf in MAP_DATA.states) g.control[uf] = S.defaultFaction || "federal";
  Object.assign(g.control, S.initialMap || {});
  for (const uf in MAP_DATA.states) g.uf[uf] = { unrest: (C.unrest && C.unrest[uf] !== undefined) ? C.unrest[uf] : (C.unrestBase ?? 25), enemy: 0, progress: 0, sway: 0 };
  for (const a of C.actors) g.actors[a.id] = { opinion: a.opinion, recognized: !!a.recognizes, dependence: 0, deals: 0, aligned: false, sanctioning: false, supportsEnemy: false, demand: null, demandAge: 0, favorUsed: {} };
  grantPD(g, Math.max(2, pdIncome(g, false)), null); // PD inicial (pelo menos a renda mensal base)
  refreshAllDemands(g);
  for (const f of C.factions) g.fac[f.id] = { loyalty: f.loyalty, influence: f.influence, lastCrisis: -99 };
  g.urna = urnaNew(g);
  if (C.quinzenas){ g.half = 1; g.halfDone = false; } // a campanha começa na 2ª quinzena de outubro (noite de 30/10)
  syncActorStats(g);
  prepContested(g);
  initArmies(g);
  focusInit(g);
  enterStory(g, S.start, []);
  if (g.focus) g.focus.known = focusTree(g).nodes.filter(F => !F.oport && focusStatus(g, F).state === "available").map(F => F.id);
  { const A = apFor(g); g.ap = A.total; g.apParts = A.parts; }
  return g;
}
function prepContested(g){
  const C = scOf(g).campaign, ph = phaseOf(g);
  for (const uf in g.control){
    const s = sideOf(g, g.control[uf], ph), u = g.uf[uf];
    if ((s === "contested" || s === "enemy") && u.enemy <= 0) u.enemy = (C.enemyBase || 2) + (s === "enemy" ? 1 : 0);
  }
}
